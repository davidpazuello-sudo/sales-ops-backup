import { describe, expect, it } from "vitest";
import { createDashboardFallbackData } from "../lib/dashboard-fallback";

describe("dashboard fallback", () => {
  it("returns a contract-friendly empty payload", () => {
    const payload = createDashboardFallbackData({
      loading: "config_required",
      status: "Configuracao pendente",
      error: "Configure HUBSPOT_ACCESS_TOKEN.",
    });

    expect(payload.configured).toBe(false);
    expect(payload.integration.status).toBe("Configuracao pendente");
    expect(payload.states.loading).toBe("config_required");
    expect(payload.states.empty.deals).toBe(true);
    expect(payload.pipeline.stages).toEqual([]);
    expect(payload.deals).toEqual([]);
    expect(payload.error).toBe("Configure HUBSPOT_ACCESS_TOKEN.");
  });
});
