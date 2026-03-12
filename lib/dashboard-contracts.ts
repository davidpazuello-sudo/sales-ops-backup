import type { DashboardData } from "./types/dashboard";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isDashboardData(data: unknown): data is DashboardData {
  if (!isRecord(data)) return false;
  if (typeof data.configured !== "boolean") return false;
  if (!isRecord(data.integration) || !isRecord(data.summary)) return false;
  if (!Array.isArray(data.sellers) || !Array.isArray(data.alerts) || !Array.isArray(data.deals) || !Array.isArray(data.reports)) return false;
  if ("tasks" in data && !Array.isArray(data.tasks)) return false;
  if ("meetings" in data && !Array.isArray(data.meetings)) return false;
  if ("auditLogs" in data && !Array.isArray(data.auditLogs)) return false;
  if ("syncLogs" in data && !Array.isArray(data.syncLogs)) return false;
  if ("notifications" in data && !Array.isArray(data.notifications)) return false;
  if ("campaigns" in data && !Array.isArray(data.campaigns)) return false;

  return (
    typeof data.integration.status === "string" &&
    typeof data.integration.owners === "number" &&
    typeof data.integration.deals === "number" &&
    typeof data.integration.pipelineAmount === "number" &&
    typeof data.summary.sellersActive === "number" &&
    typeof data.summary.totalPipeline === "number" &&
    typeof data.summary.wonThisMonth === "number" &&
    typeof data.summary.stalledDeals === "number" &&
    (!("pipeline" in data) || (
      isRecord(data.pipeline)
      && Array.isArray(data.pipeline.stages)
      && typeof data.pipeline.totalOpenDeals === "number"
      && typeof data.pipeline.totalClosedDeals === "number"
    )) &&
    (!("states" in data) || (
      isRecord(data.states)
      && typeof data.states.source === "string"
      && typeof data.states.loading === "string"
      && isRecord(data.states.empty)
      && typeof data.states.empty.sellers === "boolean"
      && typeof data.states.empty.deals === "boolean"
      && typeof data.states.empty.alerts === "boolean"
      && Array.isArray(data.states.errors)
    ))
  );
}

export function assertDashboardData(data: unknown): DashboardData {
  if (!isDashboardData(data)) {
    throw new Error("DASHBOARD_DATA_INVALID");
  }

  return data;
}
