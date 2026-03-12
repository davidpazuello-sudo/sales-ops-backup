import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "lib/admin-access";
import { consumeRateLimit, getRequestClientKey } from "lib/auth-rate-limit";
import { getHubSpotDashboardData } from "lib/hubspot";
import { logAuthRouteError, logRateLimitEvent } from "lib/auth-logging";
import { assertDashboardData } from "lib/dashboard-contracts";
import { createDashboardFallbackData } from "lib/dashboard-fallback";

export async function GET(request) {
  const auth = await requireAuthenticatedUser({
    route: "api/hubspot/dashboard",
    action: "read-dashboard",
    minimumRole: "Vendedor",
  });
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const clientKey = getRequestClientKey(request);
  const rateLimit = await consumeRateLimit({
    scope: "hubspot-dashboard",
    bucket: `${clientKey}:${auth.user.email}`,
    limit: 60,
    windowMs: 60 * 1000,
  });

  if (!rateLimit.ok) {
    logRateLimitEvent("api/hubspot/dashboard", "hubspot-dashboard", {
      actorEmail: auth.user.email,
      clientKey,
      retryAfter: rateLimit.retryAfter,
    });
    return NextResponse.json(
      createDashboardFallbackData({
        loading: "error",
        status: "Limite temporario",
        error: "Muitas consultas ao dashboard em pouco tempo. Aguarde alguns instantes.",
      }),
      { status: 429 },
    );
  }

  try {
    const data = assertDashboardData(await getHubSpotDashboardData());
    return NextResponse.json(data);
  } catch (error) {
    logAuthRouteError("api/hubspot/dashboard", "load-dashboard", error, {
      actorEmail: auth.user.email,
    });
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    const missingToken = message.includes("HUBSPOT_TOKEN_MISSING");
    const errorMessage = missingToken
      ? "Configure HUBSPOT_ACCESS_TOKEN para carregar os dados reais da HubSpot."
      : "Nao foi possivel consultar a HubSpot no momento.";

    return NextResponse.json(
      createDashboardFallbackData({
        loading: missingToken ? "config_required" : "error",
        status: missingToken ? "Configuracao pendente" : "Falha na sincronizacao",
        error: errorMessage,
      }),
      { status: missingToken ? 503 : 500 },
    );
  }
}
