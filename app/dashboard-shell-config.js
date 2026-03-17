"use client";

import { hasMinimumRole } from "lib/role-access";

export const navItems = [
  { id: "reports", label: "Relatórios" },
  { id: "sellers", label: "Vendedores" },
  { id: "presales", label: "Pre-vendedores" },
  { id: "deals", label: "Negócios" },
  { id: "campaigns", label: "Campanhas" },
  { id: "tasks", label: "Tarefas" },
  { id: "access", label: "Permissões e Acessos" },
  { id: "settings", label: "Configurações" },
];

export const topMenuItems = ["Arquivo", "Editar", "Visualizar", "Ajuda"];

export const globalSearchIndex = [
  {
    id: "reports",
    label: "Relatórios",
    description: "KPIs comerciais, forecast e visão consolidada do time.",
    keywords: "kpi metricas metas forecast receita relatorio pipeline",
    route: "/relatorios",
  },
  {
    id: "sellers",
    label: "Vendedores",
    description: "Desempenho por vendedor e acompanhamento individual.",
    keywords: "vendedores equipe time performance coaching",
    route: "/vendedores",
  },
  {
    id: "presales",
    label: "Pre-vendedores",
    description: "Visão operacional da carteira do pré-vendedor, com contatos, conexões, qualificação e reuniões.",
    keywords: "pre vendedor pre-vendedor pre sales prospeccao conexao contato reuniao agenda qualificacao sdr",
    route: "/pre-vendedores",
  },
  {
    id: "deals",
    label: "Negócios",
    description: "Pipeline comercial com estágios e movimentação de deals.",
    keywords: "negocios oportunidades funil pipeline etapa card",
    route: "/negocios",
  },
  {
    id: "campaigns",
    label: "Campanhas",
    description: "Acompanhamento geral das campanhas, SDR, SQLs, reuniões e fechamentos vindos da HubSpot.",
    keywords: "campanhas campaign sdr prospeccao mql sql reunioes fechamento licitacao",
    route: "/campanhas",
  },
  {
    id: "tasks",
    label: "Tarefas",
    description: "Reuniões, chamadas e tarefas comerciais sincronizadas com a HubSpot por usuário.",
    keywords: "tarefas reunioes chamadas call meeting agenda hubspot follow-up vendedor",
    route: "/tarefas",
  },
  {
    id: "ai",
    label: "NORA",
    description: "Análise inteligente de todo o sistema com contexto operacional e perguntas guiadas.",
    keywords: "nora ia ai analise sistema risco insight diagnostico",
    route: "/ai-agent",
  },
  {
    id: "settings",
    label: "Configurações",
    description: "Integrações, notificações, personalização e preferências.",
    keywords: "configuracoes hubspot notificacoes preferencia conta",
    route: "/configuracoes",
  },
  {
    id: "profile",
    label: "Perfil",
    description: "Dados da conta, foto e acessos do usuário.",
    keywords: "perfil conta usuario acesso foto",
    route: "/perfil",
  },
  {
    id: "notifications",
    label: "Notificações",
    description: "Abrir painel de notificações e alertas recentes.",
    keywords: "notificacao alerta aviso",
    route: "",
  },
  {
    id: "access",
    label: "Permissões e Acessos",
    description: "Solicitações pendentes, aprovações e recusas para o super admin.",
    keywords: "permissoes acessos aprovacao primeiro acesso solicitar acesso admin",
    route: "/permissoes-e-acessos",
  },
];

export const accountSection = {
  id: "account",
  label: "Conta & Acesso",
  description: "Perfil, senha, 2FA e sessões ativas do usuário.",
};

export const configSections = [
  { id: "hubspot", label: "Integração HubSpot", description: "Status da conexão, chave, sync, mapeamento e log de erros.", minimumRole: "Supervisor" },
  { id: "notifications", label: "Notificações & Alertas", description: "Canais, thresholds, metas e resumos automáticos." },
  { id: "ai", label: "NORA & Diagnósticos", description: "Modelo ativo, voz, dados de contexto e sensibilidade diagnóstica da NORA.", minimumRole: "Supervisor" },
  { id: "personalize", label: "Personalizar", description: "Tema, fonte, escala, contraste e comportamento visual da interface." },
  { id: "exports", label: "Relatórios & Exportação", description: "Agendamento, formato, marca d'água e templates por cargo.", minimumRole: "Supervisor" },
  { id: "storage", label: "Gestão de Mídia & Storage", description: "Uso, retenção, STT, indexação e provedor com LGPD.", minimumRole: "Supervisor" },
  { id: "compliance", label: "Auditoria & Compliance", description: "Trilha imutável, masking visual e governança LGPD.", minimumRole: "Supervisor" },
];

export function getVisibleConfigSections(user) {
  return configSections.filter((section) => (
    !section.minimumRole || hasMinimumRole(user, section.minimumRole)
  ));
}

export function getResolvedConfigSection(activeConfig, user) {
  const visibleSections = getVisibleConfigSections(user);
  return visibleSections.find((section) => section.id === activeConfig) || visibleSections[0] || null;
}

export const permissionRows = [
  ["Admin", "Total"],
  ["Gerente", "Dashboards, sync e relatórios"],
  ["Supervisor", "Coaching e auditoria"],
  ["Vendedor", "Carteira própria"],
];

export const mappingRows = [
  ["deal_stage", "hs_pipeline_stage", "OK"],
  ["last_touch_at", "last_activity_date", "OK"],
  ["emotional_score", "custom_emotion_score", "Custom"],
];

export const reportRows = [
  ["Diretoria", "Resumo executivo", "PDF"],
  ["Gestor", "Pipeline por squad", "XLSX"],
  ["Supervisor", "Coaching", "PDF"],
];

export const queueRows = [
  ["reuniao-seg.mp3", "Em transcrição", "74%"],
  ["coaching-lucas.wav", "Indexado", "100%"],
  ["weekly-review.mp4", "Na fila", "12%"],
];

export const maskingRows = [
  ["Telefone", "✓", "✓", "✕"],
  ["Email pessoal", "✓", "✕", "✕"],
  ["Receita prevista", "✓", "✓", "✓"],
];

export const themeOptions = ["Claro ativo", "Escuro", "Automático"];
export const fontOptions = ["Manrope", "IBM Plex Sans", "Source Sans 3", "Montserrat", "Nunito Sans", "Work Sans"];
export const fontSizeOptions = ["Pequena", "Média", "Grande"];
export const densityOptions = ["Compacta", "Confortável", "Expandida"];
