import { NextResponse } from "next/server";
import { writeAuditLog } from "lib/audit-log-store";
import { createClient } from "lib/supabase/server";
import { mapSupabaseUser } from "lib/supabase/shared";
import { readMfaState } from "lib/supabase/mfa";
import { resolveAuthorizedRole } from "lib/user-roles";
import { consumeRateLimit, getRequestClientKey } from "lib/auth-rate-limit";
import { logAuthRouteError, logRateLimitEvent, logSecurityEvent } from "lib/auth-logging";
import { normalizeEmail } from "lib/auth-flows";
import { isCorporateEmail } from "lib/supabase/shared";

function isSensitiveLoginRole(role) {
  return ["Admin", "Gerente", "Supervisor"].includes(String(role || ""));
}

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
    logRateLimitEvent("api/auth/login", "login", {
      clientKey,
      email,
      retryAfter: rateLimit.retryAfter,
    });
    return NextResponse.json(
      { ok: false, error: "Muitas tentativas no login. Aguarde alguns minutos e tente novamente." },
      { status: 429 },
    );
  }

  if (!email || !password || !isCorporateEmail(email)) {
    logSecurityEvent("warn", "auth.login_invalid_input", {
      route: "api/auth/login",
      email,
      hasPassword: Boolean(password),
      clientKey,
    });
    return NextResponse.json(
      { ok: false, error: "Email ou senha invalidos." },
      { status: 401 },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    logAuthRouteError("api/auth/login", "sign-in", error || new Error("INVALID_CREDENTIALS"), {
      email,
      clientKey,
    });
    return NextResponse.json(
      { ok: false, error: "Email ou senha invalidos." },
      { status: 401 },
    );
  }

  const role = await resolveAuthorizedRole(supabase, data.user);
  if (!role) {
    logSecurityEvent("warn", "auth.login_role_denied", {
      route: "api/auth/login",
      email,
      clientKey,
      userId: data.user.id,
    });
    await supabase.auth.signOut().catch(() => null);
    return NextResponse.json(
      { ok: false, error: "Sua conta ainda nao foi liberada. Solicite acesso para continuar." },
      { status: 403 },
    );
  }

  const mfa = await readMfaState(supabase);
  if (mfa.requiresTwoFactor) {
    logSecurityEvent("info", "auth.mfa_challenge_required", {
      route: "api/auth/login",
      email,
      userId: data.user.id,
      role,
      clientKey,
    });
  }

  logSecurityEvent("info", "auth.login_succeeded", {
    route: "api/auth/login",
    email,
    userId: data.user.id,
    role,
    clientKey,
    requiresTwoFactor: mfa.requiresTwoFactor,
  });

  if (isSensitiveLoginRole(role) || mfa.requiresTwoFactor) {
    await writeAuditLog({
      actorUserId: data.user.id,
      actorEmail: email,
      actorRole: role,
      action: "auth.login_sensitive",
      entityType: "auth_user",
      entityId: data.user.id,
      route: "api/auth/login",
      details: {
        requiresTwoFactor: mfa.requiresTwoFactor,
        twoFactorEnabled: mfa.hasTotpFactor,
        clientKey,
      },
    }).catch(() => null);
  }

  return NextResponse.json({
    ok: true,
    user: mapSupabaseUser(data.user, role),
    requiresTwoFactor: mfa.requiresTwoFactor,
    twoFactorEnabled: mfa.hasTotpFactor,
  });
}
