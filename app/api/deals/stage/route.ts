// @ts-nocheck
import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "lib/admin-access";
import { consumeRateLimit, getRequestClientKey } from "lib/auth-rate-limit";
import { logAuthRouteError, logRateLimitEvent } from "lib/auth-logging";
import { jsonWithApiObservation, startApiObservation } from "lib/api-observability";
import { finalizeIdempotencyKey, reserveIdempotencyKey } from "lib/idempotency-store";
import { updateHubSpotDealStage } from "lib/hubspot/deals";
import { writeAuditLog, writeSystemEvent } from "lib/audit-log-store";

export async function POST(request) {
  const observation = startApiObservation(request, "api/deals/stage");
  let idempotencyKey = "";
  const auth = await requireAuthenticatedUser({
    route: "api/deals/stage",
    action: "update-deal-stage",
    minimumRole: "Vendedor",
  });
  if (!auth.ok) {
    return jsonWithApiObservation(observation, { ok: false, error: auth.error }, { status: auth.status });
  }

  const clientKey = getRequestClientKey(request);
  const rateLimit = await consumeRateLimit({
    scope: "deal-stage-update",
    bucket: `${clientKey}:${auth.user.email}`,
    limit: 20,
    windowMs: 60 * 1000,
  });

  if (!rateLimit.ok) {
    logRateLimitEvent("api/deals/stage", "deal-stage-update", {
      actorEmail: auth.user.email,
      clientKey,
      retryAfter: rateLimit.retryAfter,
    });
    return jsonWithApiObservation(
      observation,
      { ok: false, error: "Muitas mudancas de etapa em pouco tempo. Aguarde alguns instantes." },
      { status: 429 },
      { actorEmail: auth.user.email, actorUserId: auth.user.id, actorRole: auth.user.role, clientKey },
    );
  }

  try {
    const payload = await request.json().catch(() => null);
    const dealId = String(payload?.dealId || "").trim();
    const stageId = String(payload?.stageId || "").trim();
    const stageLabel = String(payload?.stageLabel || "").trim();
    const rawIdempotencyKey = request.headers.get("x-idempotency-key") || String(payload?.requestId || "").trim();

    if (!dealId || !stageId) {
      return jsonWithApiObservation(
        observation,
        { ok: false, error: "Informe o negocio e a etapa de destino." },
        { status: 400 },
        { actorEmail: auth.user.email, actorUserId: auth.user.id, actorRole: auth.user.role, clientKey },
      );
    }

    idempotencyKey = rawIdempotencyKey || `deal-stage:${auth.user.id}:${dealId}:${stageId}`;
    const reservedKey = await reserveIdempotencyKey({
      scope: "hubspot.deal-stage-update",
      key: idempotencyKey,
      route: "api/deals/stage",
      actorUserId: auth.user.id,
      actorEmail: auth.user.email,
      requestId: observation.requestId,
      ttlSeconds: 10 * 60,
      meta: {
        dealId,
        stageId,
        stageLabel,
      },
    });

    if (!reservedKey.ok && reservedKey.record?.responseBody) {
      return jsonWithApiObservation(
        observation,
        {
          ...reservedKey.record.responseBody,
          deduplicated: true,
        },
        { status: reservedKey.record.responseStatus || 200 },
        { actorEmail: auth.user.email, actorUserId: auth.user.id, actorRole: auth.user.role, clientKey, requestId: observation.requestId },
      );
    }

    if (!reservedKey.ok) {
      return jsonWithApiObservation(
        observation,
        { ok: false, error: "Ja existe uma atualizacao identica em processamento. Aguarde alguns instantes." },
        { status: 409 },
        { actorEmail: auth.user.email, actorUserId: auth.user.id, actorRole: auth.user.role, clientKey, requestId: observation.requestId },
      );
    }

    await updateHubSpotDealStage({ dealId, stageId });

    const successResponse = {
      ok: true,
      message: `Etapa atualizada para ${stageLabel || stageId}.`,
      deal: {
        id: dealId,
        stageId,
        stageLabel,
      },
    };

    await Promise.allSettled([
      writeAuditLog({
        actorUserId: auth.user.id,
        actorEmail: auth.user.email,
        actorRole: auth.user.role,
        action: "deal.stage.updated",
        entityType: "deal",
        entityId: dealId,
        route: "api/deals/stage",
        details: {
          stageId,
          stageLabel,
          idempotencyKey,
        },
      }),
      writeSystemEvent({
        event: "deal.stage.updated",
        level: "info",
        route: "api/deals/stage",
        actorUserId: auth.user.id,
        actorEmail: auth.user.email,
        actorRole: auth.user.role,
        clientKey,
        message: `Negocio ${dealId} movido para ${stageLabel || stageId}.`,
        meta: {
          dealId,
          stageId,
          stageLabel,
          idempotencyKey,
        },
      }),
      finalizeIdempotencyKey({
        scope: "hubspot.deal-stage-update",
        key: idempotencyKey,
        status: "completed",
        responseStatus: 200,
        responseBody: successResponse,
        ttlSeconds: 10 * 60,
        meta: {
          dealId,
          stageId,
          stageLabel,
          requestId: observation.requestId,
        },
      }),
    ]);

    return jsonWithApiObservation(
      observation,
      successResponse,
      undefined,
      { actorEmail: auth.user.email, actorUserId: auth.user.id, actorRole: auth.user.role, clientKey, requestId: observation.requestId },
    );
  } catch (error) {
    const failedPayload = {
      ok: false,
      error: "Não foi possível atualizar a etapa do negócio agora.",
    };
    logAuthRouteError("api/deals/stage", "update-deal-stage", error, {
      actorEmail: auth.user.email,
      clientKey,
    });

    if (idempotencyKey) {
      await finalizeIdempotencyKey({
        scope: "hubspot.deal-stage-update",
        key: idempotencyKey,
        status: "failed",
        responseStatus: 503,
        responseBody: failedPayload,
        ttlSeconds: 60,
        meta: {
          requestId: observation.requestId,
          error: error instanceof Error ? error.message : "UNKNOWN_ERROR",
        },
      }).catch(() => null);
    }

    return jsonWithApiObservation(
      observation,
      failedPayload,
      { status: 503 },
      { actorEmail: auth.user.email, actorUserId: auth.user.id, actorRole: auth.user.role, clientKey, requestId: observation.requestId },
    );
  }
}
