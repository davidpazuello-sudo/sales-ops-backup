"use client";

import { use } from "react";
import { DealProfileContent } from "../../../dashboard-sections";
import { useDashboardData } from "../../../hooks/useDashboardData";

export default function DealProfilePage({ params }: { params: Promise<{ dealId: string }> }) {
  const resolvedParams = use(params);
  const { dashboardData } = useDashboardData({ scope: "deals" });
  return <DealProfileContent dashboardData={dashboardData} dealId={resolvedParams.dealId} />;
}
