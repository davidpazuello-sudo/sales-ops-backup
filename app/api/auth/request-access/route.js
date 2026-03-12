import { NextResponse } from "next/server";
import { jsonWithApiObservation, startApiObservation } from "lib/api-observability.js";
import { normalizeEmail } from "lib/auth-flows";
import { logAuthRouteError, logRateLimitEvent, logSecurityEvent } from "lib/auth-logging";
import { queueAccessRequest } from "lib/access-requests-store";
import { getSuperAdminEmails, hasSupabaseAdminEnv, hasSupabaseEnv, isCorporateEmail } from "lib/supabase/shared";
import { consumeRateLimit, getRequestClientKey } from "lib/auth-rate-limit";
import { PUBLIC_AUTH_ERRORS } from "lib/public-auth-errors";

export async function POST(request) {
  const observation = startApiObservation(request, "api/auth/request-access");
  const body = await request.json().catch(() => null);
  const email = normalizeEmail(body?.email);
  const clientKey = getRequestClientKey(request);
  const rateLimit = await consumeRateLimit({
    scope: "request-access",
    bucket: `${clientKey}:${email || "anonymous"}`,
    limit: 4,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.ok) {
    logRateLimitEvent("api/auth/request-access", "request-access", {
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

  if (!hasSupabaseEnv()) {
    return jsonWithApiObservation(
      observation,
      { ok: false, error: PUBLIC_AUTH_ERRORS.authUnavailable },
      { status: 503 },
      { clientKey, actorEmail: email },
    );
  }

  if (!hasSupabaseAdminEnv()) {
    return jsonWithApiObservation(
      observation,
      { ok: false, error: PUBLIC_AUTH_ERRORS.authUnavailable },
      { status: 503 },
      { clientKey, actorEmail: email },
    );
  }

  if (!getSuperAdminEmails().length) {
    return jsonWithApiObservation(
      observation,
      { ok: false, error: PUBLIC_AUTH_ERRORS.authUnavailable },
      { status: 503 },
      { clientKey, actorEmail: email },
    );
  }

  if (!email || !isCorporateEmail(email)) {
    logSecurityEvent("warn", "auth.request_access_invalid_email", {
      route: "api/auth/request-access",
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

  try {
    await queueAccessRequest({
      email,
      type: "request-access",
    });

    logSecurityEvent("info", "auth.request_access_submitted", {
      route: "api/auth/request-access",
      email,
    });

    return jsonWithApiObservation(
      observation,
      {
        ok: true,
        message: PUBLIC_AUTH_ERRORS.accessRequestSubmitted,
      },
      undefined,
      { clientKey, actorEmail: email },
    );
  } catch (error) {
    logAuthRouteError("api/auth/request-access", "queue-request", error, { email });
    return jsonWithApiObservation(
      observation,
      {
        ok: false,
        error: PUBLIC_AUTH_ERRORS.authUnavailable,
      },
      { status: 503 },
      { clientKey, actorEmail: email },
    );
  }
}
