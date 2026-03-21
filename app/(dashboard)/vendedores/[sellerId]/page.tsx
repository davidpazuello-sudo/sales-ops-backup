"use client";

import { use } from "react";
import { SellerProfileContent } from "../../../dashboard-sections";
import { useDashboardData } from "../../../hooks/useDashboardData";

export default function SellerProfilePage({ params }: { params: Promise<{ sellerId: string }> }) {
  const resolvedParams = use(params);
  const { dashboardData } = useDashboardData({ scope: "sellers" });
  return <SellerProfileContent dashboardData={dashboardData} sellerSlug={resolvedParams.sellerId} />;
}
