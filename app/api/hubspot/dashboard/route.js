import { NextResponse } from "next/server";
import { getHubSpotDashboardData } from "lib/hubspot";
import { assertDashboardData } from "lib/dashboard-contracts";

export async function GET() {
  try {
    const data = assertDashboardData(await getHubSpotDashboardData());
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    const missingToken = message.includes("HUBSPOT_TOKEN_MISSING");

    return NextResponse.json(
      {
        configured: false,
        error: missingToken
          ? "Configure HUBSPOT_ACCESS_TOKEN para carregar os dados reais da HubSpot."
          : "Nao foi possivel consultar a HubSpot no momento.",
      },
      { status: missingToken ? 503 : 500 },
    );
  }
}
