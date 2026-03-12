"use client";

import {
  buildTaskSummary,
  canViewTeamTasks,
  getVisibleTasks,
} from "./services/dashboard-tasks";

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export const specialistAgents = {
  reports: {
    id: "reports",
    name: "Especialista de Relatorios",
    pageLabel: "Relatorios",
    panelTitle: "Especialista de Relatorios",
    scope: "KPIs, metas, forecast, pipeline consolidado e leitura executiva.",
    placeholder: "Pergunte sobre KPIs, forecast, metas ou anomalias dos relatorios...",
    prompts: [
      "Quais KPIs ficaram fora da meta?",
      "Onde o pipeline aberto esta mais concentrado?",
      "Existe risco no forecast deste mes?",
    ],
    keywords: ["relatorio", "kpi", "meta", "forecast", "receita", "indicador", "pipeline", "won"],
  },
  deals: {
    id: "deals",
    name: "Especialista de Negocios",
    pageLabel: "Negocios",
    panelTitle: "Especialista de Negocios",
    scope: "Pipeline, estagios, risco de estagnacao, proximos passos e movimentacao de deals.",
    placeholder: "Pergunte sobre etapas, negocios parados, risco de perda ou proximos passos...",
    prompts: [
      "Quais negocios estao parados?",
      "Qual etapa concentra mais valor agora?",
      "Onde o risco de perda parece maior?",
    ],
    keywords: ["negocio", "negocios", "deal", "pipeline", "etapa", "estagn", "proposta", "fechado", "perdido"],
  },
  sellers: {
    id: "sellers",
    name: "Especialista de Vendedores",
    pageLabel: "Vendedores",
    panelTitle: "Especialista de Vendedores",
    scope: "Desempenho por vendedor, coaching, produtividade, ritmo e carteira.",
    placeholder: "Pergunte sobre performance, coaching, ritmo comercial ou carteira...",
    prompts: [
      "Quem precisa de coaching imediato?",
      "Qual vendedor tem a melhor conversao?",
      "Onde a produtividade caiu nesta semana?",
    ],
    keywords: ["vendedor", "vendedores", "coaching", "time", "squad", "performance", "produtividade", "carteira"],
  },
  tasks: {
    id: "tasks",
    name: "Especialista de Tarefas",
    pageLabel: "Tarefas",
    panelTitle: "Especialista de Tarefas",
    scope: "Reunioes, chamadas, follow-ups e execucao comercial ligada ao usuario na HubSpot.",
    placeholder: "Pergunte sobre reunioes, chamadas, follow-ups ou carga de tarefas por vendedor...",
    prompts: [
      "Quantas tarefas estao em aberto agora?",
      "Quem esta com mais reunioes pendentes?",
      "Existe atraso nas chamadas do time?",
    ],
    keywords: ["tarefa", "tarefas", "reuniao", "reunioes", "chamada", "chamadas", "call", "meeting", "agenda", "follow-up"],
  },
  campaigns: {
    id: "campaigns",
    name: "Especialista de Campanhas",
    pageLabel: "Campanhas",
    panelTitle: "Especialista de Campanhas",
    scope: "SDR, MQL, SQL, reunioes, propostas, fechamento e metas SMART por campanha.",
    placeholder: "Pergunte sobre prospeccao, SQLs, reunioes, propostas ou fechamento por campanha...",
    prompts: [
      "Qual campanha esta mais perto da meta de SQL?",
      "Onde a conversao de proposta para fechamento esta mais baixa?",
      "Qual campanha esta alimentando melhor o topo do funil?",
    ],
    keywords: ["campanha", "campanhas", "mql", "sql", "sdr", "prospeccao", "fechamento", "licitacao"],
  },
  access: {
    id: "access",
    name: "Especialista de Permissoes",
    pageLabel: "Permissoes e Acessos",
    panelTitle: "Especialista de Permissoes",
    scope: "Solicitacoes de acesso, aprovacoes, perfis, cargos e governanca de entrada.",
    placeholder: "Pergunte sobre fila de aprovacao, cargos, primeiro acesso ou permissoes...",
    prompts: [
      "Quantas solicitacoes estao pendentes?",
      "Qual cargo recebe acesso total?",
      "Existe gargalo na aprovacao de acessos?",
    ],
    keywords: ["permissao", "permissoes", "acesso", "aprovacao", "cargo", "admin", "primeiro acesso", "solicitacao"],
  },
  settings: {
    id: "settings",
    name: "Especialista de Configuracoes",
    pageLabel: "Configuracoes",
    panelTitle: "Especialista de Configuracoes",
    scope: "Integracoes, preferencias, notificacoes, exports e governanca da plataforma.",
    placeholder: "Pergunte sobre configuracoes, integracoes, notificacoes ou preferencias...",
    prompts: [
      "O HubSpot esta sincronizado corretamente?",
      "Quais canais de notificacao estao ativos?",
      "Como estao as preferencias da plataforma?",
    ],
    keywords: ["configuracao", "configuracoes", "hubspot", "notificacao", "preferencia", "exportacao", "storage", "compliance"],
  },
  profile: {
    id: "profile",
    name: "Especialista de Perfil",
    pageLabel: "Perfil",
    panelTitle: "Especialista de Perfil",
    scope: "Conta, 2FA, sessoes, identidade do usuario e acesso individual.",
    placeholder: "Pergunte sobre conta, 2FA, sessoes ativas ou acesso individual...",
    prompts: [
      "Como esta a seguranca da minha conta?",
      "O 2FA esta ativo?",
      "Quantas sessoes ativas existem agora?",
    ],
    keywords: ["perfil", "conta", "2fa", "senha", "sessao", "usuario", "acesso individual"],
  },
};

