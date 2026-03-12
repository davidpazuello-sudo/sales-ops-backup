import { NextResponse } from "next/server";
import { normalizeEmail } from "lib/auth-flows";
import { logAuthRouteError, logRateLimitEvent, logSecurityEvent } from "lib/auth-logging";
import { queueAccessRequest } from "lib/access-requests-store";
import { getSuperAdminEmails, hasSupabaseAdminEnv, hasSupabaseEnv, isCorporateEmail } from "lib/supabase/shared";
import { consumeRateLimit, getRequestClientKey } from "lib/auth-rate-limit";
import { PUBLIC_AUTH_ERRORS } from "lib/public-auth-errors";

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const email = normalizeEmail(body?.email);
  const clientKey = getRequestClientKey(request);
  const rateLimit = await consumeRateLimit({
    scope: "first-access",
    bucket: `${clientKey}:${email || "anonymous"}`,
    limit: 4,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.ok) {
    logRateLimitEvent("api/auth/first-access", "first-access", {
      email,
      clientKey,
      retryAfter: rateLimit.retryAfter,
    });
    return NextResponse.json(
      { ok: false, error: PUBLIC_AUTH_ERRORS.tooManyAttempts },
      { status: 429 },
    );
  }

  if (!hasSupabaseEnv()) {
    return NextResponse.json(
      { ok: false, error: PUBLIC_AUTH_ERRORS.authUnavailable },
      { status: 503 },
    );
  }

  if (!hasSupabaseAdminEnv()) {
    return NextResponse.json(
      { ok: false, error: PUBLIC_AUTH_ERRORS.authUnavailable },
      { status: 503 },
    );
  }

  if (!getSuperAdminEmails().length) {
    return NextResponse.json(
      { ok: false, error: PUBLIC_AUTH_ERRORS.authUnavailable },
      { status: 503 },
    );
  }

  if (!email || !isCorporateEmail(email)) {
    logSecurityEvent("warn", "auth.first_access_invalid_email", {
      route: "api/auth/first-access",
      email,
      clientKey,
    });
    return NextResponse.json(
      { ok: false, error: PUBLIC_AUTH_ERRORS.corporateEmailRequired },
      { status: 400 },
    );
  }

  try {
    await queueAccessRequest({
      email,
      type: "first-access",
    });

    logSecurityEvent("info", "auth.first_access_submitted", {
      route: "api/auth/first-access",
      email,
    });

    return NextResponse.json({
      ok: true,
      message: PUBLIC_AUTH_ERRORS.accessRequestSubmitted,
    });
  } catch (error) {
    logAuthRouteError("api/auth/first-access", "queue-first-access", error, { email, requestUrl: request.url });
    return NextResponse.json(
      {
        ok: false,
        error: PUBLIC_AUTH_ERRORS.authUnavailable,
      },
      { status: 503 },
    );
  }
}
