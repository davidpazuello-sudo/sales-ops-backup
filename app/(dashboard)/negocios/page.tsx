"use client";

import { useSearchParams } from "next/navigation";
import { DealsContent } from "../../dashboard-sections";
import { useDashboardData } from "../../hooks/useDashboardData";

export default function DealsPage() {
  const searchParams = useSearchParams();
  const pipelineId = searchParams.get("pipelineId") ?? "";
  const ownerFilter = searchParams.get("owner") ?? "todos";
  const activityWeeksFilter = searchParams.get("activityWeeks") ?? "1";
  const { dashboardData } = useDashboardData({ scope: "deals", pipelineId, ownerFilter, activityWeeksFilter });

  return (
    <DealsContent
      dashboardData={dashboardData}
      initialOwnerFilter={ownerFilter}
      initialActivityWeeksFilter={activityWeeksFilter}
    />
  );
}