export function getSpecialistAgent(agentId) {
  return specialistAgents[agentId] || specialistAgents.reports;
}

export function getMatchingSpecialistAgentIds(question) {
  const normalizedQuestion = normalizeText(question);
  if (!normalizedQuestion) {
    return ["reports"];
  }

  const matches = Object.values(specialistAgents)
    .filter((agent) => agent.keywords.some((keyword) => normalizedQuestion.includes(keyword)))
    .map((agent) => agent.id);

  return matches.length ? [...new Set(matches)] : ["reports"];
}

function buildReportsSummary(dashboardData) {
  const totalPipeline = dashboardData?.summary?.totalPipeline || 0;
  const wonThisMonth = dashboardData?.summary?.wonThisMonth || 0;
  const stalledDeals = dashboardData?.summary?.stalledDeals || 0;
  const sellersCount = dashboardData?.reports?.length || 0;

  return `Pipeline aberto em R$ ${Math.round(totalPipeline / 1000)}k, won no mes em R$ ${Math.round(wonThisMonth / 1000)}k, ${stalledDeals} negocios parados e ${sellersCount} vendedores no resumo executivo.`;
}

function buildDealsSummary(dashboardData) {
  const stages = dashboardData?.pipeline?.stages || [];
  const topStage = [...stages].sort((a, b) => (b.totalAmount || 0) - (a.totalAmount || 0))[0];
  const stalledDeals = dashboardData?.summary?.stalledDeals || 0;
  const openDeals = dashboardData?.pipeline?.totalOpenDeals || 0;

  if (!topStage) {
    return `Nao encontrei etapas consolidadas agora, mas o quadro de negocios segue sendo o ponto certo para monitorar ${openDeals} negocios abertos e ${stalledDeals} itens parados.`;
  }

  return `A etapa com maior concentracao de valor e "${topStage.label}" com ${topStage.totalLabel || "valor nao informado"}. Hoje existem ${openDeals} negocios abertos e ${stalledDeals} com risco de estagnacao.`;
}

function buildSellersSummary(dashboardData) {
  const sellers = dashboardData?.sellers || [];
  const topSeller = [...sellers].sort((a, b) => (b.pipelineAmount || 0) - (a.pipelineAmount || 0))[0];

  if (!topSeller) {
    return "Ainda nao ha vendedores suficientes sincronizados para uma leitura confiavel.";
  }

  return `${topSeller.name} lidera a carteira atual com ${topSeller.pipelineLabel || topSeller.compactPipeline || "pipeline relevante"}, status ${topSeller.status || "em acompanhamento"} e saude ${topSeller.health || "sem classificacao"}.`;
}

function buildCampaignsSummary(dashboardData, context) {
  const campaigns = Array.isArray(dashboardData?.campaigns) ? dashboardData.campaigns : [];
  const selectedCampaignId = context?.campaignId || "";
  const selectedCampaign = campaigns.find((campaign) => campaign.id === selectedCampaignId) || campaigns[0];

  if (!selectedCampaign) {
    return "Ainda nao encontrei campanhas suficientes vindas da HubSpot para montar um acompanhamento confiavel.";
  }

  return `${selectedCampaign.name}: ${selectedCampaign.qualification.sqlCount} SQLs, ${selectedCampaign.meetingCount} reunioes, ${selectedCampaign.sales.closedWonCount} fechamentos e conversao de proposta em fechamento de ${selectedCampaign.sales.conversionRate}%.`;
}

