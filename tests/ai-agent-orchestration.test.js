import { describe, expect, it } from "vitest";
import {
  buildNoraResponse,
  buildSpecialistAgentResponse,
  getMatchingSpecialistAgentIds,
  getSpecialistAgent,
} from "../lib/ai-agent-orchestration";

const dashboardData = {
  summary: {
    totalPipeline: 410000,
    wonThisMonth: 284000,
    stalledDeals: 3,
  },
  reports: [{ seller: "Ana" }, { seller: "Carlos" }],
  sellers: [
    {
      name: "Ana Souza",
      pipelineAmount: 184000,
      pipelineLabel: "R$ 184k",
      status: "Estavel",
      health: "Bom",
    },
  ],
  pipeline: {
    totalOpenDeals: 8,
    stages: [
      { label: "Oportunidade", totalAmount: 410000, totalLabel: "R$ 410k" },
      { label: "Proposta Enviada", totalAmount: 95000, totalLabel: "R$ 95k" },
    ],
  },
  tasks: [
    { id: "meeting-1", kind: "meeting", isCompleted: false, isOverdue: true, ownerName: "Ana Souza" },
    { id: "call-1", kind: "call", isCompleted: false, isOverdue: false, ownerName: "Ana Souza" },
    { id: "task-1", kind: "task", isCompleted: true, isOverdue: false, ownerName: "Carlos Lima" },
  ],
  integration: {
    status: "Sincronizado",
  },
};

describe("ai agent orchestration", () => {
  it("finds the relevant specialist for a focused prompt", () => {
    expect(getMatchingSpecialistAgentIds("Quais KPIs ficaram fora da meta?")).toEqual(["reports"]);
    expect(getMatchingSpecialistAgentIds("Quantas solicitacoes de acesso estao pendentes?")).toEqual(["access"]);
    expect(getMatchingSpecialistAgentIds("Quantas reunioes e chamadas estao pendentes hoje?")).toEqual(["tasks"]);
  });

  it("keeps the page specialist scoped and suggests NORA for cross-domain prompts", () => {
    const response = buildSpecialistAgentResponse(
      "reports",
      "Quais KPIs sairam da meta e quais negocios estao parados?",
      dashboardData,
    );

    expect(response.agent).toEqual(getSpecialistAgent("reports"));
    expect(response.consultedAgents).toEqual(["Especialista de Relatorios"]);
    expect(response.handoffToNora).toBe(true);
    expect(response.text).toContain("Especialista de Relatorios:");
    expect(response.text).toContain("vale acionar a NORA");
  });

  it("lets NORA consult more than one specialist when the question spans domains", () => {
    const response = buildNoraResponse(
      "Quais negocios estao parados e quem precisa de coaching imediato?",
      dashboardData,
      { requests: [] },
    );

    expect(response.consultedAgents).toEqual([
      "Especialista de Negocios",
      "Especialista de Vendedores",
    ]);
    expect(response.text).toContain("Consultei os agentes");
    expect(response.text).toContain("negocios abertos");
    expect(response.text).toContain("lidera a carteira atual");
  });

  it("lets NORA include access context when the user is a super admin", () => {
    const response = buildNoraResponse(
      "Existe gargalo na aprovacao de acessos?",
      dashboardData,
      {
        requests: [{ id: "req-1" }, { id: "req-2" }],
        sessionUser: { isSuperAdmin: true },
      },
    );

    expect(response.consultedAgents).toEqual(["Especialista de Permissoes"]);
    expect(response.text).toContain("Ha 2 solicitacao(oes) pendente(s) de aprovacao.");
  });

  it("builds a scoped summary for the tarefas specialist", () => {
    const response = buildSpecialistAgentResponse(
      "tasks",
      "Quem esta com mais reunioes pendentes?",
      dashboardData,
      {
        sessionUser: { role: "Supervisor" },
        tasks: dashboardData.tasks,
      },
    );

    expect(response.agent).toEqual(getSpecialistAgent("tasks"));
    expect(response.handoffToNora).toBe(false);
    expect(response.text).toContain("Especialista de Tarefas:");
    expect(response.text).toContain("2 tarefa(s) em aberto");
    expect(response.text).toContain("Ana Souza");
  });
});
