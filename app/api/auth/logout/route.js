import { NextResponse } from "next/server";
import { consumeRateLimit, getRequestClientKey } from "lib/auth-rate-limit";
import { logAuthRouteError, logRateLimitEvent, logSecurityEvent } from "lib/auth-logging";
import { createClient } from "lib/supabase/server";

export async function POST(request) {
  const clientKey = getRequestClientKey(request);
  const rateLimit = await consumeRateLimit({
    scope: "logout",
    bucket: clientKey,
    limit: 20,
    windowMs: 5 * 60 * 1000,
  });

  if (!rateLimit.ok) {
    logRateLimitEvent("api/auth/logout", "logout", {
      clientKey,
      retryAfter: rateLimit.retryAfter,
    });
    return NextResponse.json(
      { ok: false, error: "Muitas tentativas de logout. Aguarde um momento." },
      { status: 429 },
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    logAuthRouteError("api/auth/logout", "sign-out", error, { clientKey });
    return NextResponse.json({ ok: false, error: "Nao foi possivel encerrar a sessao." }, { status: 500 });
  }

  logSecurityEvent("info", "auth.logout_completed", {
    route: "api/auth/logout",
    clientKey,
  });
  return NextResponse.json({ ok: true });
}