function buildTasksSummary(dashboardData, context) {
  const fallbackTasks = Array.isArray(dashboardData?.tasks) ? dashboardData.tasks : [];
  const sessionUser = context?.sessionUser || {};
  const tasks = Array.isArray(context?.tasks)
    ? context.tasks
    : getVisibleTasks(fallbackTasks, sessionUser, {
      ownerFilter: context?.ownerFilter || "todos",
      typeFilter: context?.typeFilter || "todos",
      statusFilter: context?.statusFilter || "pending",
    });

  if (!tasks.length) {
    return canViewTeamTasks(sessionUser)
      ? "Nao encontrei tarefas visiveis neste recorte. Vale revisar filtros de vendedor, tipo e status."
      : "Nao encontrei tarefas ligadas ao seu usuario neste recorte da HubSpot.";
  }

  const summary = buildTaskSummary(tasks);
  const teamAccess = canViewTeamTasks(sessionUser);
  const ownerLoad = tasks.reduce((accumulator, task) => {
    const ownerName = task.ownerName || "Sem responsavel";
    accumulator[ownerName] = (accumulator[ownerName] || 0) + (task.isCompleted ? 0 : 1);
    return accumulator;
  }, {});
  const topOwner = Object.entries(ownerLoad)
    .sort((left, right) => right[1] - left[1])[0];

  let text = `Encontrei ${summary.open} tarefa(s) em aberto, ${summary.overdue} atrasada(s), ${summary.meetings} reuniao(oes), ${summary.calls} chamada(s) e ${summary.other} outra(s) tarefa(s).`;

  if (teamAccess && topOwner?.[0]) {
    text += ` Hoje a maior carga aberta esta com ${topOwner[0]} (${topOwner[1]} item(ns)).`;
  }

  return text;
}

function buildAccessSummary(context) {
  const pendingRequests = Array.isArray(context?.requests) ? context.requests.length : 0;

  if (!pendingRequests) {
    return "Nao existem solicitacoes pendentes agora. A governanca de acesso esta estabilizada neste momento.";
  }

  return `Ha ${pendingRequests} solicitacao(oes) pendente(s) de aprovacao. O foco desta pagina e controlar fila de acesso, primeiro acesso e permissoes por cargo.`;
}

function buildSettingsSummary(context, dashboardData) {
  const section = context?.section || "hubspot";
  const hubspotStatus = dashboardData?.integration?.status || "Sem status";
  return `Estou olhando a area de ${section}. O estado atual de integracao principal e "${hubspotStatus}", e este especialista deve responder apenas sobre configuracoes e governanca da plataforma.`;
}

function buildProfileSummary(context) {
  const sessionUser = context?.sessionUser || {};
  const twoFactorLabel = sessionUser?.twoFactorEnabled ? "2FA ativo" : "2FA nao configurado";
  return `Perfil atual: ${sessionUser?.name || "Usuario"}, cargo ${sessionUser?.role || "nao informado"}, com ${twoFactorLabel}. Este especialista fica restrito a conta, seguranca e sessoes.`;
}

function buildScopedSpecialistResponse(agentId, question, dashboardData, context = {}) {
  if (agentId === "reports") {
    return buildReportsSummary(dashboardData);
  }

  if (agentId === "deals") {
    return buildDealsSummary(dashboardData);
  }

  if (agentId === "sellers") {
    return buildSellersSummary(dashboardData);
  }

  if (agentId === "tasks") {
    return buildTasksSummary(dashboardData, context);
  }

  if (agentId === "campaigns") {
    return buildCampaignsSummary(dashboardData, context);
  }

  if (agentId === "access") {
    return buildAccessSummary(context);
  }

  if (agentId === "profile") {
    return buildProfileSummary(context);
  }

  return buildSettingsSummary(context, dashboardData);
}

export function buildSpecialistAgentResponse(agentId, question, dashboardData, context = {}) {
  const agent = getSpecialistAgent(agentId);
  const matchedAgents = getMatchingSpecialistAgentIds(question);
  const offTopicAgents = matchedAgents.filter((item) => item !== agentId);
  const scopedSummary = buildScopedSpecialistResponse(agentId, question, dashboardData, context);

  let text = `${agent.name}: ${scopedSummary}`;

  if (offTopicAgents.length) {
    const handoffNames = offTopicAgents.map((item) => getSpecialistAgent(item).name).join(", ");
    text += ` Mantive a resposta restrita a ${agent.pageLabel}. Para cruzar com ${handoffNames}, vale acionar a NORA.`;
  }

  return {
    agent,
    consultedAgents: [agent.name],
    handoffToNora: offTopicAgents.length > 0,
    text,
  };
}

export function buildNoraResponse(question, dashboardData, context = {}) {
  const matchedAgentIds = getMatchingSpecialistAgentIds(question);
  const consultedAgents = matchedAgentIds.map((agentId) => getSpecialistAgent(agentId).name);
  const scopedSummaries = matchedAgentIds.map((agentId) => buildScopedSpecialistResponse(agentId, question, dashboardData, context));

  const intro = consultedAgents.length > 1
    ? `Consultei os agentes ${consultedAgents.join(", ")}.`
    : `Consultei o ${consultedAgents[0]}.`;

  return {
    consultedAgents,
    text: `${intro} ${scopedSummaries.join(" ")}`,
  };
}
