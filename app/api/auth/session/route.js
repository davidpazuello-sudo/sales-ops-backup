import { NextResponse } from "next/server";
import { createClient } from "lib/supabase/server";
import { mapSupabaseUser } from "lib/supabase/shared";
import { readMfaState } from "lib/supabase/mfa";
import { resolveAuthorizedRole } from "lib/user-roles";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const role = await resolveAuthorizedRole(supabase, user);
  const mfa = await readMfaState(supabase);

  return NextResponse.json({
    authenticated: true,
    user: mapSupabaseUser(user, role),
    requiresTwoFactor: mfa.requiresTwoFactor,
    twoFactorEnabled: mfa.hasTotpFactor,
    twoFactorLevel: mfa.currentLevel,
  });
}
