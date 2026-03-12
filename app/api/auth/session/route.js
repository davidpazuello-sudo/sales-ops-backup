import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { consumeRateLimit, getRequestClientKey } from "lib/auth-rate-limit";
import { logAuthRouteError, logRateLimitEvent } from "lib/auth-logging";
import { readE2EUserFromCookies } from "lib/e2e-auth";
import { createClient } from "lib/supabase/server";
import { mapSupabaseUser } from "lib/supabase/shared";
import { readMfaState } from "lib/supabase/mfa";
import { resolveAuthorizedRole } from "lib/user-roles";

export async function GET(request) {
  const clientKey = getRequestClientKey(request);
  const rateLimit = await consumeRateLimit({
    scope: "session",
    bucket: clientKey,
    limit: 60,
    windowMs: 60 * 1000,
  });

  if (!rateLimit.ok) {
    logRateLimitEvent("api/auth/session", "session", {
      clientKey,
      retryAfter: rateLimit.retryAfter,
    });
    return NextResponse.json(
      { authenticated: false, error: "Muitas consultas de sessao. Tente novamente em instantes." },
      { status: 429 },
    );
  }

  const cookieStore = await cookies();
  const e2eUser = readE2EUserFromCookies(cookieStore);

  if (e2eUser) {
    return NextResponse.json({
      authenticated: true,
      user: e2eUser,
      requiresTwoFactor: false,
      twoFactorEnabled: false,
      twoFactorLevel: null,
    });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    logAuthRouteError("api/auth/session", "get-user", error, { clientKey });
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const user = data?.user;

  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const role = await resolveAuthorizedRole(supabase, user);
  const mfa = await readMfaState(supabase);
  const authorizedAccess = Boolean(role);

  return NextResponse.json({
    authenticated: true,
    authorizedAccess,
    user: mapSupabaseUser(user, role),
    requiresTwoFactor: mfa.requiresTwoFactor,
    twoFactorEnabled: mfa.hasTotpFactor,
    twoFactorLevel: mfa.currentLevel,
  });
}
