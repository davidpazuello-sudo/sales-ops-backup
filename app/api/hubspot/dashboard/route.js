import { NextResponse } from "next/server";
import { getHubSpotDashboardData } from "lib/hubspot";
import { assertDashboardData } from "lib/dashboard-contracts";
import { createDashboardFallbackData } from "lib/dashboard-fallback";

export async function GET() {
  try {
    const data = assertDashboardData(await getHubSpotDashboardData());
    return NextResponse.json(data);
  } catch (error) {
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
