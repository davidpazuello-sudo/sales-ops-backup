"use client";

import { use } from "react";
import { SellerMeetingDetailContent } from "../../../../../dashboard-sections";
import { useDashboardData } from "../../../../../hooks/useDashboardData";

export default function SellerMeetingDetailPage({ params }: { params: Promise<{ sellerId: string; meetingId: string }> }) {
  const resolvedParams = use(params);
  const { dashboardData } = useDashboardData({ scope: "sellers" });
  return <SellerMeetingDetailContent dashboardData={dashboardData} sellerSlug={resolvedParams.sellerId} meetingId={resolvedParams.meetingId} />;
}
