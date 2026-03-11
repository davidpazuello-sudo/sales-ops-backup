import { NextResponse } from "next/server";
import { buildLoginRedirectUrl, normalizeEmail } from "lib/auth-flows";
import { createClient } from "lib/supabase/server";
import { consumeRateLimit, getRequestClientKey } from "lib/auth-rate-limit";
import { PUBLIC_AUTH_ERRORS } from "lib/public-auth-errors";
import { isCorporateEmail } from "lib/supabase/shared";

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const email = normalizeEmail(body?.email);
  const rateLimit = await consumeRateLimit({
    scope: "forgot-password",
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

  if (!email || !isCorporateEmail(email)) {
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
    return NextResponse.json(
      { ok: true, message: PUBLIC_AUTH_ERRORS.forgotPasswordSubmitted },
    );
  }

  return NextResponse.json({
    ok: true,
    message: PUBLIC_AUTH_ERRORS.forgotPasswordSubmitted,
  });
}
