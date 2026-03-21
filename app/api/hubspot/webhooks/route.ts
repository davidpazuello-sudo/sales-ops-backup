// @ts-nocheck
import { jsonWithApiObservation, startApiObservation } from "lib/api-observability";
import { logSecurityEvent } from "lib/auth-logging";
import { writeSystemEvent } from "lib/audit-log-store";
import { finalizeIdempotencyKey, reserveIdempotencyKey } from "lib/idempotency-store";
import { getAppEnvironment, getHubSpotClientSecret, getHubSpotClientSecretSource } from "lib/hubspot-runtime";
import { getHubSpotWebhookEventKey, parseHubSpotWebhookEvents, validateHubSpotWebhookSignature } from "lib/hubspot-webhooks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function summarizeWebhookEvent(event = {}) {
  return {
    eventId: String(event.eventId || event.id || "").trim(),
    subscriptionType: String(event.subscriptionType || event.eventType || "").trim(),
    objectId: String(event.objectId || "").trim(),
    objectType: String(event.objectType || "").trim(),
    propertyName: String(event.propertyName || "").trim(),
    occurredAt: String(event.occurredAt || "").trim(),
    attemptNumber: Number(event.attemptNumber || 0) || 0,
    portalId: String(event.portalId || "").trim(),
  };
}

export async function POST(request) {
  const observation = startApiObservation(request, "api/hubspot/webhooks");
  const clientSecret = getHubSpotClientSecret();
  const signature = request.headers.get("x-hubspot-signature-v3") || "";
  const timestamp = request.headers.get("x-hubspot-request-timestamp") || "";
  const rawBody = await request.text().catch(() => "");

  if (!clientSecret) {
    logSecurityEvent("error", "hubspot.webhook.secret_missing", {
      route: "api/hubspot/webhooks",
      requestId: observation.requestId,
      environment: getAppEnvironment(),
      clientSecretSource: getHubSpotClientSecretSource(),
    });

    return jsonWithApiObservation(
      observation,
      { ok: false, error: "HubSpot webhook secret nao configurado." },
      { status: 503 },
      { requestId: observation.requestId },
    );
  }

  const validation = validateHubSpotWebhookSignature({
    clientSecret,
    method: request.method,
    url: request.url,
    body: rawBody,
    signature,
    timestamp,
  });

  if (!validation.ok) {
    await writeSystemEvent({
      event: "hubspot.webhook.signature_invalid",
      level: "warn",
      route: "api/hubspot/webhooks",
      requestId: observation.requestId,
      clientKey: "hubspot",
      message: `HubSpot webhook rejeitado: ${validation.reason}.`,
      meta: {
        reason: validation.reason,
        environment: getAppEnvironment(),
        clientSecretSource: getHubSpotClientSecretSource(),
      },
    }).catch(() => null);

    logSecurityEvent("warn", "hubspot.webhook.signature_invalid", {
      route: "api/hubspot/webhooks",
      requestId: observation.requestId,
      reason: validation.reason,
      environment: getAppEnvironment(),
      clientSecretSource: getHubSpotClientSecretSource(),
    });

    return jsonWithApiObservation(
      observation,
      { ok: false, error: "Assinatura do webhook da HubSpot invalida." },
      { status: 401 },
      { requestId: observation.requestId },
    );
  }

  let events = [];

  try {
    events = parseHubSpotWebhookEvents(rawBody);
  } catch (error) {
    logSecurityEvent("warn", "hubspot.webhook.payload_invalid", {
      route: "api/hubspot/webhooks",
      requestId: observation.requestId,
      error,
    });

    return jsonWithApiObservation(
      observation,
      { ok: false, error: "Payload de webhook da HubSpot invalido." },
      { status: 400 },
      { requestId: observation.requestId },
    );
  }

  let accepted = 0;
  let duplicates = 0;
  const eventLogs = [];

  for (const [index, event] of events.entries()) {
    const eventKey = getHubSpotWebhookEventKey(event, index);
    const reserved = await reserveIdempotencyKey({
      scope: "hubspot.webhook-event",
      key: eventKey,
      route: "api/hubspot/webhooks",
      requestId: observation.requestId,
      actorEmail: "hubspot-webhook",
      ttlSeconds: 24 * 60 * 60,
      meta: summarizeWebhookEvent(event),
    });

    if (!reserved.ok) {
      duplicates += 1;
      eventLogs.push(
        writeSystemEvent({
          event: "hubspot.webhook.duplicate",
          level: "info",
          route: "api/hubspot/webhooks",
          requestId: observation.requestId,
          clientKey: "hubspot",
          message: `Evento duplicado ignorado: ${eventKey}.`,
          meta: {
            eventKey,
            ...summarizeWebhookEvent(event),
          },
        }),
      );
      continue;
    }

    accepted += 1;
    const summary = summarizeWebhookEvent(event);

    eventLogs.push(
      writeSystemEvent({
        event: "hubspot.webhook.accepted",
        level: "info",
        route: "api/hubspot/webhooks",
        requestId: observation.requestId,
        clientKey: "hubspot",
        message: `Evento HubSpot aceito: ${summary.subscriptionType || "unknown"}.`,
        meta: {
          eventKey,
          ...summary,
        },
      }),
    );
    eventLogs.push(
      finalizeIdempotencyKey({
        scope: "hubspot.webhook-event",
        key: eventKey,
        status: "completed",
        responseStatus: 200,
        responseBody: {
          ok: true,
          processed: true,
        },
        ttlSeconds: 24 * 60 * 60,
        meta: {
          requestId: observation.requestId,
          ...summary,
        },
      }),
    );
  }

  await Promise.allSettled(eventLogs);

  logSecurityEvent("info", "hubspot.webhook.received", {
    route: "api/hubspot/webhooks",
    requestId: observation.requestId,
    accepted,
    duplicates,
    received: events.length,
    environment: getAppEnvironment(),
  });

  return jsonWithApiObservation(
    observation,
    {
      ok: true,
      accepted,
      duplicates,
      received: events.length,
    },
    { status: 200 },
    { requestId: observation.requestId },
  );
}
