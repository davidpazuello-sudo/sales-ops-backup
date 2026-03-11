import { NextResponse } from "next/server";
import { normalizeEmail } from "lib/auth-flows";
import { logAuthRouteError } from "lib/auth-logging";
import { queueAccessRequest } from "lib/access-requests-store";
import { getSuperAdminEmails, hasSupabaseAdminEnv, hasSupabaseEnv, isCorporateEmail } from "lib/supabase/shared";
import { consumeRateLimit, getRequestClientKey } from "lib/auth-rate-limit";
import { PUBLIC_AUTH_ERRORS } from "lib/public-auth-errors";

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const email = normalizeEmail(body?.email);
  const rateLimit = await consumeRateLimit({
    scope: "request-access",
    bucket: `${getRequestClientKey(request)}:${email || "anonymous"}`,
    limit: 4,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.ok) {
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
    return NextResponse.json(
      { ok: false, error: PUBLIC_AUTH_ERRORS.corporateEmailRequired },
      { status: 400 },
    );
  }

  try {
    await queueAccessRequest({
      email,
      type: "request-access",
    });

    return NextResponse.json({
      ok: true,
      message: PUBLIC_AUTH_ERRORS.accessRequestSubmitted,
    });
  } catch (error) {
    logAuthRouteError("api/auth/request-access", "queue-request", error, { email });
    return NextResponse.json(
      {
        ok: false,
        error: PUBLIC_AUTH_ERRORS.authUnavailable,
      },
      { status: 503 },
    );
  }
}
