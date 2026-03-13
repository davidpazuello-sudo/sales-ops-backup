import type { DashboardData, DashboardFallbackOptions } from "./types/dashboard";

export function createDashboardFallbackData({
  source = "hubspot",
  loading = "idle",
  status = "Pendente",
  error = "",
}: DashboardFallbackOptions = {}): DashboardData {
  return {
    configured: false,
    integration: {
      status,
      source,
      owners: 0,
      deals: 0,
      pipelineAmount: 0,
      ownerDirectory: [],
      profileEmail: "",
      profileRole: "",
    },
    summary: {
      sellersActive: 0,
      totalPipeline: 0,
      wonThisMonth: 0,
      stalledDeals: 0,
    },
    states: {
      source,
      loading,
      empty: {
        sellers: true,
        deals: true,
        alerts: true,
      },
      errors: error ? [error] : [],
    },
    pipeline: {
      stages: [],
      totalOpenDeals: 0,
      totalClosedDeals: 0,
    },
    sellers: [],
    alerts: [],
    deals: [],
    tasks: [],
    meetings: [],
    auditLogs: [],
    syncLogs: [],
    notifications: [],
    campaigns: [],
    campaignOptions: [],
    reports: [],
    error,
  };
}
