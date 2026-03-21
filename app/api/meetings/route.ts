// @ts-nocheck
import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "lib/admin-access";
import { consumeRateLimit, getRequestClientKey } from "lib/auth-rate-limit";
import { logAuthRouteError, logRateLimitEvent } from "lib/auth-logging";
import { jsonWithApiObservation, startApiObservation } from "lib/api-observability";
import {
  createOperationalMeeting,
  listPersistedMeetingsForUser,
} from "lib/operational-data";
import { writeAuditLog, writeSystemEvent } from "lib/audit-log-store";

export async function GET(request) {
  const observation = startApiObservation(request, "api/meetings");
  const auth = await requireAuthenticatedUser({
    route: "api/meetings",
    action: "list-operational-meetings",
    minimumRole: "Vendedor",
  });
  if (!auth.ok) {
    return jsonWithApiObservation(observation, { ok: false, error: auth.error, meetings: [] }, { status: auth.status });
  }

  const clientKey = getRequestClientKey(request);
  const rateLimit = await consumeRateLimit({
    scope: "operational-meetings",
    bucket: `${clientKey}:${auth.user.email}`,
    limit: 40,
    windowMs: 60 * 1000,
  });

  if (!rateLimit.ok) {
    logRateLimitEvent("api/meetings", "operational-meetings", {
      actorEmail: auth.user.email,
      clientKey,
      retryAfter: rateLimit.retryAfter,
    });
    return jsonWithApiObservation(
      observation,
      { ok: false, error: "Muitas consultas de reunioes. Aguarde alguns instantes.", meetings: [] },
      { status: 429 },
      { actorEmail: auth.user.email, actorUserId: auth.user.id, actorRole: auth.user.role, clientKey },
    );
  }

  try {
    const meetings = await listPersistedMeetingsForUser(auth.user);
    return jsonWithApiObservation(
      observation,
      { ok: true, meetings },
      undefined,
      { actorEmail: auth.user.email, actorUserId: auth.user.id, actorRole: auth.user.role, clientKey },
    );
  } catch (error) {
    logAuthRouteError("api/meetings", "list-operational-meetings", error, {
      actorEmail: auth.user.email,
      clientKey,
    });
    return jsonWithApiObservation(
      observation,
      { ok: false, error: "Não foi possível carregar as reuniões operacionais.", meetings: [] },
      { status: 503 },
      { actorEmail: auth.user.email, actorUserId: auth.user.id, actorRole: auth.user.role, clientKey },
    );
  }
}

export async function POST(request) {
  const observation = startApiObservation(request, "api/meetings");
  const auth = await requireAuthenticatedUser({
    route: "api/meetings",
    action: "create-operational-meeting",
    minimumRole: "Vendedor",
  });
  if (!auth.ok) {
    return jsonWithApiObservation(observation, { ok: false, error: auth.error }, { status: auth.status });
  }

  const clientKey = getRequestClientKey(request);
  const rateLimit = await consumeRateLimit({
    scope: "create-operational-meeting",
    bucket: `${clientKey}:${auth.user.email}`,
    limit: 12,
    windowMs: 60 * 1000,
  });

  if (!rateLimit.ok) {
    logRateLimitEvent("api/meetings", "create-operational-meeting", {
      actorEmail: auth.user.email,
      clientKey,
      retryAfter: rateLimit.retryAfter,
    });
    return jsonWithApiObservation(
      observation,
      { ok: false, error: "Muitas reunioes criadas em pouco tempo. Aguarde alguns instantes." },
      { status: 429 },
      { actorEmail: auth.user.email, actorUserId: auth.user.id, actorRole: auth.user.role, clientKey },
    );
  }

  try {
    const payload = await request.json().catch(() => null);
    const meeting = await createOperationalMeeting({
      actorUser: auth.user,
      title: payload?.title,
      summary: payload?.summary,
      meetingAt: payload?.meetingAt,
      type: payload?.type,
      ownerName: payload?.ownerName,
      ownerEmail: payload?.ownerEmail,
      hubspotOwnerId: payload?.hubspotOwnerId,
    });

    await Promise.allSettled([
      writeAuditLog({
        actorUserId: auth.user.id,
        actorEmail: auth.user.email,
        actorRole: auth.user.role,
        action: "meeting.created",
        entityType: "meeting",
        entityId: meeting.id,
        route: "api/meetings",
        details: {
          ownerEmail: meeting.ownerEmail,
          type: meeting.type,
        },
      }),
      writeSystemEvent({
        event: "meeting.created",
        level: "info",
        route: "api/meetings",
        actorUserId: auth.user.id,
        actorEmail: auth.user.email,
        actorRole: auth.user.role,
        clientKey,
        message: `Reuniao ${meeting.title} registrada para ${meeting.owner || meeting.ownerEmail}.`,
        meta: {
          meetingId: meeting.id,
          ownerEmail: meeting.ownerEmail,
        },
      }),
    ]);

    return jsonWithApiObservation(
      observation,
      {
        ok: true,
        message: "Reuniao registrada com sucesso.",
        meeting,
      },
      undefined,
      { actorEmail: auth.user.email, actorUserId: auth.user.id, actorRole: auth.user.role, clientKey },
    );
  } catch (error) {
    if (error instanceof Error && error.message === "MEETING_FIELDS_REQUIRED") {
      return jsonWithApiObservation(
        observation,
        { ok: false, error: "Preencha titulo, data e horario para registrar a reuniao." },
        { status: 400 },
        { actorEmail: auth.user.email, actorUserId: auth.user.id, actorRole: auth.user.role, clientKey },
      );
    }

    logAuthRouteError("api/meetings", "create-operational-meeting", error, {
      actorEmail: auth.user.email,
      clientKey,
    });
    return jsonWithApiObservation(
      observation,
      { ok: false, error: "Não foi possível salvar a reunião agora." },
      { status: 503 },
      { actorEmail: auth.user.email, actorUserId: auth.user.id, actorRole: auth.user.role, clientKey },
    );
  }
}
