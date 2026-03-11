import { NextResponse } from "next/server";
import { createClient } from "lib/supabase/server";
import { mapSupabaseUser } from "lib/supabase/shared";
import { readMfaState } from "lib/supabase/mfa";
import { resolveAuthorizedRole } from "lib/user-roles";
import { consumeRateLimit, getRequestClientKey } from "lib/auth-rate-limit";
import { normalizeEmail } from "lib/auth-flows";
import { isCorporateEmail } from "lib/supabase/shared";

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const email = normalizeEmail(body?.email);
  const password = String(body?.password || "");
  const clientKey = getRequestClientKey(request);
  const rateLimit = await consumeRateLimit({
    scope: "login",
    bucket: `${clientKey}:${email || "anonymous"}`,
    limit: 7,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.ok) {
    return NextResponse.json(
      { ok: false, error: "Muitas tentativas no login. Aguarde alguns minutos e tente novamente." },
      { status: 429 },
    );
  }

  if (!email || !password || !isCorporateEmail(email)) {
    return NextResponse.json(
      { ok: false, error: "Email ou senha invalidos." },
      { status: 401 },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return NextResponse.json(
      { ok: false, error: "Email ou senha invalidos." },
      { status: 401 },
    );
  }

  const role = await resolveAuthorizedRole(supabase, data.user);
  if (!role) {
    await supabase.auth.signOut().catch(() => null);
    return NextResponse.json(
      { ok: false, error: "Sua conta ainda nao foi liberada. Solicite acesso para continuar." },
      { status: 403 },
    );
  }

  const mfa = await readMfaState(supabase);

  return NextResponse.json({
    ok: true,
    user: mapSupabaseUser(data.user, role),
    requiresTwoFactor: mfa.requiresTwoFactor,
    twoFactorEnabled: mfa.hasTotpFactor,
  });
}
