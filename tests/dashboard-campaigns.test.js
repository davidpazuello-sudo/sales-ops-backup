import { describe, expect, it } from "vitest";
import {
  aggregateCampaignSummary,
  buildCampaignSummaries,
  getConfiguredCampaignSegmentListNames,
  inferPrimaryCampaignLabel,
  PRIMARY_CAMPAIGN_CONTACT_VALUE,
  PRIMARY_CAMPAIGN_NAME,
  PRIMARY_CAMPAIGN_SEGMENT_LIST_NAMES,
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

  it("builds attempt buckets and disqualified numbers from the HubSpot contact lifecycle", () => {
    const campaigns = buildCampaignSummaries({
      contacts: [
        {
          id: "contact-a",
          campaignName: PRIMARY_CAMPAIGN_CONTACT_VALUE,
          name: "Lead A",
          phone: "1111-1111",
          leadStatus: "NEW",
          lifecycleStage: "1 tentativa",
          ownerName: "Ana",
        },
        {
          id: "contact-b",
          campaignName: PRIMARY_CAMPAIGN_CONTACT_VALUE,
          name: "Lead B",
          phone: "2222-2222",
          leadStatus: "ATTEMPTED_TO_CONTACT",
          lifecycleStage: "2 tentativa",
          ownerName: "Bruno",
        },
        {
          id: "contact-c",
          campaignName: PRIMARY_CAMPAIGN_CONTACT_VALUE,
          name: "Lead C",
          phone: "3333-3333",
          leadStatus: "Wrong number",
          lifecycleStage: "Telefone incorreto",
          ownerName: "Carla",
        },
        {
          id: "contact-d",
          campaignName: PRIMARY_CAMPAIGN_CONTACT_VALUE,
          name: "Lead D",
          phone: "4444-4444",
          leadStatus: "OPEN_DEAL",
          lifecycleStage: "4 tentativa",
          ownerName: "Diego",
        },
        {
          id: "contact-e",
          campaignName: PRIMARY_CAMPAIGN_CONTACT_VALUE,
          name: "Lead E",
          phone: "5555-5555",
          leadStatus: "ATTEMPTED_TO_CONTACT",
          lifecycleStage: "3 tentativa",
          ownerName: "Elisa",
        },
        {
          id: "contact-f",
          campaignName: PRIMARY_CAMPAIGN_CONTACT_VALUE,
          name: "Lead F",
          phone: "6666-6666",
          leadStatus: "Telefone atualizado",
          lifecycleStage: "Telefone atualizado",
          ownerName: "Fabio",
        },
        {
          id: "contact-g",
          campaignName: PRIMARY_CAMPAIGN_CONTACT_VALUE,
          name: "Lead G",
          phone: "7777-7777",
          leadStatus: "UNQUALIFIED",
          lifecycleStage: "Desqualificado",
          ownerName: "Giovana",
        },
        {
          id: "contact-h",
          campaignName: PRIMARY_CAMPAIGN_CONTACT_VALUE,
          name: "Lead H",
          phone: "8888-8888",
          leadStatus: "UNQUALIFIED",
          lifecycleStage: "Desqualificado",
          ownerName: "Carla Costa",
          lifecycleUpdatedBy: "Mercado Privado",
        },
        {
          id: "contact-i",
          campaignName: PRIMARY_CAMPAIGN_CONTACT_VALUE,
          name: "Lead I",
          phone: "9999-9999",
          leadStatus: "UNQUALIFIED",
          lifecycleStage: "Desqualificado",
          ownerName: "Ana Ramos",
          lifecycleUpdatedBy: "Cecília",
        },
      ],
    });

    expect(campaigns).toHaveLength(1);
    expect(campaigns[0].prospecting.firstAttemptCount).toBe(1);
    expect(campaigns[0].prospecting.secondAttemptCount).toBe(1);
    expect(campaigns[0].prospecting.thirdAttemptCount).toBe(1);
    expect(campaigns[0].prospecting.fourthAttemptCount).toBe(1);
    expect(campaigns[0].prospecting.wrongNumbersCount).toBe(1);
    expect(campaigns[0].prospecting.updatedPhoneCount).toBe(1);
    expect(campaigns[0].prospecting.disqualifiedNumbersCount).toBe(3);
    expect(campaigns[0].prospecting.ceciliaDisqualifiedNumbersCount).toBe(1);
    expect(campaigns[0].prospecting.firstAttemptItems[0]).toMatchObject({
      leadName: "Lead A",
      detailLabel: "1111-1111",
      statusLabel: "1a tentativa",
    });
    expect(campaigns[0].prospecting.wrongNumberItems[0]).toMatchObject({
      leadName: "Lead C",
      detailLabel: "3333-3333",
      statusLabel: "Wrong number",
    });
    expect(campaigns[0].prospecting.updatedPhoneItems[0]).toMatchObject({
      leadName: "Lead F",
      detailLabel: "6666-6666",
      statusLabel: "Telefone atualizado",
    });
    expect(campaigns[0].prospecting.disqualifiedNumberItems[0]).toMatchObject({
      leadName: "Lead G",
      detailLabel: "7777-7777",
      statusLabel: "UNQUALIFIED",
    });
    expect(campaigns[0].prospecting.ceciliaDisqualifiedNumberItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          leadName: "Lead H",
          detailLabel: "8888-8888",
          statusLabel: "UNQUALIFIED",
        }),
      ]),
    );
  });

  it("counts only scheduled meetings in the campaign meeting card", () => {
    const campaigns = buildCampaignSummaries({
      activities: [
        {
          id: "meeting-scheduled",
          campaignName: PRIMARY_CAMPAIGN_CONTACT_VALUE,
          kind: "meeting",
          ownerName: "Ana Souza",
          leadName: "Conta Solaris",
          dueLabel: "12/03/2026, 10:00",
          status: "SCHEDULED",
          statusLabel: "Agendada",
          updatedAt: new Date().toISOString(),
        },
        {
          id: "meeting-completed",
          campaignName: PRIMARY_CAMPAIGN_CONTACT_VALUE,
          kind: "meeting",
          ownerName: "Bruno Lima",
          leadName: "Conta Orion",
          dueLabel: "11/03/2026, 14:00",
          status: "COMPLETED",
          statusLabel: "Concluida",
          updatedAt: new Date().toISOString(),
        },
        {
          id: "meeting-noshow",
          campaignName: PRIMARY_CAMPAIGN_CONTACT_VALUE,
          kind: "meeting",
          ownerName: "Carla Dias",
          leadName: "Conta Aurora",
          dueLabel: "10/03/2026, 09:00",
          status: "NO_SHOW",
          statusLabel: "Nao compareceu",
          updatedAt: new Date().toISOString(),
        },
      ],
    });

    expect(campaigns).toHaveLength(1);
    expect(campaigns[0].meetingCount).toBe(1);
    expect(campaigns[0].meetings).toEqual([
      {
        id: "meeting-scheduled",
        ownerName: "Ana Souza",
        leadName: "Conta Solaris",
        dateLabel: "12/03/2026, 10:00",
        statusLabel: "Agendada",
      },
    ]);
    expect(campaigns[0].completedMeetingCount).toBe(1);
    expect(campaigns[0].completedMeetings).toEqual([
      {
        id: "meeting-completed",
        ownerName: "Bruno Lima",
        leadName: "Conta Orion",
        dateLabel: "11/03/2026, 14:00",
        statusLabel: "Concluida",
      },
    ]);
  });

  it("classifies meetings without explicit HubSpot outcome by schedule date", () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const campaigns = buildCampaignSummaries({
      activities: [
        {
          id: "meeting-future-no-outcome",
          campaignName: PRIMARY_CAMPAIGN_CONTACT_VALUE,
          kind: "meeting",
          ownerName: "Ana Souza",
          leadName: "Conta Solar",
          dueAt: tomorrow,
          dueLabel: "Amanha",
          status: "MEETING",
          statusLabel: "Meeting",
        },
        {
          id: "meeting-past-no-outcome",
          campaignName: PRIMARY_CAMPAIGN_CONTACT_VALUE,
          kind: "meeting",
          ownerName: "Bruno Lima",
          leadName: "Conta Lunar",
          dueAt: yesterday,
          dueLabel: "Ontem",
          status: "MEETING",
          statusLabel: "Meeting",
        },
        {
          id: "meeting-no-show",
          campaignName: PRIMARY_CAMPAIGN_CONTACT_VALUE,
          kind: "meeting",
          ownerName: "Carla Dias",
          leadName: "Conta Nebula",
          dueAt: yesterday,
          dueLabel: "Ontem",
          status: "NO_SHOW",
          statusLabel: "Nao compareceu",
        },
      ],
    });

    expect(campaigns).toHaveLength(1);
    expect(campaigns[0].meetingCount).toBe(1);
    expect(campaigns[0].completedMeetingCount).toBe(1);
    expect(campaigns[0].meetings[0]).toMatchObject({
      id: "meeting-future-no-outcome",
    });
    expect(campaigns[0].completedMeetings[0]).toMatchObject({
      id: "meeting-past-no-outcome",
    });
  });

  it("counts connections only from non-call follow-up tasks and not from meetings", () => {
    const campaigns = buildCampaignSummaries({
      contacts: [
        {
          id: "contact-hoje",
          campaignName: PRIMARY_CAMPAIGN_CONTACT_VALUE,
          name: "Contato do dia",
          lifecycleStage: "lead",
          leadStatus: "NEW",
        },
      ],
      activities: [
        {
          id: "task-hoje",
          campaignName: PRIMARY_CAMPAIGN_CONTACT_VALUE,
          kind: "task",
          updatedAt: new Date().toISOString(),
        },
        {
          id: "meeting-hoje",
          campaignName: PRIMARY_CAMPAIGN_CONTACT_VALUE,
          kind: "meeting",
          updatedAt: new Date().toISOString(),
        },
        {
          id: "call-hoje",
          campaignName: PRIMARY_CAMPAIGN_CONTACT_VALUE,
          kind: "call",
          contactIds: ["contact-hoje"],
          updatedAt: new Date().toISOString(),
        },
      ],
    });

    expect(campaigns).toHaveLength(1);
    expect(campaigns[0].prospecting.callsDaily).toBe(1);
    expect(campaigns[0].prospecting.connectionsDaily).toBe(1);
  });

  it("counts unique campaign contacts with calls on the same day", () => {
    const campaigns = buildCampaignSummaries({
      contacts: [
        {
          id: "contact-1",
          campaignName: PRIMARY_CAMPAIGN_CONTACT_VALUE,
          name: "Contato 1",
          lifecycleStage: "lead",
          leadStatus: "NEW",
        },
        {
          id: "contact-2",
          campaignName: PRIMARY_CAMPAIGN_CONTACT_VALUE,
          name: "Contato 2",
          lifecycleStage: "lead",
          leadStatus: "NEW",
        },
      ],
      activities: [
        {
          id: "call-1",
          campaignName: PRIMARY_CAMPAIGN_CONTACT_VALUE,
          kind: "call",
          contactIds: ["contact-1"],
          updatedAt: new Date().toISOString(),
        },
        {
          id: "call-2",
          campaignName: PRIMARY_CAMPAIGN_CONTACT_VALUE,
          kind: "call",
          contactIds: ["contact-1"],
          updatedAt: new Date().toISOString(),
        },
        {
          id: "call-3",
          campaignName: PRIMARY_CAMPAIGN_CONTACT_VALUE,
          kind: "call",
          contactIds: ["contact-2"],
          updatedAt: new Date().toISOString(),
        },
      ],
    });

    expect(campaigns).toHaveLength(1);
    expect(campaigns[0].prospecting.callsDaily).toBe(2);
    expect(campaigns[0].prospecting.connectionsDaily).toBe(3);
  });

  it("counts all call records for campaign contacts across the current week from sunday to sunday", () => {
    const now = new Date();
    const sunday = new Date(now);
    sunday.setHours(10, 0, 0, 0);
    sunday.setDate(now.getDate() - now.getDay());

    const monday = new Date(sunday);
    monday.setDate(sunday.getDate() + 1);

    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() + 6);

    const previousSaturday = new Date(sunday);
    previousSaturday.setDate(sunday.getDate() - 1);

    const campaigns = buildCampaignSummaries({
      contacts: [
        {
          id: "contact-week-1",
          campaignName: PRIMARY_CAMPAIGN_CONTACT_VALUE,
          name: "Contato Semana 1",
          lifecycleStage: "lead",
          leadStatus: "NEW",
        },
        {
          id: "contact-week-2",
          campaignName: PRIMARY_CAMPAIGN_CONTACT_VALUE,
          name: "Contato Semana 2",
          lifecycleStage: "lead",
          leadStatus: "NEW",
        },
      ],
      activities: [
        {
          id: "call-week-1",
          campaignName: PRIMARY_CAMPAIGN_CONTACT_VALUE,
          kind: "call",
          contactIds: ["contact-week-1"],
          updatedAt: sunday.toISOString(),
        },
        {
          id: "call-week-2",
          campaignName: PRIMARY_CAMPAIGN_CONTACT_VALUE,
          kind: "call",
          contactIds: ["contact-week-1"],
          updatedAt: monday.toISOString(),
        },
        {
          id: "call-week-3",
          campaignName: PRIMARY_CAMPAIGN_CONTACT_VALUE,
          kind: "call",
          contactIds: ["contact-week-2"],
          updatedAt: saturday.toISOString(),
        },
        {
          id: "call-outside-week",
          campaignName: PRIMARY_CAMPAIGN_CONTACT_VALUE,
          kind: "call",
          contactIds: ["contact-week-2"],
          updatedAt: previousSaturday.toISOString(),
        },
      ],
    });

    expect(campaigns).toHaveLength(1);
    expect(campaigns[0].prospecting.callsWeekly).toBe(3);
  });

  it("treats HubSpot qualified and disqualified custom statuses as popup rows", () => {
    const campaigns = buildCampaignSummaries({
      contacts: [
        {
          id: "contact-qualified",
          campaignName: PRIMARY_CAMPAIGN_CONTACT_VALUE,
          name: "Lead Qualificado",
          email: "qualificado@empresa.com",
          leadStatus: "Qualified",
          lifecycleStage: "Prospect",
        },
        {
          id: "contact-disqualified",
          campaignName: PRIMARY_CAMPAIGN_CONTACT_VALUE,
          name: "Lead Invalido",
          phone: "1111-9999",
          leadStatus: "UNQUALIFIED",
          lifecycleStage: "Desqualificado",
        },
      ],
    });

    expect(campaigns).toHaveLength(1);
    expect(campaigns[0].qualification.sqlCount).toBe(1);
    expect(campaigns[0].qualification.sqlLeadItems).toHaveLength(1);
    expect(campaigns[0].prospecting.disqualifiedNumbersCount).toBe(1);
    expect(campaigns[0].prospecting.disqualifiedNumberItems).toHaveLength(1);
  });

  it("accepts the HubSpot contact property value for the primary campaign", () => {
    const campaigns = buildCampaignSummaries({
      contacts: [
        {
          id: "contact-2026-1",
          campaignName: PRIMARY_CAMPAIGN_CONTACT_VALUE,
          name: "Lead Base",
          email: "lead@empresa.com",
          ownerName: "Ana",
          lifecycleStage: "lead",
          leadStatus: "NEW",
        },
        {
          id: "contact-2026-2",
          campaignName: PRIMARY_CAMPAIGN_CONTACT_VALUE,
          name: "Prospect Base",
          email: "prospect@empresa.com",
          ownerName: "Bruno",
          lifecycleStage: "Prospect",
          leadStatus: "OPEN",
        },
        {
          id: "contact-2026-3",
          campaignName: PRIMARY_CAMPAIGN_CONTACT_VALUE,
          lifecycleStage: "marketingqualifiedlead",
          leadStatus: "",
        },
        {
          id: "contact-2026-4",
          campaignName: PRIMARY_CAMPAIGN_CONTACT_VALUE,
          lifecycleStage: "salesqualifiedlead",
          leadStatus: "SQL",
        },
      ],
    });

    expect(campaigns).toHaveLength(1);
    expect(campaigns[0].name).toBe(PRIMARY_CAMPAIGN_CONTACT_VALUE);
    expect(campaigns[0].qualification.totalLeads).toBe(4);
    expect(campaigns[0].qualification.leadCount).toBe(1);
    expect(campaigns[0].qualification.prospectCount).toBe(1);
    expect(campaigns[0].qualification.leadItems[0]).toMatchObject({
      leadName: "Lead Base",
      detailLabel: "lead@empresa.com",
      statusLabel: "NEW",
    });
    expect(campaigns[0].qualification.prospectItems[0]).toMatchObject({
      leadName: "Prospect Base",
      detailLabel: "prospect@empresa.com",
      statusLabel: "OPEN",
    });
    expect(campaigns[0].qualification.mqlCount).toBe(1);
    expect(campaigns[0].qualification.sqlCount).toBe(1);
  });

  it("exposes the configured HubSpot segment lists for the primary campaign", () => {
    expect(getConfiguredCampaignSegmentListNames(PRIMARY_CAMPAIGN_CONTACT_VALUE)).toEqual(PRIMARY_CAMPAIGN_SEGMENT_LIST_NAMES);
    expect(getConfiguredCampaignSegmentListNames("Outra campanha")).toEqual([]);
  });

  it("tracks leads without call records for the overview card", () => {
    const campaigns = buildCampaignSummaries({
      contacts: [
        {
          id: "contact-sem-chamada",
          campaignName: PRIMARY_CAMPAIGN_CONTACT_VALUE,
          name: "Lead Sem Chamada",
          phone: "1111-1111",
          lifecycleStage: "lead",
          leadStatus: "NEW",
          ownerName: "Ana",
        },
        {
          id: "contact-com-chamada",
          campaignName: PRIMARY_CAMPAIGN_CONTACT_VALUE,
          name: "Lead Com Chamada",
          phone: "2222-2222",
          lifecycleStage: "lead",
          leadStatus: "NEW",
          ownerName: "Bruno",
        },
      ],
      activities: [
        {
          id: "call-1",
          campaignName: PRIMARY_CAMPAIGN_CONTACT_VALUE,
          kind: "call",
          contactIds: ["contact-com-chamada"],
          leadName: "Lead Com Chamada",
          updatedAt: new Date().toISOString(),
        },
      ],
    });

    expect(campaigns).toHaveLength(1);
    expect(campaigns[0].qualification.uncontactedLeadCount).toBe(1);
    expect(campaigns[0].qualification.uncontactedLeadItems).toHaveLength(1);
    expect(campaigns[0].qualification.uncontactedLeadItems[0]).toMatchObject({
      leadName: "Lead Sem Chamada",
      detailLabel: "1111-1111",
    });
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
          status: "SCHEDULED",
          statusLabel: "Agendada",
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
