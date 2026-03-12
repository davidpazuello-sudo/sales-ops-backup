import { NextResponse } from "next/server";
import { jsonWithApiObservation, startApiObservation } from "lib/api-observability.js";
import { consumeRateLimit, getRequestClientKey } from "lib/auth-rate-limit";
import { logAuthRouteError, logRateLimitEvent, logSecurityEvent } from "lib/auth-logging";
import { createClient } from "lib/supabase/server";

export async function POST(request) {
  const observation = startApiObservation(request, "api/auth/logout");
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
    return jsonWithApiObservation(
      observation,
      { ok: false, error: "Muitas tentativas de logout. Aguarde um momento." },
      { status: 429 },
      { clientKey },
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    logAuthRouteError("api/auth/logout", "sign-out", error, { clientKey });
    return jsonWithApiObservation(
      observation,
      { ok: false, error: "Nao foi possivel encerrar a sessao." },
      { status: 500 },
      { clientKey },
    );
  }

  logSecurityEvent("info", "auth.logout_completed", {
    route: "api/auth/logout",
    clientKey,
  });
  return jsonWithApiObservation(observation, { ok: true }, undefined, { clientKey });
}
