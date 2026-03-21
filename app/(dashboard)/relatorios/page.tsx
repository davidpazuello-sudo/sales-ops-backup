"use client";

import { ReportsContent } from "../../dashboard-sections";
import { useDashboardData } from "../../hooks/useDashboardData";

export default function ReportsPage() {
  const { dashboardData } = useDashboardData({ scope: "reports" });
  return <ReportsContent dashboardData={dashboardData} />;
}
