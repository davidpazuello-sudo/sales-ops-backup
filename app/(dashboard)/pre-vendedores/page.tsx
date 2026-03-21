"use client";

import { useSearchParams } from "next/navigation";
import { PreSalesContent } from "../../dashboard-sections";
import { useGlobalState } from "../global-state-provider";
import { useDashboardData } from "../../hooks/useDashboardData";

export default function PreSalesPage() {
  const searchParams = useSearchParams();
  const { sessionUser } = useGlobalState();
  const ownerFilter = searchParams.get("proprietario") ?? "todos";
  const campaignName = searchParams.get("campanha") ?? "Aluno a Bordo 2026";
  const { dashboardData } = useDashboardData({ scope: "presales", ownerFilter, campaignName });

  return (
    <PreSalesContent
      dashboardData={dashboardData}
      initialOwnerFilter={ownerFilter}
      initialCampaignName={campaignName}
      sessionUser={sessionUser}
    />
  );
}
