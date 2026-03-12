import { NextResponse } from "next/server";
import { jsonWithApiObservation, startApiObservation } from "lib/api-observability.js";
import { buildLoginRedirectUrl, normalizeEmail } from "lib/auth-flows";
import { logAuthRouteError, logRateLimitEvent, logSecurityEvent } from "lib/auth-logging";
import { createClient } from "lib/supabase/server";
import { consumeRateLimit, getRequestClientKey } from "lib/auth-rate-limit";
import { PUBLIC_AUTH_ERRORS } from "lib/public-auth-errors";
import { isCorporateEmail } from "lib/supabase/shared";

export async function POST(request) {
  const observation = startApiObservation(request, "api/auth/forgot-password");
  const body = await request.json().catch(() => null);
  const email = normalizeEmail(body?.email);
  const clientKey = getRequestClientKey(request);
  const rateLimit = await consumeRateLimit({
    scope: "forgot-password",
    bucket: `${clientKey}:${email || "anonymous"}`,
    limit: 4,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.ok) {
    logRateLimitEvent("api/auth/forgot-password", "forgot-password", {
      email,
      clientKey,
      retryAfter: rateLimit.retryAfter,
    });
    return jsonWithApiObservation(
      observation,
      { ok: false, error: PUBLIC_AUTH_ERRORS.tooManyAttempts },
      { status: 429 },
      { clientKey, actorEmail: email },
    );
  }

  if (!email || !isCorporateEmail(email)) {
    logSecurityEvent("warn", "auth.forgot_password_invalid_email", {
      route: "api/auth/forgot-password",
      email,
      clientKey,
    });
    return jsonWithApiObservation(
      observation,
      { ok: false, error: PUBLIC_AUTH_ERRORS.corporateEmailRequired },
      { status: 400 },
      { clientKey, actorEmail: email },
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: buildLoginRedirectUrl(request),
  });

  if (error) {
    logAuthRouteError("api/auth/forgot-password", "reset-password", error, { email, clientKey });
    return jsonWithApiObservation(
      observation,
      { ok: true, message: PUBLIC_AUTH_ERRORS.forgotPasswordSubmitted },
      undefined,
      { clientKey, actorEmail: email },
    );
  }

  logSecurityEvent("info", "auth.forgot_password_submitted", {
    route: "api/auth/forgot-password",
    email,
  });

  return jsonWithApiObservation(
    observation,
    {
      ok: true,
      message: PUBLIC_AUTH_ERRORS.forgotPasswordSubmitted,
    },
    undefined,
    { clientKey, actorEmail: email },
  );
}
