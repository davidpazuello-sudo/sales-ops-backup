import { describe, expect, it } from "vitest";
import { buildPreSalesSummary } from "../lib/services/dashboard-presales";

const now = Date.now();
const tomorrow = new Date(now + 86400000).toISOString();
const yesterday = new Date(now - 86400000).toISOString();

describe("dashboard presales", () => {
  it("builds the pre-sales summary from contacts and related activities", () => {
    const summary = buildPreSalesSummary({
      ownerFilter: "Ana Souza",
      campaignName: "Aluno a Bordo 2026",
      contacts: [
        {
          id: "contact-1",
          name: "Secretaria Aurora",
          ownerName: "Ana Souza",
          ownerEmail: "ana@empresa.com",
          leadStatus: "Qualified",
          lifecycleStage: "Prospect",
          phone: "69999999999",
          email: "aurora@cidade.gov.br",
          dealIds: ["deal-1"],
          updatedAt: tomorrow,
          campaignName: "Aluno a Bordo 2026",
        },
        {
          id: "contact-2",
          name: "Secretaria Boreal",
          ownerName: "Ana Souza",
          ownerEmail: "ana@empresa.com",
          leadStatus: "Open",
          lifecycleStage: "Lead",
          phone: "68888888888",
          email: "boreal@cidade.gov.br",
          dealIds: [],
          updatedAt: yesterday,
          campaignName: "Aluno a Bordo 2026",
        },
        {
          id: "contact-3",
          name: "Contato de outro dono",
          ownerName: "Bruno Lima",
          ownerEmail: "bruno@empresa.com",
          leadStatus: "Qualified",
          lifecycleStage: "Prospect",
          dealIds: [],
          campaignName: "Outra campanha",
        },
      ],
      deals: [
        {
          id: "deal-1",
          contactIds: ["contact-1"],
          campaignName: "Aluno a Bordo 2026",
        },
      ],
      activities: [
        {
          id: "call-1",
          kind: "call",
          contactIds: ["contact-1"],
          dealIds: [],
          isCompleted: true,
          isOverdue: false,
          dueAt: yesterday,
          dueLabel: "15/03/2026 10:00",
          title: "Ligar para Aurora",
          leadName: "Secretaria Aurora",
          ownerName: "Ana Souza",
          status: "COMPLETED",
          statusLabel: "Concluida",
        },
        {
          id: "meeting-1",
          kind: "meeting",
          contactIds: ["contact-1"],
          dealIds: ["deal-1"],
          isCompleted: false,
          isOverdue: false,
          dueAt: tomorrow,
          dueLabel: "17/03/2026 09:00",
          title: "Reuniao com Aurora",
          leadName: "Secretaria Aurora",
          ownerName: "Ana Souza",
          status: "SCHEDULED",
          statusLabel: "Agendada",
        },
        {
          id: "meeting-2",
          kind: "meeting",
          contactIds: ["contact-1"],
          dealIds: ["deal-1"],
          isCompleted: true,
          isOverdue: false,
          dueAt: yesterday,
          dueLabel: "14/03/2026 14:00",
          title: "Reuniao realizada",
          leadName: "Secretaria Aurora",
          ownerName: "Ana Souza",
          status: "COMPLETED",
          statusLabel: "Concluida",
        },
        {
          id: "meeting-3",
          kind: "meeting",
          contactIds: ["contact-1"],
          dealIds: ["deal-1"],
          isCompleted: true,
          isOverdue: false,
          dueAt: yesterday,
          dueLabel: "13/03/2026 11:00",
          title: "Reuniao sem comparecimento",
          leadName: "Secretaria Aurora",
          ownerName: "Ana Souza",
          status: "NO_SHOW",
          statusLabel: "Nao compareceu",
        },
      ],
    });

    expect(summary.metrics).toMatchObject({
      totalContacts: 2,
      contactsWithoutConnection: 1,
      qualifiedContacts: 1,
      totalCalls: 1,
      averageCallsPerContact: "0,5",
      totalConnections: 1,
      activitiesDone: 3,
      activitiesOpen: 1,
      scheduledMeetings: 1,
      completedMeetings: 1,
      meetingsToReschedule: 1,
      opportunitiesWithDeals: 1,
    });
    expect(summary.details.totalContacts).toHaveLength(2);
    expect(summary.details.totalCalls).toHaveLength(1);
    expect(summary.details.opportunitiesWithDeals).toHaveLength(1);
    expect(summary.details.averageCallsPerContact[0].cells[2]).toBe("1 chamada(s)");
    expect(summary.lists.contactsWithoutConnection[0].title).toBe("Secretaria Boreal");
    expect(summary.lists.meetingsToReschedule[0].status).toBe("Nao compareceu");
  });
});
