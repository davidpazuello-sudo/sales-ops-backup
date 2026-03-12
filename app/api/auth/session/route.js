import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jsonWithApiObservation, startApiObservation } from "lib/api-observability.js";
import { consumeRateLimit, getRequestClientKey } from "lib/auth-rate-limit";
import { logAuthRouteError, logRateLimitEvent, logSecurityEvent } from "lib/auth-logging";
import { readE2EUserFromCookies } from "lib/e2e-auth";
import { createClient } from "lib/supabase/server";
import { mapSupabaseUser } from "lib/supabase/shared";
import { readMfaState } from "lib/supabase/mfa";
import { resolveAuthorizedRole } from "lib/user-roles";

export async function GET(request) {
  const observation = startApiObservation(request, "api/auth/session");
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
    return jsonWithApiObservation(
      observation,
      { authenticated: false, error: "Muitas consultas de sessao. Tente novamente em instantes." },
      { status: 429 },
      { clientKey },
    );
  }

  const cookieStore = await cookies();
  const e2eUser = readE2EUserFromCookies(cookieStore);

  if (e2eUser) {
    return jsonWithApiObservation(
      observation,
      {
        authenticated: true,
        user: e2eUser,
        requiresTwoFactor: false,
        twoFactorEnabled: false,
        twoFactorLevel: null,
      },
      undefined,
      { clientKey, actorEmail: e2eUser.email, actorUserId: e2eUser.id, actorRole: e2eUser.role },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    logAuthRouteError("api/auth/session", "get-user", error, { clientKey });
    return jsonWithApiObservation(observation, { authenticated: false }, { status: 401 }, { clientKey });
  }

  const user = data?.user;

  if (!user) {
    return jsonWithApiObservation(observation, { authenticated: false }, { status: 401 }, { clientKey });
  }

  const role = await resolveAuthorizedRole(supabase, user);
  const mfa = await readMfaState(supabase);
  const authorizedAccess = Boolean(role);

  if (!authorizedAccess) {
    logSecurityEvent("warn", "auth.session_role_denied", {
      route: "api/auth/session",
      clientKey,
      email: user.email || "",
      userId: user.id,
    });
  }

  if (mfa.requiresTwoFactor) {
    logSecurityEvent("info", "auth.session_mfa_pending", {
      route: "api/auth/session",
      clientKey,
      email: user.email || "",
      userId: user.id,
      role,
    });
  }

  return jsonWithApiObservation(
    observation,
    {
      authenticated: true,
      authorizedAccess,
      user: mapSupabaseUser(user, role),
      requiresTwoFactor: mfa.requiresTwoFactor,
      twoFactorEnabled: mfa.hasTotpFactor,
      twoFactorLevel: mfa.currentLevel,
    },
    undefined,
    { clientKey, actorEmail: user.email || "", actorUserId: user.id, actorRole: role || "" },
  );
}
