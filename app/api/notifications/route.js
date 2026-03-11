import { NextResponse } from "next/server";
import { requireSuperAdmin } from "lib/admin-access";
import { listNotificationsForUser } from "lib/access-requests-store";

export async function GET() {
  const auth = await requireSuperAdmin();
  if (!auth.ok) {
    return NextResponse.json({ ok: true, notifications: [] });
  }

  const notifications = await listNotificationsForUser(auth.user.email);
  return NextResponse.json({ ok: true, notifications });
}
