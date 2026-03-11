import { describe, expect, it } from "vitest";
import { buildDashboardDomainPayload, buildPipelineStages, normalizeHubSpotOwner } from "../lib/dashboard-domain";
import { getDomainEntityNames } from "../lib/domain-model";

describe("dashboard domain", () => {
  it("exposes the Sprint 2 domain entities", () => {
    expect(getDomainEntityNames()).toEqual([
      "users",
      "roles",
      "sellers",
      "deals",
      "stages",
      "notifications",
      "meetings",
      "tasks",
      "audit_logs",
    ]);
  });

  it("normalizes HubSpot owners into domain-friendly records", () => {
    const owner = normalizeHubSpotOwner({
      id: "99",
      firstName: "Ana",
      lastName: "Souza",
      email: "ana@empresa.com",
      teams: [{ name: "Enterprise", primary: true }],
    });

    expect(owner).toEqual({
      id: "99",
      hubspotOwnerId: "99",
      name: "Ana Souza",
      email: "ana@empresa.com",
      team: "Enterprise",
    });
  });

  it("builds pipeline stages and dashboard payload from HubSpot data", () => {
    const payload = buildDashboardDomainPayload(
      [
        {
          id: "7",
          firstName: "Ana",
          lastName: "Souza",
          email: "ana@empresa.com",
          teams: [{ name: "Enterprise", primary: true }],
        },
      ],
      [
        {
          id: "d-1",
          properties: {
            dealname: "Expansao Solaris",
            amount: "95000",
            dealstage: "proposta_enviada",
            pipeline: "default",
            hubspot_owner_id: "7",
            hs_lastmodifieddate: new Date().toISOString(),
          },
        },
      ],
    );

    expect(payload.integration.source).toBe("hubspot");
    expect(payload.pipeline.stages).toHaveLength(1);
    expect(payload.pipeline.stages[0].label).toBe("Proposta Enviada");
    expect(payload.deals[0].ownerEmail).toBe("ana@empresa.com");
    expect(payload.states.empty.deals).toBe(false);
  });

  it("groups deal totals by stage", () => {
    const stages = buildPipelineStages([
      { stageId: "discovery", stageLabel: "Discovery", amount: 100, isClosed: false },
      { stageId: "discovery", stageLabel: "Discovery", amount: 250, isClosed: false },
      { stageId: "closedwon", stageLabel: "Closedwon", amount: 300, isClosed: true },
    ]);

    expect(stages[0].count).toBe(2);
    expect(stages[0].totalAmount).toBe(350);
    expect(stages[1].isClosed).toBe(true);
  });
});
