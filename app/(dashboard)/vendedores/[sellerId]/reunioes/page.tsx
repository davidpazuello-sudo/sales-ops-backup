"use client";

import { use } from "react";
import { SellerMeetingsContent } from "../../../../dashboard-sections";
import { useDashboardData } from "../../../../hooks/useDashboardData";

export default function SellerMeetingsPage({ params }: { params: Promise<{ sellerId: string }> }) {
  const resolvedParams = use(params);
  const { dashboardData } = useDashboardData({ scope: "sellers" });
  return <SellerMeetingsContent dashboardData={dashboardData} sellerSlug={resolvedParams.sellerId} />;
}
