// @ts-nocheck
import { NextResponse } from "next/server";
import { requireSuperAdmin } from "lib/admin-access";
import { listNotificationsForUser } from "lib/access-requests-store";
import { consumeRateLimit, getRequestClientKey } from "lib/auth-rate-limit";
import { logAuthRouteError, logRateLimitEvent } from "lib/auth-logging";
import { jsonWithApiObservation, startApiObservation } from "lib/api-observability";

export async function GET(request) {
  const observation = startApiObservation(request, "api/notifications");
  const auth = await requireSuperAdmin({
    route: "api/notifications",
    action: "list-admin-notifications",
  });
  if (!auth.ok) {
    return jsonWithApiObservation(observation, { ok: false, error: auth.error, notifications: [] }, { status: auth.status });
  }

  const clientKey = getRequestClientKey(request);
  const rateLimit = await consumeRateLimit({
    scope: "admin-notifications",
    bucket: `${clientKey}:${auth.user.email}`,
    limit: 40,
    windowMs: 60 * 1000,
  });

  if (!rateLimit.ok) {
    logRateLimitEvent("api/notifications", "admin-notifications", {
      actorEmail: auth.user.email,
      clientKey,
      retryAfter: rateLimit.retryAfter,
    });
    return jsonWithApiObservation(
      observation,
      { ok: false, error: "Muitas consultas de notificacoes. Aguarde alguns instantes.", notifications: [] },
      { status: 429 },
      { actorEmail: auth.user.email, actorUserId: auth.user.id, actorRole: auth.user.role, clientKey },
    );
  }

  try {
    const notifications = await listNotificationsForUser(auth.user.email);
    return jsonWithApiObservation(
      observation,
      { ok: true, notifications },
      undefined,
      { actorEmail: auth.user.email, actorUserId: auth.user.id, actorRole: auth.user.role, clientKey },
    );
  } catch (error) {
    logAuthRouteError("api/notifications", "list-admin-notifications", error, {
      actorEmail: auth.user.email,
    });
    return jsonWithApiObservation(
      observation,
      {
        ok: false,
        error: error instanceof Error ? error.message : "Não foi possível carregar as notificações.",
        notifications: [],
      },
      { status: 503 },
      { actorEmail: auth.user.email, actorUserId: auth.user.id, actorRole: auth.user.role, clientKey },
    );
  }
}
