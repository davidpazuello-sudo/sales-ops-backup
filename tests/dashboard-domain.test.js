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
    const nextHour = new Date(Date.now() + 3600000).toISOString();
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
      {
        tasks: [
          {
            id: "t-1",
            properties: {
              hs_task_subject: "Enviar follow-up",
              hs_task_status: "NOT_STARTED",
              hs_task_priority: "HIGH",
              hs_task_type: "EMAIL",
              hubspot_owner_id: "7",
              hs_timestamp: nextHour,
              hs_lastmodifieddate: nextHour,
            },
          },
        ],
        calls: [
          {
            id: "c-1",
            properties: {
              hs_call_title: "Ligar para conta Solaris",
              hs_call_status: "SCHEDULED",
              hubspot_owner_id: "7",
              hs_timestamp: nextHour,
              hs_lastmodifieddate: nextHour,
            },
          },
        ],
        meetings: [
          {
            id: "m-1",
            properties: {
              hs_meeting_title: "Reuniao de descoberta",
              hs_meeting_outcome: "SCHEDULED",
              hubspot_owner_id: "7",
              hs_meeting_start_time: nextHour,
              hs_lastmodifieddate: nextHour,
            },
          },
        ],
      },
    );

    expect(payload.integration.source).toBe("hubspot");
    expect(payload.pipeline.stages).toHaveLength(1);
    expect(payload.pipeline.stages[0].label).toBe("Proposta Enviada");
    expect(payload.deals[0].ownerEmail).toBe("ana@empresa.com");
    expect(payload.tasks).toHaveLength(3);
    expect(payload.tasks.every((task) => task.ownerEmail === "ana@empresa.com")).toBe(true);
    expect(payload.tasks.map((task) => task.kind).sort()).toEqual(["call", "meeting", "task"]);
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
