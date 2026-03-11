import { NextResponse } from "next/server";
import { createClient } from "lib/supabase/server";
import { mapSupabaseUser } from "lib/supabase/shared";
import { readMfaState } from "lib/supabase/mfa";

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const email = String(body?.email || "");
  const password = String(body?.password || "");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return NextResponse.json(
      { ok: false, error: "Email ou senha invalidos." },
      { status: 401 },
    );
  }

  const mfa = await readMfaState(supabase);

  return NextResponse.json({
    ok: true,
    user: mapSupabaseUser(data.user),
    requiresTwoFactor: mfa.requiresTwoFactor,
    twoFactorEnabled: mfa.hasTotpFactor,
  });
}
