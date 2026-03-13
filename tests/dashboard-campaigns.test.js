import { describe, expect, it } from "vitest";
import {
  aggregateCampaignSummary,
  buildCampaignSummaries,
  inferPrimaryCampaignLabel,
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
          ownerName: "Ana Souza",
          leadName: "Conta Solaris",
          dueLabel: "12/03/2026, 10:00",
          statusLabel: "Agendada",
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
    expect(campaigns[0].name).toBe(PRIMARY_CAMPAIGN_CONTACT_VALUE);
    expect(campaigns[0].qualification.totalLeads).toBe(2);
    expect(campaigns[0].qualification.totalLeadItems).toHaveLength(2);
    expect(campaigns[0].qualification.mqlCount).toBe(1);
    expect(campaigns[0].qualification.sqlCount).toBe(1);
    expect(campaigns[0].qualification.sqlLeadItems).toHaveLength(1);
    expect(campaigns[0].sales.proposalCount).toBe(1);
    expect(campaigns[0].sales.closedWonCount).toBe(1);
    expect(campaigns[0].sales.closedWonItems).toHaveLength(1);
    expect(campaigns[0].meetingCount).toBe(1);
    expect(campaigns[0].meetings).toEqual([
      {
        id: "meeting-1",
        ownerName: "Ana Souza",
        leadName: "Conta Solaris",
        dateLabel: "12/03/2026, 10:00",
        statusLabel: "Agendada",
      },
    ]);
    expect(campaigns[0].qualifiedOpportunityItems).toHaveLength(1);
    expect(campaigns[0].smartGoals).toHaveLength(4);
  });

  it("builds attempt buckets and disqualified numbers from campaign contacts and activities", () => {
    const campaigns = buildCampaignSummaries({
      contacts: [
        {
          id: "contact-a",
          campaignName: PRIMARY_CAMPAIGN_CONTACT_VALUE,
          name: "Lead A",
          phone: "1111-1111",
          leadStatus: "NEW",
          ownerName: "Ana",
        },
        {
          id: "contact-b",
          campaignName: PRIMARY_CAMPAIGN_CONTACT_VALUE,
          name: "Lead B",
          phone: "2222-2222",
          leadStatus: "ATTEMPTED_TO_CONTACT",
          ownerName: "Bruno",
        },
        {
          id: "contact-c",
          campaignName: PRIMARY_CAMPAIGN_CONTACT_VALUE,
          name: "Lead C",
          phone: "3333-3333",
          leadStatus: "UNQUALIFIED",
          ownerName: "Carla",
        },
        {
          id: "contact-d",
          campaignName: PRIMARY_CAMPAIGN_CONTACT_VALUE,
          name: "Lead D",
          phone: "4444-4444",
          leadStatus: "OPEN_DEAL",
          ownerName: "Diego",
        },
      ],
      activities: [
        { id: "call-1", campaignName: PRIMARY_CAMPAIGN_CONTACT_VALUE, kind: "call", contactIds: ["contact-a"] },
        { id: "call-2", campaignName: PRIMARY_CAMPAIGN_CONTACT_VALUE, kind: "call", contactIds: ["contact-b"] },
        { id: "task-2", campaignName: PRIMARY_CAMPAIGN_CONTACT_VALUE, kind: "task", contactIds: ["contact-b"] },
        { id: "call-3", campaignName: PRIMARY_CAMPAIGN_CONTACT_VALUE, kind: "call", contactIds: ["contact-c"] },
        { id: "task-3", campaignName: PRIMARY_CAMPAIGN_CONTACT_VALUE, kind: "task", contactIds: ["contact-c"] },
        { id: "call-4", campaignName: PRIMARY_CAMPAIGN_CONTACT_VALUE, kind: "call", contactIds: ["contact-c"] },
        { id: "call-5", campaignName: PRIMARY_CAMPAIGN_CONTACT_VALUE, kind: "call", contactIds: ["contact-d"] },
        { id: "task-5", campaignName: PRIMARY_CAMPAIGN_CONTACT_VALUE, kind: "task", contactIds: ["contact-d"] },
        { id: "call-6", campaignName: PRIMARY_CAMPAIGN_CONTACT_VALUE, kind: "call", contactIds: ["contact-d"] },
        { id: "task-6", campaignName: PRIMARY_CAMPAIGN_CONTACT_VALUE, kind: "task", contactIds: ["contact-d"] },
      ],
    });

    expect(campaigns).toHaveLength(1);
    expect(campaigns[0].prospecting.firstAttemptCount).toBe(1);
    expect(campaigns[0].prospecting.secondAttemptCount).toBe(1);
    expect(campaigns[0].prospecting.thirdAttemptCount).toBe(1);
    expect(campaigns[0].prospecting.fourthAttemptCount).toBe(1);
    expect(campaigns[0].prospecting.disqualifiedNumbersCount).toBe(1);
    expect(campaigns[0].prospecting.firstAttemptItems[0]).toMatchObject({
      leadName: "Lead A",
      detailLabel: "1111-1111",
      statusLabel: "1a tentativa",
    });
    expect(campaigns[0].prospecting.disqualifiedNumberItems[0]).toMatchObject({
      leadName: "Lead C",
      detailLabel: "3333-3333",
      statusLabel: "UNQUALIFIED",
    });
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
    expect(campaigns[0].qualification.totalLeads).toBe(2);
    expect(campaigns[0].qualification.mqlCount).toBe(1);
    expect(campaigns[0].qualification.sqlCount).toBe(1);
  });

  it("can build campaign summaries without eager detail rows", () => {
    const campaigns = buildCampaignSummaries({
      contacts: [
        {
          id: "contact-2026-1",
          campaignName: PRIMARY_CAMPAIGN_CONTACT_VALUE,
          lifecycleStage: "marketingqualifiedlead",
          leadStatus: "",
        },
      ],
      activities: [
        {
          id: "meeting-1",
          campaignName: PRIMARY_CAMPAIGN_CONTACT_VALUE,
          kind: "meeting",
          updatedAt: new Date().toISOString(),
        },
      ],
    }, {
      includeDetails: false,
    });

    expect(campaigns).toHaveLength(1);
    expect(campaigns[0].qualification.totalLeads).toBe(1);
    expect(campaigns[0].qualification.totalLeadItems).toHaveLength(0);
    expect(campaigns[0].meetings).toHaveLength(0);
    expect(campaigns[0].meetingCount).toBe(1);
  });

  it("canonicalizes primary campaign variants and HubSpot boolean markers", () => {
    const campaigns = buildCampaignSummaries({
      deals: [
        {
          id: "deal-aluno-1",
          campaignName: inferPrimaryCampaignLabel("SEMED - MAO - Aluno a Bordo e Pais Conectados"),
          stageLabel: "Discovery",
          isWon: false,
          isClosed: false,
        },
      ],
      contacts: [
        {
          id: "contact-aluno-1",
          campaignName: inferPrimaryCampaignLabel("true"),
          lifecycleStage: "salesqualifiedlead",
          leadStatus: "SQL",
        },
      ],
    });

    expect(campaigns).toHaveLength(1);
    expect(campaigns[0].name).toBe(PRIMARY_CAMPAIGN_CONTACT_VALUE);
    expect(campaigns[0].qualification.totalLeads).toBe(1);
    expect(campaigns[0].qualification.sqlCount).toBe(1);
    expect(campaigns[0].qualifiedOpportunityCount).toBe(1);
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
          totalLeads: 10,
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
          totalLeads: 20,
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
    expect(aggregate.qualification.totalLeads).toBe(30);
    expect(aggregate.qualification.totalLeadItems).toHaveLength(0);
    expect(aggregate.qualification.sqlCount).toBe(12);
    expect(aggregate.sales.closedWonCount).toBe(5);
    expect(aggregate.meetingCount).toBe(17);
    expect(aggregate.qualifiedOpportunityCount).toBe(20);
    expect(aggregate.smartGoals.find((goal) => goal.id === "sqls")?.current).toBe(12);
    expect(aggregate.lastActivityAt).toBe("2026-03-12T09:00:00.000Z");
  });
});
