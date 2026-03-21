"use client";

import { TasksContent } from "../../dashboard-sections";
import { useGlobalState } from "../global-state-provider";
import { useDashboardData } from "../../hooks/useDashboardData";

export default function TasksPage() {
  const { sessionUser } = useGlobalState();
  const { dashboardData } = useDashboardData({ scope: "tasks" });
  return <TasksContent dashboardData={dashboardData} sessionUser={sessionUser} />;
}
