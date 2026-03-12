import { describe, expect, it } from "vitest";
import {
  aggregateCampaignSummary,
  buildCampaignSummaries,
  PRIMARY_CAMPAIGN_CONTACT_VALUE,
  PRIMARY_CAMPAIGN_NAME,
} from "../lib/services/dashboard-campaigns";

describe("dashboard campaigns service", () => {
  it("builds only the Aluno a Bordo campaign summary from hubspot-flavored data", () => {
    const campaigns = buildCampaignSummaries({
      deals: [
        {
          id: "deal-1",
          campaignName: PRIMARY_CAMPAIGN_NAME,
          stageLabel: "Proposta enviada",
          isWon: false,
          isClosed: false,
        },
        {
          id: "deal-2",
          campaignName: PRIMARY_CAMPAIGN_NAME,
          stageLabel: "Closed Won",
          isWon: true,
          isClosed: true,
        },
        {
          id: "deal-3",
          campaignName: "Outra campanha",
          stageLabel: "Proposta enviada",
          isWon: false,
          isClosed: false,
        },
      ],
      contacts: [
        {
          id: "contact-1",
          campaignName: PRIMARY_CAMPAIGN_NAME,
          lifecycleStage: "marketingqualifiedlead",
          leadStatus: "",
        },
        {
          id: "contact-2",
          campaignName: PRIMARY_CAMPAIGN_NAME,
          lifecycleStage: "salesqualifiedlead",
          leadStatus: "SQL",
        },
        {
          id: "contact-3",
          campaignName: "Outra campanha",
          lifecycleStage: "salesqualifiedlead",
          leadStatus: "SQL",
        },
      ],
      activities: [
        {
          id: "call-1",
          campaignName: PRIMARY_CAMPAIGN_NAME,
          kind: "call",
          updatedAt: new Date().toISOString(),
        },
        {
          id: "meeting-1",
          campaignName: PRIMARY_CAMPAIGN_NAME,
          kind: "meeting",
          updatedAt: new Date().toISOString(),
        },
        {
          id: "task-1",
          campaignName: PRIMARY_CAMPAIGN_NAME,
          kind: "task",
          updatedAt: new Date().toISOString(),
        },
        {
          id: "task-2",
          campaignName: "Outra campanha",
          kind: "task",
          updatedAt: new Date().toISOString(),
        },
      ],
    });

    expect(campaigns).toHaveLength(1);
    expect(campaigns[0].name).toBe(PRIMARY_CAMPAIGN_NAME);
    expect(campaigns[0].qualification.mqlCount).toBe(1);
    expect(campaigns[0].qualification.sqlCount).toBe(1);
    expect(campaigns[0].sales.proposalCount).toBe(1);
    expect(campaigns[0].sales.closedWonCount).toBe(1);
    expect(campaigns[0].meetingCount).toBe(1);
    expect(campaigns[0].smartGoals).toHaveLength(4);
  });

  it("accepts the HubSpot contact property value for the primary campaign", () => {
    const campaigns = buildCampaignSummaries({
      contacts: [
        {
          id: "contact-2026-1",
          campaignName: PRIMARY_CAMPAIGN_CONTACT_VALUE,
          lifecycleStage: "marketingqualifiedlead",
          leadStatus: "",
        },
        {
          id: "contact-2026-2",
          campaignName: PRIMARY_CAMPAIGN_CONTACT_VALUE,
          lifecycleStage: "salesqualifiedlead",
          leadStatus: "SQL",
        },
      ],
    });

    expect(campaigns).toHaveLength(1);
    expect(campaigns[0].name).toBe(PRIMARY_CAMPAIGN_CONTACT_VALUE);
    expect(campaigns[0].qualification.mqlCount).toBe(1);
    expect(campaigns[0].qualification.sqlCount).toBe(1);
  });

  it("aggregates multiple campaigns into a portfolio-level summary", () => {
    const aggregate = aggregateCampaignSummary([
      {
        id: "campanha-a",
        name: "Campanha A",
        source: "hubspot",
        prospecting: {
          callsDaily: 3,
          callsWeekly: 10,
          connectionsDaily: 2,
          connectionsWeekly: 8,
          dailyCallTarget: 15,
          dailyConnectionTarget: 7,
        },
        qualification: {
          mqlCount: 10,
          sqlCount: 4,
          conversionRate: 40,
          targetSqls: 40,
        },
        sales: {
          proposalCount: 5,
          closedWonCount: 2,
          conversionRate: 40,
          targetClosedWon: 15,
        },
        smartGoals: [
          { id: "sqls", label: "SQLs", current: 4, target: 40, progress: 10, remaining: 36, status: "Em andamento" },
          { id: "meetings", label: "Reunioes", current: 7, target: 70, progress: 10, remaining: 63, status: "Em andamento" },
          { id: "closed-won", label: "Fechados", current: 2, target: 15, progress: 13, remaining: 13, status: "Em andamento" },
          { id: "qualified-opportunities", label: "Qualificadas", current: 9, target: 65, progress: 14, remaining: 56, status: "Em andamento" },
        ],
        meetingCount: 7,
        qualifiedOpportunityCount: 9,
        lastActivityAt: "2026-03-11T12:00:00.000Z",
      },
      {
        id: "campanha-b",
        name: "Campanha B",
        source: "hubspot",
        prospecting: {
          callsDaily: 4,
          callsWeekly: 11,
          connectionsDaily: 3,
          connectionsWeekly: 9,
          dailyCallTarget: 15,
          dailyConnectionTarget: 7,
        },
        qualification: {
          mqlCount: 20,
          sqlCount: 8,
          conversionRate: 40,
          targetSqls: 40,
        },
        sales: {
          proposalCount: 8,
          closedWonCount: 3,
          conversionRate: 38,
          targetClosedWon: 15,
        },
        smartGoals: [
          { id: "sqls", label: "SQLs", current: 8, target: 40, progress: 20, remaining: 32, status: "Em andamento" },
          { id: "meetings", label: "Reunioes", current: 10, target: 70, progress: 14, remaining: 60, status: "Em andamento" },
          { id: "closed-won", label: "Fechados", current: 3, target: 15, progress: 20, remaining: 12, status: "Em andamento" },
          { id: "qualified-opportunities", label: "Qualificadas", current: 11, target: 65, progress: 17, remaining: 54, status: "Em andamento" },
        ],
        meetingCount: 10,
        qualifiedOpportunityCount: 11,
        lastActivityAt: "2026-03-12T09:00:00.000Z",
      },
    ]);

    expect(aggregate.name).toBe("Todas as campanhas");
    expect(aggregate.qualification.sqlCount).toBe(12);
    expect(aggregate.sales.closedWonCount).toBe(5);
    expect(aggregate.meetingCount).toBe(17);
    expect(aggregate.qualifiedOpportunityCount).toBe(20);
    expect(aggregate.smartGoals.find((goal) => goal.id === "sqls")?.current).toBe(12);
    expect(aggregate.lastActivityAt).toBe("2026-03-12T09:00:00.000Z");
  });
});
