import { NextResponse } from "next/server";
import { requireSuperAdmin } from "lib/admin-access";
import { listNotificationsForUser } from "lib/access-requests-store";
import { consumeRateLimit, getRequestClientKey } from "lib/auth-rate-limit";
import { logAuthRouteError, logRateLimitEvent } from "lib/auth-logging";

export async function GET(request) {
  const auth = await requireSuperAdmin({
    route: "api/notifications",
    action: "list-admin-notifications",
  });
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error, notifications: [] }, { status: auth.status });
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
    return NextResponse.json(
      { ok: false, error: "Muitas consultas de notificacoes. Aguarde alguns instantes.", notifications: [] },
      { status: 429 },
    );
  }

  try {
    const notifications = await listNotificationsForUser(auth.user.email);
    return NextResponse.json({ ok: true, notifications });
  } catch (error) {
    logAuthRouteError("api/notifications", "list-admin-notifications", error, {
      actorEmail: auth.user.email,
    });
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Nao foi possivel carregar as notificacoes.",
        notifications: [],
      },
      { status: 503 },
    );
  }
}
