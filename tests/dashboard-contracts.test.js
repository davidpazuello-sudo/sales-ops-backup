import { describe, expect, it } from "vitest";
import { assertDashboardData, isDashboardData } from "../lib/dashboard-contracts";

const validDashboardData = {
  configured: true,
  integration: {
    status: "Conectado",
    source: "hubspot",
    owners: 4,
    deals: 12,
    pipelineAmount: 620000,
    ownerDirectory: [],
  },
  summary: {
    sellersActive: 4,
    totalPipeline: 620000,
    wonThisMonth: 284000,
    stalledDeals: 2,
  },
  states: {
    source: "hubspot",
    loading: "ready",
    empty: {
      sellers: false,
      deals: false,
      alerts: false,
    },
    errors: [],
  },
  pipeline: {
    stages: [],
    totalOpenDeals: 10,
    totalClosedDeals: 2,
  },
  sellers: [],
  alerts: [],
  deals: [],
  reports: [],
};

describe("dashboard contracts", () => {
  it("accepts a valid dashboard payload", () => {
    expect(isDashboardData(validDashboardData)).toBe(true);
    expect(assertDashboardData(validDashboardData)).toEqual(validDashboardData);
  });

  it("rejects payloads with invalid summary fields", () => {
    const invalidDashboardData = {
      ...validDashboardData,
      summary: {
        ...validDashboardData.summary,
        totalPipeline: "620000",
      },
    };

    expect(isDashboardData(invalidDashboardData)).toBe(false);
    expect(() => assertDashboardData(invalidDashboardData)).toThrow("DASHBOARD_DATA_INVALID");
  });
});
