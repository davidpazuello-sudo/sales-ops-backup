"use client";

export const navItems = [
  { id: "reports", label: "Relatórios" },
  { id: "sellers", label: "Vendedores" },
  { id: "deals", label: "Negócios" },
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
    id: "deals",
    label: "Negócios",
    description: "Pipeline comercial com estágios e movimentação de deals.",
    keywords: "negocios oportunidades funil pipeline etapa card",
    route: "/negocios",
  },
  {
    id: "ai",
    label: "Agente de IA",
    description: "Análise inteligente e perguntas sobre dados do sistema.",
    keywords: "ia ai agente pergunta analise risco insight",
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
  description: "Perfil, senha, 2FA, sessões ativas e permissões por cargo.",
};

export const configSections = [
  { id: "hubspot", label: "Integração HubSpot", description: "Status da conexão, chave, sync, mapeamento e log de erros." },
  { id: "notifications", label: "Notificações & Alertas", description: "Canais, thresholds, metas e resumos automáticos." },
  { id: "ai", label: "IA & Diagnósticos", description: "Modelo ativo, voz, dados de contexto e sensibilidade diagnóstica." },
  { id: "personalize", label: "Personalizar", description: "Tema, fonte, escala, contraste e comportamento visual da interface." },
  { id: "exports", label: "Relatórios & Exportação", description: "Agendamento, formato, marca d'água e templates por cargo." },
  { id: "storage", label: "Gestão de Mídia & Storage", description: "Uso, retenção, STT, indexação e provedor com LGPD." },
  { id: "compliance", label: "Auditoria & Compliance", description: "Trilha imutável, masking visual e governança LGPD." },
];

export const permissionRows = [
  ["Admin", "Total"],
  ["Gestor", "Dashboards, sync e relatórios"],
  ["Supervisor", "Coaching e auditoria"],
  ["Vendedor", "Carteira própria"],
];

export const mappingRows = [
  ["deal_stage", "hs_pipeline_stage", "OK"],
  ["last_touch_at", "last_activity_date", "OK"],
  ["emotional_score", "custom_emotion_score", "Custom"],
];

export const errorRows = [
  ["09:42", "Rate limit no lote 18", "Médio"],
  ["08:15", "owner_id sem correspondência", "Alto"],
];

export const metricRows = [
  ["Estagnação", "36h", "alerta por negócio parado"],
  ["Meta", "92%", "gatilho para resumo semanal"],
  ["Resumo", "18:30", "envio automático diário"],
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

export const auditRows = [
  ["Ana Souza", "Alterou permissão do cargo Gestor", "Hoje, 10:14"],
  ["Sistema", "Executou sync completo com HubSpot", "Hoje, 09:00"],
  ["Carlos Lima", "Exportou relatório consolidado", "Ontem, 18:42"],
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
