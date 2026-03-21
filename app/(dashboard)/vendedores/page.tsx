"use client";

import { useSearchParams } from "next/navigation";
import { SellersContent } from "../../dashboard-sections";
import { useDashboardData } from "../../hooks/useDashboardData";

export default function SellersPage() {
  const searchParams = useSearchParams();
  const sellerPage = searchParams.get("sellerPage") ?? "1";
  const sellerSearch = searchParams.get("sellerSearch") ?? "";
  const { dashboardData } = useDashboardData({ scope: "sellers", sellerPage, sellerSearch });
  return <SellersContent dashboardData={dashboardData} />;
}
