import { NextResponse } from "next/server";
import { getHubSpotDashboardData } from "lib/hubspot";

export async function GET() {
  try {
    const data = await getHubSpotDashboardData();
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
