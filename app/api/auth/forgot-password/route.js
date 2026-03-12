import { NextResponse } from "next/server";
import { buildLoginRedirectUrl, normalizeEmail } from "lib/auth-flows";
import { logAuthRouteError, logRateLimitEvent, logSecurityEvent } from "lib/auth-logging";
import { createClient } from "lib/supabase/server";
import { consumeRateLimit, getRequestClientKey } from "lib/auth-rate-limit";
import { PUBLIC_AUTH_ERRORS } from "lib/public-auth-errors";
import { isCorporateEmail } from "lib/supabase/shared";

export async function POST(request) {
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
    return NextResponse.json(
      { ok: false, error: PUBLIC_AUTH_ERRORS.tooManyAttempts },
      { status: 429 },
    );
  }

  if (!email || !isCorporateEmail(email)) {
    logSecurityEvent("warn", "auth.forgot_password_invalid_email", {
      route: "api/auth/forgot-password",
      email,
      clientKey,
    });
    return NextResponse.json(
      { ok: false, error: PUBLIC_AUTH_ERRORS.corporateEmailRequired },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: buildLoginRedirectUrl(request),
  });

  if (error) {
    logAuthRouteError("api/auth/forgot-password", "reset-password", error, { email, clientKey });
    return NextResponse.json(
      { ok: true, message: PUBLIC_AUTH_ERRORS.forgotPasswordSubmitted },
    );
  }

  logSecurityEvent("info", "auth.forgot_password_submitted", {
    route: "api/auth/forgot-password",
    email,
  });

  return NextResponse.json({
    ok: true,
    message: PUBLIC_AUTH_ERRORS.forgotPasswordSubmitted,
  });
}
