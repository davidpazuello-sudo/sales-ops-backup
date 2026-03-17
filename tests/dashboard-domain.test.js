import { describe, expect, it } from "vitest";
import {
  buildDashboardDomainPayload,
  buildPipelineStages,
  normalizeHubSpotContact,
  normalizeHubSpotOwner,
} from "../lib/dashboard-domain";
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
      "system_events",
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
      userId: "",
      name: "Ana Souza",
      email: "ana@empresa.com",
      team: "Enterprise",
    });
  });

  it("normalizes HubSpot contact lifecycle stages and lead statuses for the dashboard", () => {
    const contact = normalizeHubSpotContact({
      id: "contact-1",
      properties: {
        firstname: "Ana",
        lastname: "Gestora",
        email: "ana@empresa.com",
        lifecyclestage: "1321207898",
        conectado: "Não",
        hs_lead_status: "OPEN_DEAL",
        campanhas: "Aluno a Bordo 2026",
        hubspot_owner_id: "99",
      },
    }, new Map([["99", {
      id: "99",
      name: "Ana Souza",
      email: "ana@empresa.com",
    }]]));

    expect(contact.lifecycleStage).toBe("Desqualificado");
    expect(contact.qualifiedStatus).toBe("Não");
    expect(contact.leadStatus).toBe("Qualified");
    expect(contact.campaignName).toBe("Aluno a Bordo 2026");
  });

  it("maps the lifecycle updater from HubSpot history to the owner directory", () => {
    const contact = normalizeHubSpotContact({
      id: "contact-history-1",
      properties: {
        firstname: "Contato",
        lastname: "Historico",
        email: "historico@empresa.com",
        lifecyclestage: "Desqualificado",
        hs_lead_status: "UNQUALIFIED",
        hubspot_owner_id: "99",
      },
      propertiesWithHistory: {
        lifecyclestage: [
          {
            value: "Desqualificado",
            timestamp: "2026-03-16T14:18:00.000Z",
            sourceId: "{userId:321}",
          },
        ],
      },
    }, new Map([["99", {
      id: "99",
      name: "Ana Souza",
      email: "ana@empresa.com",
    }]]), [{
      id: "654",
      hubspotOwnerId: "654",
      userId: "321",
      name: "Mercado Privado",
      email: "mercado.privado@sasi.com.br",
      team: "AM.Comercial",
    }]);

    expect(contact.lifecycleUpdatedBy).toBe("Mercado Privado");
  });

  it("maps the qualified status updater from HubSpot history to the owner directory", () => {
    const contact = normalizeHubSpotContact({
      id: "contact-history-2",
      properties: {
        firstname: "Contato",
        lastname: "Qualificado",
        email: "qualificado@empresa.com",
        conectado: "Não",
        hubspot_owner_id: "99",
      },
      propertiesWithHistory: {
        conectado: [
          {
            value: "Não",
            timestamp: "2026-03-17T10:18:00.000Z",
            sourceId: "{userId:321}",
          },
        ],
      },
    }, new Map([["99", {
      id: "99",
      name: "Ana Souza",
      email: "ana@empresa.com",
    }]]), [{
      id: "654",
      hubspotOwnerId: "654",
      userId: "321",
      name: "Mercado Privado",
      email: "mercado.privado@sasi.com.br",
      team: "AM.Comercial",
    }]);

    expect(contact.qualifiedUpdatedBy).toBe("Mercado Privado");
    expect(contact.qualifiedNoActors).toEqual(["Mercado Privado"]);
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
        {
          id: "8",
          firstName: "Bruno",
          lastName: "Lima",
          email: "bruno@empresa.com",
          teams: [{ name: "Mid Market", primary: true }],
        },
      ],
      [
        {
          id: "d-1",
          properties: {
            dealname: "Expansao Solaris",
            amount: "95000",
            dealstage: "stage-proposta",
            pipeline: "pipeline-brasil-publico",
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
            associations: {
              deals: {
                results: [{ id: "d-1" }],
              },
            },
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
      [
        {
          id: "pipeline-brasil-publico",
          label: "Brasil Publico",
          displayOrder: 0,
          stages: [
            {
              id: "stage-proposta",
              label: "Proposta Enviada",
              displayOrder: 0,
              metadata: {
                isClosed: false,
              },
            },
          ],
        },
      ],
    );

    expect(payload.integration.source).toBe("hubspot");
    expect(payload.pipeline.defaultPipelineId).toBe("pipeline-brasil-publico");
    expect(payload.pipeline.stages).toHaveLength(1);
    expect(payload.pipeline.stages[0].label).toBe("Proposta Enviada");
    expect(payload.deals[0].pipelineLabel).toBe("Brasil Publico");
    expect(payload.deals[0].ownerEmail).toBe("ana@empresa.com");
    expect(payload.sellers).toHaveLength(2);
    expect(payload.sellers.map((seller) => seller.name)).toEqual(["Ana Souza", "Bruno Lima"]);
    expect(payload.tasks).toHaveLength(3);
    expect(payload.tasks.every((task) => task.ownerEmail === "ana@empresa.com")).toBe(true);
    expect(payload.tasks.map((task) => task.kind).sort()).toEqual(["call", "meeting", "task"]);
    expect(payload.tasks.find((task) => task.kind === "meeting")?.leadName).toBe("Expansao Solaris");
    expect(payload.states.empty.deals).toBe(false);
  });

  it("sorts sellers alphabetically regardless of pipeline amount", () => {
    const payload = buildDashboardDomainPayload(
      [
        {
          id: "8",
          firstName: "Bruno",
          lastName: "Lima",
          email: "bruno@empresa.com",
          teams: [{ name: "Mid Market", primary: true }],
        },
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
            dealname: "Conta Bruno",
            amount: "300000",
            dealstage: "stage-proposta",
            pipeline: "pipeline-brasil-publico",
            hubspot_owner_id: "8",
            hs_lastmodifieddate: new Date().toISOString(),
          },
        },
        {
          id: "d-2",
          properties: {
            dealname: "Conta Ana",
            amount: "1000",
            dealstage: "stage-proposta",
            pipeline: "pipeline-brasil-publico",
            hubspot_owner_id: "7",
            hs_lastmodifieddate: new Date().toISOString(),
          },
        },
      ],
      {
        tasks: [],
        calls: [],
        meetings: [],
      },
      [
        {
          id: "pipeline-brasil-publico",
          label: "Brasil Publico",
          displayOrder: 0,
          stages: [
            {
              id: "stage-proposta",
              label: "Proposta Enviada",
              displayOrder: 0,
              metadata: {
                isClosed: false,
              },
            },
          ],
        },
      ],
    );

    expect(payload.sellers.map((seller) => seller.name)).toEqual(["Ana Souza", "Bruno Lima"]);
  });

  it("tracks operational counters even when the seller has only activities", () => {
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
        {
          id: "8",
          firstName: "Bruno",
          lastName: "Lima",
          email: "bruno@empresa.com",
          teams: [{ name: "Mid Market", primary: true }],
        },
        {
          id: "9",
          firstName: "Carla",
          lastName: "Melo",
          email: "carla@empresa.com",
          teams: [{ name: "Sales", primary: true }],
        },
      ],
      [
        {
          id: "d-1",
          properties: {
            dealname: "Conta Ana",
            amount: "1000",
            dealstage: "stage-proposta",
            pipeline: "pipeline-brasil-publico",
            hubspot_owner_id: "7",
            hs_lastmodifieddate: new Date().toISOString(),
          },
        },
      ],
      {
        tasks: [],
        calls: [],
        meetings: [
          {
            id: "m-1",
            properties: {
              hs_meeting_title: "Reuniao de Carla",
              hs_meeting_outcome: "SCHEDULED",
              hubspot_owner_id: "9",
              hs_meeting_start_time: nextHour,
              hs_lastmodifieddate: nextHour,
            },
          },
        ],
      },
      [
        {
          id: "pipeline-brasil-publico",
          label: "Brasil Publico",
          displayOrder: 0,
          stages: [
            {
              id: "stage-proposta",
              label: "Proposta Enviada",
              displayOrder: 0,
              metadata: {
                isClosed: false,
              },
            },
          ],
        },
      ],
    );

    expect(payload.sellers.map((seller) => seller.name)).toEqual(["Ana Souza", "Bruno Lima", "Carla Melo"]);
    expect(payload.sellers.find((seller) => seller.name === "Carla Melo")?.pendingActivities).toBe(1);
    expect(payload.sellers.find((seller) => seller.name === "Carla Melo")?.meetingsCount).toBe(1);
  });

  it("infers Aluno a Bordo campaign from deal names and contact markers", () => {
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
          id: "deal-aluno-1",
          associations: {
            contacts: {
              results: [{ id: "contact-aluno-1" }],
            },
          },
          properties: {
            dealname: "SEMED - MAO - Aluno a Bordo e Pais Conectados",
            amount: "15000",
            dealstage: "discovery",
            pipeline: "pipeline-brasil-publico",
            hubspot_owner_id: "7",
            hs_lastmodifieddate: new Date().toISOString(),
          },
        },
      ],
      {
        contacts: [
          {
            id: "contact-aluno-1",
            properties: {
              email: "alunoabordo@empresa.com",
              alunos_a_bordo_contatos: "true",
              lifecyclestage: "salesqualifiedlead",
              hs_lead_status: "SQL",
              hubspot_owner_id: "7",
            },
          },
        ],
        tasks: [],
        calls: [],
        meetings: [],
      },
      [
        {
          id: "pipeline-brasil-publico",
          label: "Brasil Publico",
          displayOrder: 0,
          stages: [
            {
              id: "discovery",
              label: "Discovery",
              displayOrder: 0,
              metadata: {
                isClosed: false,
              },
            },
          ],
        },
      ],
    );

    expect(payload.campaigns).toHaveLength(1);
    expect(payload.campaigns[0].name).toBe("Aluno a Bordo 2026");
    expect(payload.campaigns[0].qualifiedOpportunityCount).toBe(1);
    expect(payload.campaigns[0].qualification.sqlCount).toBe(1);
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
