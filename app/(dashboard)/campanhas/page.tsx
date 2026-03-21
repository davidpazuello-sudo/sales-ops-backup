"use client";

import { useSearchParams } from "next/navigation";
import { CampaignsContent } from "../../dashboard-sections";
import { useDashboardData } from "../../hooks/useDashboardData";

export default function CampaignsPage() {
  const searchParams = useSearchParams();
  const ownerFilter = searchParams.get("proprietario") ?? "todos";
  const { dashboardData } = useDashboardData({ scope: "campaigns", ownerFilter });
  return <CampaignsContent dashboardData={dashboardData} initialOwnerFilter={ownerFilter} />;
}
