import { NextResponse } from "next/server";
import { requireSuperAdmin } from "lib/admin-access";
import { listNotificationsForUser } from "lib/access-requests-store";
import { logAuthRouteError } from "lib/auth-logging";

export async function GET() {
  const auth = await requireSuperAdmin();
  if (!auth.ok) {
    return NextResponse.json({ ok: true, notifications: [] });
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
