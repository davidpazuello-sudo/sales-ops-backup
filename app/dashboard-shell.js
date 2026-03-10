"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

const STORAGE_KEY = "sales-ops-backup-personalization";
const PROFILE_PHOTO_KEY = "sales-ops-backup-profile-photo";

const navItems = [
  { id: "reports", label: "Relatórios" },
  { id: "sellers", label: "Vendedores" },
  { id: "deals", label: "Negócios" },
  { id: "settings", label: "Configurações" },
];

const topMenuItems = ["Arquivo", "Editar", "Visualizar", "Ajuda"];

const navShortcuts = {
  reports: "R",
  sellers: "V",
  deals: "N",
  settings: "S",
};

const configShortcuts = {
  hubspot: "H",
  notifications: "A",
  ai: "I",
  personalize: "P",
  exports: "E",
  storage: "M",
  compliance: "C",
};

const globalSearchIndex = [
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
];

const accountSection = {
  id: "account",
  label: "Conta & Acesso",
  description: "Perfil, senha, 2FA, sessões ativas e permissões por cargo.",
};

const configSections = [
  { id: "hubspot", label: "Integração HubSpot", description: "Status da conexão, chave, sync, mapeamento e log de erros." },
  { id: "notifications", label: "Notificações & Alertas", description: "Canais, thresholds, metas e resumos automáticos." },
  { id: "ai", label: "IA & Diagnósticos", description: "Modelo ativo, voz, dados de contexto e sensibilidade diagnóstica." },
  { id: "personalize", label: "Personalizar", description: "Tema, fonte, escala, contraste e comportamento visual da interface." },
  { id: "exports", label: "Relatórios & Exportação", description: "Agendamento, formato, marca d'água e templates por cargo." },
  { id: "storage", label: "Gestão de Mídia & Storage", description: "Uso, retenção, STT, indexação e provedor com LGPD." },
  { id: "compliance", label: "Auditoria & Compliance", description: "Trilha imutável, masking visual e governança LGPD." },
];

const permissionRows = [
  ["Admin", "Total"],
  ["Gestor", "Dashboards, sync e relatórios"],
  ["Supervisor", "Coaching e auditoria"],
  ["Vendedor", "Carteira própria"],
];

const mappingRows = [
  ["deal_stage", "hs_pipeline_stage", "OK"],
  ["last_touch_at", "last_activity_date", "OK"],
  ["emotional_score", "custom_emotion_score", "Custom"],
];

const errorRows = [
  ["09:42", "Rate limit no lote 18", "Médio"],
  ["08:15", "owner_id sem correspondência", "Alto"],
];

const metricRows = [
  ["Estagnação", "36h", "alerta por negócio parado"],
  ["Meta", "92%", "gatilho para resumo semanal"],
  ["Resumo", "18:30", "envio automático diário"],
];

const reportRows = [
  ["Diretoria", "Resumo executivo", "PDF"],
  ["Gestor", "Pipeline por squad", "XLSX"],
  ["Supervisor", "Coaching", "PDF"],
];

const queueRows = [
  ["reuniao-seg.mp3", "Em transcrição", "74%"],
  ["coaching-lucas.wav", "Indexado", "100%"],
  ["weekly-review.mp4", "Na fila", "12%"],
];

const auditRows = [
  ["Ana Souza", "Alterou permissão do cargo Gestor", "Hoje, 10:14"],
  ["Sistema", "Executou sync completo com HubSpot", "Hoje, 09:00"],
  ["Carlos Lima", "Exportou relatório consolidado", "Ontem, 18:42"],
];

const maskingRows = [
  ["Telefone", "✓", "✓", "✕"],
  ["Email pessoal", "✓", "✕", "✕"],
  ["Receita prevista", "✓", "✓", "✓"],
];

const sellerSummary = [
  ["Vendedores ativos", "18", "3 em rampa neste mes"],
  ["Meta do time", "94%", "Ritmo acima da semana anterior"],
  ["Risco de churn", "4 contas", "Exigem contato em ate 24h"],
];

const sellerPerformanceRows = [
  ["Ana Souza", "118%", "R$ 184k", "9/10", "Estavel"],
  ["Carlos Lima", "103%", "R$ 161k", "8/10", "Aquecendo"],
  ["Marina Costa", "97%", "R$ 149k", "7/10", "Atencao"],
  ["Lucas Prado", "88%", "R$ 126k", "6/10", "Coaching"],
];

const sellerAttentionRows = [
  ["Lucas Prado", "3 negocios sem touch ha 5 dias", "Alta"],
  ["Marina Costa", "Conversao caiu 12% na semana", "Media"],
  ["Bruno Melo", "Forecast sem proximo passo definido", "Alta"],
];

const notificationItems = [
  {
    id: "1",
    title: "Joseph Israel tornou voce o Prospectante do contrato JN Corte - Manaus (AM).",
    tag: "Marcos Nakahara",
    age: "12d",
    read: false,
    trash: false,
  },
  {
    id: "2",
    title: "Voce foi atribuido a tarefa \"Preencher propriedade de aprovacao\".",
    tag: "",
    age: "14d",
    read: false,
    trash: false,
  },
  {
    id: "3",
    title: "Tabela de preco do negocio Nautilus Sports foi aceita pelo cliente.",
    tag: "Equipe Comercial",
    age: "2d",
    read: true,
    trash: false,
  },
];

const sellerAgendaRows = [
  ["1:1 de coaching", "Hoje, 15:00", "Lucas Prado"],
  ["Revisao de forecast", "Hoje, 17:30", "Squad Enterprise"],
  ["Treinamento de objecoes", "Amanha, 09:00", "Time Inside Sales"],
];

const sellerProfiles = [
  {
    name: "Ana Souza",
    role: "Enterprise",
    initials: "AS",
    performance: "118%",
    pipeline: "R$ 184k",
    status: "Estavel",
    note: "Melhor ritmo de fechamento do time nas ultimas 2 semanas.",
  },
  {
    name: "Carlos Lima",
    role: "Mid-market",
    initials: "CL",
    performance: "103%",
    pipeline: "R$ 161k",
    status: "Aquecendo",
    note: "Bom volume de reunioes e forecast consistente.",
  },
  {
    name: "Marina Costa",
    role: "SMB",
    initials: "MC",
    performance: "97%",
    pipeline: "R$ 149k",
    status: "Atencao",
    note: "Conversao caiu na semana e precisa reforco de follow-up.",
  },
  {
    name: "Lucas Prado",
    role: "Inside Sales",
    initials: "LP",
    performance: "88%",
    pipeline: "R$ 126k",
    status: "Coaching",
    note: "Tem boas oportunidades, mas com baixo ritmo de proximo passo.",
  },
];

const defaultDashboardData = {
  configured: false,
  integration: {
    status: "Aguardando token",
    owners: sellerProfiles.length,
    deals: sellerPerformanceRows.length,
    pipelineAmount: 620000,
  },
  summary: {
    sellersActive: 18,
    totalPipeline: 620000,
    wonThisMonth: 284000,
    stalledDeals: 4,
  },
  sellers: sellerProfiles.map((seller, index) => ({
    id: `${index + 1}`,
    name: seller.name,
    email: "",
    team: seller.role,
    initials: seller.initials,
    openDeals: 4 - (index % 2),
    wonDeals: 2 + (index % 2),
    stalledDeals: index > 1 ? 1 : 0,
    pipelineAmount: Number(String(seller.pipeline).replace(/[^\d]/g, "")) * 1000 || 0,
    pipelineLabel: seller.pipeline,
    compactPipeline: seller.pipeline,
    metaPercent: Number.parseInt(seller.performance, 10) || 0,
    health: "8/10",
    status: seller.status,
    note: seller.note,
  })),
  alerts: sellerAttentionRows,
  deals: [
    { id: "1", name: "Expansao Conta Solaris", owner: "Ana Souza", stage: "Proposal", amountLabel: "R$ 95.000", staleLabel: "2d sem touch" },
    { id: "2", name: "Renovacao Grupo Prisma", owner: "Carlos Lima", stage: "Negotiation", amountLabel: "R$ 78.000", staleLabel: "4d sem touch" },
    { id: "3", name: "Piloto Atlas", owner: "Marina Costa", stage: "Discovery", amountLabel: "R$ 41.000", staleLabel: "6d sem touch" },
  ],
  reports: sellerPerformanceRows.map((row) => [row[0], row[1], row[2], row[4]]),
};

const themeOptions = ["Claro ativo", "Escuro", "Automático"];
const fontOptions = ["Manrope", "IBM Plex Sans", "Source Sans 3", "Montserrat", "Nunito Sans", "Work Sans"];
const fontSizeOptions = ["Pequena", "Média", "Grande"];
const densityOptions = ["Compacta", "Confortável", "Expandida"];

const personalizationDefaults = {
  theme: "Claro ativo",
  font: "Manrope",
  fontSize: "Média",
  density: "Confortável",
  highContrast: false,
  animations: true,
  collapseSidebarOnOpen: false,
  reinforcedCards: false,
  showShortcuts: true,
  instantPreview: true,
};

const personalizationToggles = [
  { id: "highContrast", label: "Contraste elevado", description: "Melhora a legibilidade de textos e bordas." },
  { id: "animations", label: "Animações sutis", description: "Liga ou reduz transições visuais do painel." },
  { id: "collapseSidebarOnOpen", label: "Sidebar recolhida ao abrir", description: "Inicia a navegação lateral recolhida." },
  { id: "reinforcedCards", label: "Cards com borda reforçada", description: "Dá mais destaque visual aos containers." },
  { id: "showShortcuts", label: "Mostrar atalhos de teclado", description: "Exibe dicas curtas de navegação quando disponíveis." },
  { id: "instantPreview", label: "Prévia instantânea", description: "Aplica as alterações assim que você seleciona." },
];

function sellerToSlug(name) {
  return String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function dealToSlug(deal) {
  return `${sellerToSlug(deal?.name)}-${deal?.id}`;
}

function findDealByRouteId(deals, routeId) {
  const normalizedRoute = String(routeId || "").toLowerCase();
  return deals.find((deal) => {
    if (String(deal.id).toLowerCase() === normalizedRoute) return true;
    if (sellerToSlug(deal.name) === normalizedRoute) return true;
    return dealToSlug(deal) === normalizedRoute;
  });
}

function meetingToSlug(title) {
  return sellerToSlug(title);
}

function getInternalMeetingsForSeller(seller) {
  if (!seller) {
    return [];
  }

  const sellerSlug = sellerToSlug(seller.name);

  return [
    {
      id: `${sellerSlug}-weekly-forecast`,
      title: "Weekly forecast comercial",
      date: "09 Mar 2026",
      time: "09:00",
      type: "Ritual semanal",
      owner: "Lider comercial",
      summary: "Revisao de forecast, riscos por conta e definicao de proximos passos no HubSpot.",
      audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      audioLabel: "Audio da reuniao semanal",
      notes: [
        "Alinhar prioridades da semana com foco em propostas abertas.",
        "Revisar contas sem atividade acima do SLA.",
        "Atualizar comprometimento de receita no HubSpot.",
      ],
    },
    {
      id: `${sellerSlug}-coaching-1-1`,
      title: "Coaching 1:1",
      date: "11 Mar 2026",
      time: "15:00",
      type: "Coaching",
      owner: "Supervisor",
      summary: "Checkpoint individual sobre conversao, postura comercial e execucao do pipeline.",
      audioUrl: "",
      audioLabel: "",
      notes: [
        "Revisar postura em discovery e qualificacao.",
        "Mapear objecoes recorrentes nas ultimas oportunidades.",
        "Definir um plano curto de melhoria para a semana.",
      ],
    },
    {
      id: `${sellerSlug}-retrospectiva-pipeline`,
      title: "Retrospectiva de pipeline",
      date: "14 Mar 2026",
      time: "17:30",
      type: "Operacao",
      owner: "Sales Ops",
      summary: "Analise de gargalos operacionais, tempos de etapa e consistencia de atualizacao na HubSpot.",
      audioUrl: "",
      audioLabel: "",
      notes: [
        "Verificar tempo medio por etapa.",
        "Conferir campos obrigatorios pendentes.",
        "Padronizar proximo passo em todos os negocios ativos.",
      ],
    },
  ];
}

function MenuIcon() {
  return <div className={styles.hamburger} aria-hidden="true"><span /><span /><span /></div>;
}

function PanelsIcon() {
  return <span className={styles.panelsIcon} aria-hidden="true" />;
}

function SimpleArrow({ right = false }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={right ? "M9.5 6.5L15 12l-5.5 5.5" : "M14.5 6.5L9 12l5.5 5.5"} />
    </svg>
  );
}

function ChevronSmallIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14 7V5.8A1.8 1.8 0 0 0 12.2 4H6.8A1.8 1.8 0 0 0 5 5.8v12.4A1.8 1.8 0 0 0 6.8 20h5.4a1.8 1.8 0 0 0 1.8-1.8V17" />
      <path d="M10 12h9" />
      <path d="M16 8l4 4-4 4" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3l1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7z" />
      <path d="M18.5 3.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" />
      <path d="M5.5 15.5l.9 2.2 2.2.9-2.2.9-.9 2.2-.9-2.2-2.2-.9 2.2-.9z" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 10a5 5 0 1 1 10 0c0 4.5 2 6 2 6H5s2-1 2-6" />
      <path d="M10 18a2 2 0 0 0 4 0" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.2 4.2" />
    </svg>
  );
}

function MeetingIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 4v3" />
      <path d="M17 4v3" />
      <rect x="4" y="6.5" width="16" height="13.5" rx="2" />
      <path d="M4 10h16" />
      <path d="M8 14h3" />
      <path d="M13 14h3" />
    </svg>
  );
}

function BaseIcon({ children }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true">{children}</svg>;
}

function getNavIcon(id) {
  if (id === "reports") return <BaseIcon><path d="M6 18V11" /><path d="M11 18V7" /><path d="M16 18V13" /></BaseIcon>;
  if (id === "sellers") return <BaseIcon><circle cx="9" cy="8" r="3" /><path d="M4 17c0-2.4 2.2-4.3 5-4.3s5 1.9 5 4.3" /><circle cx="17" cy="9" r="2.3" /><path d="M14.6 16.2c.6-1.5 2-2.5 3.7-2.5.8 0 1.5.2 2.1.5" /></BaseIcon>;
  if (id === "deals") return <BaseIcon><rect x="4" y="6" width="16" height="12" rx="1.5" /><path d="M12 6v12" /><path d="M4 10h16" /></BaseIcon>;
  return <BaseIcon><path d="M12 8.6A3.4 3.4 0 1 0 12 15.4A3.4 3.4 0 1 0 12 8.6z" /><path d="M19 12a7.2 7.2 0 0 0-.1-1l1.9-1.4-1.8-3.2-2.3 1a7.7 7.7 0 0 0-1.7-1l-.3-2.4H10l-.4 2.4a7.7 7.7 0 0 0-1.7 1l-2.3-1-1.8 3.2L5.7 11a7.2 7.2 0 0 0 0 2l-1.9 1.4 1.8 3.2 2.3-1c.5.4 1.1.7 1.7 1l.4 2.4h4.6l.3-2.4c.6-.2 1.2-.6 1.7-1l2.3 1 1.8-3.2L18.9 13c.1-.3.1-.7.1-1z" /></BaseIcon>;
}

function getConfigIcon(id) {
  if (id === "account") return getNavIcon("sellers");
  if (id === "hubspot") return <BaseIcon><path d="M10 14l4-4" /><path d="M7.5 16.5l-1.2 1.2a3.5 3.5 0 1 1-5-5l3.2-3.2a3.5 3.5 0 0 1 5 0" /><path d="M16.5 7.5l1.2-1.2a3.5 3.5 0 1 1 5 5l-3.2 3.2a3.5 3.5 0 0 1-5 0" /></BaseIcon>;
  if (id === "notifications") return <BaseIcon><path d="M7 10a5 5 0 1 1 10 0c0 5 2 6 2 6H5s2-1 2-6" /><path d="M10 18a2 2 0 0 0 4 0" /></BaseIcon>;
  if (id === "ai") return <BaseIcon><path d="M9 4a3 3 0 0 0-3 3v1a2.5 2.5 0 0 0-2 2.5A2.5 2.5 0 0 0 6 13v1a3 3 0 0 0 3 3" /><path d="M15 4a3 3 0 0 1 3 3v1a2.5 2.5 0 0 1 2 2.5A2.5 2.5 0 0 1 18 13v1a3 3 0 0 1-3 3" /><path d="M9 4a3 3 0 0 1 3 3v10" /><path d="M15 4a3 3 0 0 0-3 3v10" /></BaseIcon>;
  if (id === "personalize") return <BaseIcon><path d="M12 4l1.8 2.7 3.2.5-2.2 2.2.5 3.2-3.3-1.7-3.3 1.7.5-3.2-2.2-2.2 3.2-.5z" /><path d="M12 13v7" /></BaseIcon>;
  if (id === "exports") return <BaseIcon><path d="M8 3h6l4 4v14H8z" /><path d="M14 3v4h4" /><path d="M10 12h6" /><path d="M10 16h6" /></BaseIcon>;
  if (id === "storage") return <BaseIcon><path d="M5 8.5h14v7H5z" /><path d="M7 5h10" /><path d="M7 19h10" /></BaseIcon>;
  return <BaseIcon><path d="M12 3l7 3v5c0 4.5-2.9 8.5-7 10-4.1-1.5-7-5.5-7-10V6z" /><path d="M9.5 12l1.8 1.8 3.7-4" /></BaseIcon>;
}

function Row({ label, value, helper }) {
  return (
    <div className={styles.detailRow}>
      <span className={styles.detailLabel}>{label}</span>
      <div className={styles.detailValueBox}>
        <strong className={styles.detailValue}>{value}</strong>
        {helper ? <span className={styles.detailHelper}>{helper}</span> : null}
      </div>
    </div>
  );
}

function PhotoOption({ profilePhoto, onPhotoChange }) {
  return (
    <div className={styles.photoOption}>
      <div
        className={styles.photoPreview}
        style={profilePhoto ? { backgroundImage: `url(${profilePhoto})` } : undefined}
      >
        {profilePhoto ? null : "?"}
      </div>
      <div className={styles.photoMeta}>
        <strong>Foto do perfil</strong>
        <span>JPG ou PNG, até 5 MB.</span>
      </div>
      <label className={styles.photoAction}>
        <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" className={styles.hiddenFileInput} onChange={onPhotoChange} />
        <span>Adicionar foto</span>
      </label>
    </div>
  );
}

function Card({ eyebrow, title, children, wide = false }) {
  return (
    <section className={`${styles.card} ${wide ? styles.cardWide : ""}`.trim()}>
      <span className={styles.cardEyebrow}>{eyebrow}</span>
      <h2 className={styles.cardTitle}>{title}</h2>
      {children}
    </section>
  );
}

function Table({ head, rows, matrix = false }) {
  return (
    <div className={styles.table}>
      <div className={`${styles.tableHead} ${matrix ? styles.matrixCols : ""}`.trim()}>
        {head.map((item) => <span key={item}>{item}</span>)}
      </div>
      {rows.map((row, idx) => (
        <div key={`${row[0]}-${idx}`} className={`${styles.tableRow} ${matrix ? styles.matrixCols : ""}`.trim()}>
          {row.map((cell, cellIndex) => <span key={`${cell}-${cellIndex}`}>{cell}</span>)}
        </div>
      ))}
    </div>
  );
}

function Metric({ title, value, note }) {
  return (
    <div className={styles.metric}>
      <span>{title}</span>
      <strong>{value}</strong>
      {note ? <small>{note}</small> : null}
    </div>
  );
}

function OptionGroup({ title, options, value, onChange }) {
  return (
    <div className={styles.optionGroup}>
      <span className={styles.optionGroupLabel}>{title}</span>
      <div className={styles.optionPills}>
        {options.map((option) => (
          <button key={option} type="button" onClick={() => onChange(option)} className={`${styles.optionPill} ${value === option ? styles.optionPillActive : ""}`.trim()}>
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function PreferenceTable({ rows, values, onToggle }) {
  return (
    <div className={styles.preferenceTable}>
      {rows.map((row) => (
        <div key={row.id} className={styles.preferenceRow}>
          <div className={styles.preferenceCopy}>
            <strong>{row.label}</strong>
            <span>{row.description}</span>
          </div>
          <button type="button" onClick={() => onToggle(row.id)} className={`${styles.toggleButton} ${values[row.id] ? styles.toggleButtonActive : ""}`.trim()}>
            <span />
          </button>
        </div>
      ))}
    </div>
  );
}

function SettingsContent({ section, personalization, updatePersonalization, profilePhoto, onPhotoChange, dashboardData }) {
  if (section === "account") return <div className={styles.grid}><Card eyebrow="PERFIL" title="Conta & Acesso"><PhotoOption profilePhoto={profilePhoto} onPhotoChange={onPhotoChange} /><Row label="Nome" value="Usuário SalesOps" /><Row label="Senha" value="Última troca há 14 dias" /><Row label="2FA" value="Obrigatório para gestão" helper="SMS + autenticador" /><Row label="Sessões ativas" value="5 dispositivos" helper="2 navegadores e 3 mobile" /></Card><Card eyebrow="PERMISSÕES" title="Permissões por cargo"><Table head={["Cargo", "Acesso"]} rows={permissionRows} /></Card></div>;
  if (section === "hubspot") return <div className={styles.grid}><Card eyebrow="STATUS" title="Integração HubSpot"><Row label="Conexão" value={dashboardData.configured ? dashboardData.integration.status : "Pendente"} helper={dashboardData.configured ? `${dashboardData.integration.owners} proprietarios e ${dashboardData.integration.deals} negocios sincronizados` : "Configure o token para sincronizar com a HubSpot"} /><Row label="Origem dos dados" value="HubSpot API" helper="Private app access token" /><Row label="Pipeline ativo" value={`R$ ${Math.round((dashboardData.integration.pipelineAmount || 0) / 1000)}k`} /></Card><Card eyebrow="MAPEAMENTO" title="Campos sincronizados" wide><Table head={["SalesOps", "HubSpot", "Status"]} rows={mappingRows} /></Card><Card eyebrow="LOG" title="Erros recentes"><Table head={["Hora", "Erro", "Gravidade"]} rows={dashboardData.configured ? [["Agora", "Sincronizacao via API operando", "Baixo"]] : errorRows} /></Card></div>;
  if (section === "notifications") return <div className={styles.grid}><Card eyebrow="CANAIS" title="Notificações & Alertas"><Row label="Email" value="Ativo" helper="comercial@salesops.ai" /><Row label="Push" value="Ativo" helper="Chrome + mobile" /><Row label="Resumo automático" value="Diário" /></Card><Card eyebrow="THRESHOLDS" title="Metas e thresholds" wide><div className={styles.metrics}>{metricRows.map((item) => <Metric key={item[0]} title={item[0]} value={item[1]} note={item[2]} />)}</div></Card></div>;
  if (section === "ai") return <div className={styles.grid}><Card eyebrow="MODELO" title="IA & Diagnósticos"><Row label="Modelo ativo" value="GPT SalesOps Analyst" /><Row label="Assistente de voz" value="Habilitado" /><Row label="Sensibilidade" value="Moderada" helper="menos ruído, mais sinais de risco" /></Card><Card eyebrow="DADOS" title="Dados que alimentam a IA" wide><div className={styles.tags}><span>Negócios</span><span>Atividades</span><span>Calls gravadas</span><span>Sentimento do vendedor</span><span>Próximas tarefas</span></div></Card></div>;
  if (section === "personalize") return <div className={styles.grid}><Card eyebrow="APARÊNCIA" title="Tema e tipografia"><OptionGroup title="Tema" options={themeOptions} value={personalization.theme} onChange={(value) => updatePersonalization("theme", value)} /><OptionGroup title="Fonte principal" options={fontOptions} value={personalization.font} onChange={(value) => updatePersonalization("font", value)} /><OptionGroup title="Tamanho das letras" options={fontSizeOptions} value={personalization.fontSize} onChange={(value) => updatePersonalization("fontSize", value)} /></Card><Card eyebrow="INTERFACE" title="Densidade e leitura"><OptionGroup title="Densidade" options={densityOptions} value={personalization.density} onChange={(value) => updatePersonalization("density", value)} /><PreferenceTable rows={personalizationToggles} values={personalization} onToggle={(id) => updatePersonalization(id, !personalization[id])} /></Card><Card eyebrow="VISUAL" title="Prévia das personalizações" wide><div className={styles.previewPanel}><div className={styles.previewCard}><span>Cards</span><strong>{personalization.reinforcedCards ? "Borda reforçada" : "Borda padrão"}</strong><small>{personalization.reinforcedCards ? "Superfícies com mais destaque visual." : "Superfícies leves e discretas."}</small></div><div className={styles.previewCard}><span>Texto</span><strong>{personalization.fontSize}</strong><small>{personalization.font} com escala {personalization.fontSize.toLowerCase()}.</small></div><div className={styles.previewCard}><span>Navegação</span><strong>{personalization.density}</strong><small>{personalization.collapseSidebarOnOpen ? "Sidebar inicia recolhida." : "Sidebar inicia expandida."}</small></div></div></Card></div>;
  if (section === "exports") return <div className={styles.grid}><Card eyebrow="AGENDAMENTO" title="Relatórios & Exportação"><Row label="Envio semanal" value="Segunda, 07:30" /><Row label="Formato" value="PDF + XLSX" /><Row label="Marca d'água" value="Confidencial" /></Card><Card eyebrow="TEMPLATES" title="Templates por cargo" wide><Table head={["Cargo", "Template", "Formato"]} rows={reportRows} /></Card></div>;
  if (section === "storage") return <div className={styles.grid}><Card eyebrow="USO" title="Gestão de Mídia & Storage"><div className={styles.usage}><div className={styles.usageTop}><strong>38.4 / 100 GB</strong><span>38%</span></div><div className={styles.usageBar}><span style={{ width: "38.4%" }} /></div><p>Gravações semanais, áudios e anexos operacionais.</p></div><Row label="Hot storage" value="45 dias" /><Row label="Cold storage" value="365 dias" helper="arquivamento automático" /></Card><Card eyebrow="STT" title="Fila de transcrição em tempo real" wide><Table head={["Arquivo", "Status", "Progresso"]} rows={queueRows} /></Card><Card eyebrow="PROVEDOR" title="Indexação e provedor"><Row label="Provedor" value="Azure Blob Storage" /><Row label="Região" value="Brazil South" helper="aderência LGPD" /><Row label="Indexação IA" value="Ativa" /></Card></div>;
  return <div className={styles.grid}><Card eyebrow="AUDITORIA" title="Eventos recentes" wide><Table head={["Quem", "O quê", "Quando"]} rows={auditRows} /></Card><Card eyebrow="MASKING" title="Matriz visual por campo e cargo"><Table head={["Campo", "Admin", "Gestor", "Vendedor"]} rows={maskingRows} matrix /></Card><Card eyebrow="LGPD" title="Consentimento e conformidade"><Row label="Consentimento" value="Registrado por contato" /><Row label="Esquecimento" value="Fluxo habilitado" helper="remoção em até 7 dias" /><Row label="Relatório" value="Atualizado hoje" /></Card></div>;
}

function ReportsContent({ dashboardData }) {
  return (
    <section className={styles.dashboardSection}>
      <header className={styles.settingsHeader}>
        <h1>Relatórios</h1>
        <p>Resumo executivo puxado da HubSpot, com visão por vendedor e pipeline aberto.</p>
      </header>

      <div className={styles.grid}>
        <Card eyebrow="HUBSPOT" title="KPIs comerciais" wide>
          <div className={styles.metrics}>
            <Metric title="Pipeline aberto" value={`R$ ${Math.round((dashboardData.summary.totalPipeline || 0) / 1000)}k`} note="Negocios em aberto na HubSpot" />
            <Metric title="Won no mes" value={`R$ ${Math.round((dashboardData.summary.wonThisMonth || 0) / 1000)}k`} note="Fechamentos marcados como closed won" />
            <Metric title="Negocios parados" value={`${dashboardData.summary.stalledDeals || 0}`} note="Sem touch recente" />
          </div>
        </Card>

        <Card eyebrow="TIME" title="Visão por vendedor" wide>
          <Table head={["Vendedor", "Meta", "Pipeline", "Status"]} rows={dashboardData.reports} />
        </Card>
      </div>
    </section>
  );
}

function getGlobalSearchResults(query) {
  const normalizedQuery = String(query || "").trim().toLowerCase();
  if (!normalizedQuery) return globalSearchIndex.slice(0, 6);

  return [...globalSearchIndex]
    .map((item) => {
      const haystack = `${item.label} ${item.description} ${item.keywords}`.toLowerCase();
      let score = 0;
      if (item.label.toLowerCase().includes(normalizedQuery)) score += 3;
      if (item.description.toLowerCase().includes(normalizedQuery)) score += 2;
      if (haystack.includes(normalizedQuery)) score += 1;
      return { ...item, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 7);
}

function getAiSearchHint(query, results) {
  const normalizedQuery = String(query || "").trim().toLowerCase();
  if (!normalizedQuery) {
    return "Digite um tema (ex.: pipeline, vendedor, alertas) para a IA sugerir o melhor atalho.";
  }
  if (!results.length) {
    return "Não achei um atalho direto. Tente termos como: pipeline, vendedores, relatórios ou integração.";
  }
  if (normalizedQuery.includes("risco") || normalizedQuery.includes("estagn")) {
    return "Sugestão IA: abra Agente de IA para diagnóstico e depois valide no quadro de Negócios.";
  }
  if (normalizedQuery.includes("meta") || normalizedQuery.includes("kpi") || normalizedQuery.includes("receita")) {
    return "Sugestão IA: comece por Relatórios para visão macro, depois detalhe por Vendedores.";
  }
  if (normalizedQuery.includes("alert") || normalizedQuery.includes("notifica")) {
    return "Sugestão IA: abra Notificações para triagem rápida e priorize os itens não lidos.";
  }
  return `Sugestão IA: o melhor ponto de entrada agora é "${results[0].label}".`;
}

function DealsContent({ dashboardData }) {
  const router = useRouter();
  const [boardDeals, setBoardDeals] = useState(dashboardData.deals);
  const [draggedDealId, setDraggedDealId] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("todos");
  const [activityWeeksFilter, setActivityWeeksFilter] = useState("1");
  const [collapsedStages, setCollapsedStages] = useState({});
  const skipCardClickRef = useRef(false);
  const stageOrder = [
    "Oportunidade",
    "Primeira Reunião",
    "Avaliação Técnica Feita",
    "Criação de Tabela de Preço",
    "Tabela de Preço Criada",
    "Avaliação da Tabela Feita",
    "Tabela de Preço Enviada",
    "Tabela de Preço Aceita",
    "Elaboração de DOT",
    "DOT Criado",
    "Avaliação de DOT",
    "DOT Aprovado",
    "DOT Entregue",
    "Elaboração da Proposta",
    "Proposta Criada",
    "Avaliação da Proposta Feita",
    "Proposta Enviada",
    "Proposta Aceita",
    "Elaboração do Acordo de Cooperação",
    "Acordo de Cooperação Criado",
    "Acordo de Cooperação Assinado",
    "Elaboração do Contrato",
    "Contrato Enviado",
    "Negócio Fechado",
    "Negócio Perdido",
  ];

  useEffect(() => {
    setBoardDeals(dashboardData.deals);
  }, [dashboardData.deals]);

  useEffect(() => {
    setBoardDeals((currentDeals) =>
      currentDeals.map((deal) => {
        if (deal.id === "1") return { ...deal, stage: "Proposta Enviada" };
        if (deal.id === "2") return { ...deal, stage: "Avaliação de DOT" };
        if (deal.id === "3") return { ...deal, stage: "Primeira Reunião" };
        return deal;
      }),
    );
  }, []);

  const formatCurrencyFromLabel = (label) => {
    const numericValue = Number.parseFloat(
      String(label).replace(/[^\d,]/g, "").replace(/\./g, "").replace(",", "."),
    );

    if (Number.isNaN(numericValue)) {
      return label;
    }

    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(numericValue);
  };

  const parseStaleDays = (staleLabel) => {
    const days = Number.parseInt(String(staleLabel), 10);
    return Number.isNaN(days) ? 0 : days;
  };

  const ownerOptions = Array.from(new Set(boardDeals.map((deal) => deal.owner))).sort((a, b) => a.localeCompare(b));
  const maxDays = Number(activityWeeksFilter) * 7;
  const visibleDeals = boardDeals.filter((deal) => {
    const ownerMatch = ownerFilter === "todos" || deal.owner === ownerFilter;
    const activityMatch = parseStaleDays(deal.staleLabel) <= maxDays;
    return ownerMatch && activityMatch;
  });

  const stages = Array.from(new Set([...stageOrder, ...boardDeals.map((deal) => deal.stage)]));

  const boardColumns = stages.map((stage) => {
    const stageDeals = visibleDeals.filter((deal) => deal.stage === stage);
    const totalValue = stageDeals.reduce((sum, deal) => {
      const numericValue = Number.parseFloat(
        String(deal.amountLabel).replace(/[^\d,]/g, "").replace(/\./g, "").replace(",", "."),
      );
      return Number.isNaN(numericValue) ? sum : sum + numericValue;
    }, 0);

    return {
      stage,
      deals: stageDeals,
      count: stageDeals.length,
      totalLabel: new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0,
      }).format(totalValue),
    };
  });

  const handleDropStage = (targetStage) => {
    if (!draggedDealId) {
      return;
    }

    setBoardDeals((currentDeals) =>
      currentDeals.map((deal) =>
        deal.id === draggedDealId
          ? { ...deal, stage: targetStage, staleLabel: "Atualizado agora" }
          : deal,
      ),
    );
    setDraggedDealId("");
  };

  const openDealProfile = (deal) => {
    if (skipCardClickRef.current) {
      skipCardClickRef.current = false;
      return;
    }
    router.push(`/negocios/${dealToSlug(deal)}`);
  };

  const toggleStageCollapse = (stage) => {
    setCollapsedStages((current) => ({
      ...current,
      [stage]: !current[stage],
    }));
  };

  return (
    <section className={styles.dashboardSection}>
      <header className={styles.settingsHeader}>
        <h1>Negócios</h1>
      </header>

      <div className={styles.dealsFilters}>
        <label className={styles.dealsFilterField}>
          <span>Por proprietario</span>
          <select value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)}>
            <option value="todos">Todos</option>
            {ownerOptions.map((owner) => (
              <option key={owner} value={owner}>{owner}</option>
            ))}
          </select>
        </label>

        <label className={styles.dealsFilterField}>
          <span>Tempo da ultima atividade</span>
          <select value={activityWeeksFilter} onChange={(event) => setActivityWeeksFilter(event.target.value)}>
            <option value="1">1 semana</option>
            <option value="2">2 semanas</option>
            <option value="3">3 semanas</option>
            <option value="4">4 semanas</option>
          </select>
        </label>
      </div>

      <section className={styles.pipelineBoard}>
        {boardColumns.map((column) => {
          const isCollapsed = Boolean(collapsedStages[column.stage]);
          return (
            <article
              key={column.stage}
              className={`${styles.pipelineColumn} ${isCollapsed ? styles.pipelineColumnCollapsed : ""}`.trim()}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => handleDropStage(column.stage)}
            >
              {isCollapsed ? (
                <header className={styles.pipelineColumnHeader}>
                  <button
                    type="button"
                    className={styles.pipelineCollapseButton}
                    onClick={() => toggleStageCollapse(column.stage)}
                    aria-expanded={!isCollapsed}
                    aria-label={`Expandir etapa ${column.stage}`}
                    title="Expandir etapa"
                  >
                    {">"}
                  </button>
                  <div className={styles.pipelineColumnTitleBlock}>
                    <span>{column.stage}</span>
                  </div>
                  <small className={styles.pipelineCountBadge}>{column.count}</small>
                </header>
              ) : (
                <header className={styles.pipelineColumnHeader}>
                  <div className={styles.pipelineColumnTitleBlock}>
                    <span>{column.stage}</span>
                  </div>
                  <div className={styles.pipelineColumnActions}>
                    <small>{column.count}</small>
                    <button
                      type="button"
                      className={styles.pipelineCollapseButton}
                      onClick={() => toggleStageCollapse(column.stage)}
                      aria-expanded={!isCollapsed}
                      aria-label={`Recolher etapa ${column.stage}`}
                      title="Recolher etapa"
                    >
                      {"<"}
                    </button>
                  </div>
                </header>
              )}

            <div className={styles.pipelineColumnBody}>
              {column.deals.length ? column.deals.map((deal) => (
                <article
                  key={deal.id}
                  className={styles.pipelineDealCard}
                  draggable
                  tabIndex={0}
                  onClick={() => openDealProfile(deal)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openDealProfile(deal);
                    }
                  }}
                  onDragStart={() => {
                    skipCardClickRef.current = true;
                    setDraggedDealId(deal.id);
                  }}
                  onDragEnd={() => {
                    setDraggedDealId("");
                    window.setTimeout(() => {
                      skipCardClickRef.current = false;
                    }, 0);
                  }}
                >
                  {collapsedStages[column.stage] ? null : (
                    <>
                  <div className={styles.pipelineDealTop}>
                    <strong>{deal.name}</strong>
                    <span>{formatCurrencyFromLabel(deal.amountLabel)}</span>
                  </div>
                  <div className={styles.pipelineDealMeta}>
                    <span>{deal.owner}</span>
                    <span>{deal.staleLabel}</span>
                  </div>
                  <small>Sincronizado com HubSpot. Arraste para atualizar o estágio.</small>
                    </>
                  )}
                </article>
              )) : (
                <div className={styles.pipelineEmptyState}>
                  <span>Sem negócios neste estágio.</span>
                </div>
              )}
            </div>
            <footer className={styles.pipelineColumnFooter}>
              <strong>{column.totalLabel}</strong>
              <span>Valor total</span>
            </footer>
            </article>
          );
        })}
      </section>
    </section>
  );
}

function DealProfileContent({ dashboardData, dealId }) {
  const router = useRouter();
  const deal = findDealByRouteId(dashboardData.deals, dealId);

  if (!deal) {
    return (
      <section className={styles.dashboardSection}>
        <header className={styles.settingsHeader}>
          <h1>Negócio não encontrado</h1>
          <p>Não localizamos esse negócio no pipeline atual.</p>
        </header>
        <button
          type="button"
          className={styles.secondaryActionButton}
          onClick={() => router.push("/negocios")}
        >
          Voltar para Negócios
        </button>
      </section>
    );
  }

  return (
    <section className={styles.dashboardSection}>
      <header className={styles.settingsHeader}>
        <h1>{deal.name}</h1>
        <p>Perfil completo do negócio e status atual no pipeline.</p>
      </header>

      <div className={styles.grid}>
        <Card eyebrow="NEGOCIO" title="Resumo do Negócio">
          <Row label="Nome" value={deal.name} />
          <Row label="Responsável" value={deal.owner} />
          <Row label="Etapa atual" value={deal.stage} />
          <Row label="Valor" value={deal.amountLabel} />
          <Row label="Última atualização" value={deal.staleLabel} />
        </Card>

        <Card eyebrow="AÇÕES" title="Próximos Passos">
          <Row label="Sincronização" value="HubSpot ativa" helper="Negócio vinculado ao pipeline principal" />
          <Row label="Movimentação" value="Arraste no quadro de Negócios" helper="Pressione e arraste o card para mudar de etapa" />
          <Row label="Navegação" value="Voltar ao pipeline" helper="Clique abaixo para retornar" />
          <button
            type="button"
            className={styles.secondaryActionButton}
            onClick={() => router.push("/negocios")}
          >
            Abrir Pipeline
          </button>
        </Card>
      </div>
    </section>
  );
}

function SellerMeetingsContent({ dashboardData, sellerSlug }) {
  const router = useRouter();
  const seller = dashboardData.sellers.find((item) => sellerToSlug(item.name) === sellerSlug) || dashboardData.sellers[0];
  const meetings = getInternalMeetingsForSeller(seller);

  return (
    <section className={styles.dashboardSection}>
      <header className={styles.sellerDetailHeader}>
        <div className={styles.settingsHeader}>
          <h1>Reunioes internas</h1>
          <p>{seller.name} · Lista consolidada de alinhamentos internos e rituais de acompanhamento.</p>
        </div>
        <div className={styles.sellerMeetingActions}>
          <button
            type="button"
            className={styles.primaryActionButton}
            onClick={() => router.push(`/vendedores/${sellerSlug}/reunioes/nova`)}
          >
            <MeetingIcon />
            <span>Registrar nova reuniao</span>
          </button>
        </div>
      </header>

      <section className={styles.meetingsList}>
        {meetings.map((meeting) => (
          <button
            key={meeting.id}
            type="button"
            className={styles.meetingRow}
            onClick={() => router.push(`/vendedores/${sellerSlug}/reunioes/${meetingToSlug(meeting.id)}`)}
          >
            <div className={styles.meetingPrimary}>
              <strong>{meeting.title}</strong>
              <span>{meeting.summary}</span>
            </div>
            <div className={styles.meetingMeta}>
              <strong>{meeting.date}</strong>
              <span>{meeting.time}</span>
            </div>
            <div className={styles.meetingMeta}>
              <strong>{meeting.type}</strong>
              <span>{meeting.owner}</span>
            </div>
          </button>
        ))}
      </section>
    </section>
  );
}

function SellerMeetingDetailContent({ dashboardData, sellerSlug, meetingId }) {
  const router = useRouter();
  const [meetingAttachments, setMeetingAttachments] = useState([]);
  const [showAiAnalysis, setShowAiAnalysis] = useState(false);
  const seller = dashboardData.sellers.find((item) => sellerToSlug(item.name) === sellerSlug) || dashboardData.sellers[0];
  const meetings = getInternalMeetingsForSeller(seller);
  const meeting = meetings.find((item) => meetingToSlug(item.id) === meetingId) || meetings[0];
  const isNewMeeting = meetingId === "nova";

  const handleMeetingAttachments = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) {
      return;
    }

    setMeetingAttachments((current) => [
      ...current,
      ...files.map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}`,
        name: file.name,
        type: file.type || "application/octet-stream",
        sizeLabel: `${Math.max(1, Math.round(file.size / 1024))} KB`,
      })),
    ]);

    event.target.value = "";
  };

  const removeMeetingAttachment = (attachmentId) => {
    setMeetingAttachments((current) => current.filter((attachment) => attachment.id !== attachmentId));
  };

  return (
    <section className={styles.dashboardSection}>
      <header className={styles.sellerDetailHeader}>
        <div className={styles.settingsHeader}>
          <h1>{isNewMeeting ? "Registrar nova reuniao" : meeting.title}</h1>
          <p>
            {isNewMeeting
              ? `Novo registro interno para ${seller.name}, preparado para posterior sincronizacao com a HubSpot.`
              : `${meeting.date} · ${meeting.time} · ${meeting.type}`}
          </p>
        </div>
      </header>

      <div className={styles.grid}>
        <Card eyebrow="REUNIAO" title={isNewMeeting ? "Novo registro" : "Resumo da reuniao"} wide>
          {isNewMeeting ? (
            <div className={styles.meetingComposer}>
              <label className={styles.meetingField}>
                <span>Titulo</span>
                <input type="text" placeholder="Ex.: Alinhamento semanal do pipeline" />
              </label>
              <div className={styles.meetingFieldRow}>
                <label className={styles.meetingField}>
                  <span>Data</span>
                  <input type="text" placeholder="dd/mm/aaaa" />
                </label>
                <label className={styles.meetingField}>
                  <span>Horario</span>
                  <input type="text" placeholder="09:00" />
                </label>
              </div>
              <label className={styles.meetingField}>
                <span>Resumo</span>
                <textarea rows="5" placeholder="Descreva objetivo, contexto e decisoes da reuniao." />
              </label>
              <div className={styles.meetingAttachmentsBlock}>
                <div className={styles.meetingAttachmentsHeader}>
                  <span>Anexos</span>
                  <label className={styles.meetingAttachmentButton}>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.txt,.rtf,.md,.mp3,.wav,.m4a,.ogg,.aac,.webm,audio/*"
                      multiple
                      className={styles.hiddenFileInput}
                      onChange={handleMeetingAttachments}
                    />
                    Anexar documento ou audio
                  </label>
                </div>
                {meetingAttachments.length ? (
                  <div className={styles.meetingAttachmentList}>
                    {meetingAttachments.map((attachment) => (
                      <div key={attachment.id} className={styles.meetingAttachmentItem}>
                        <div className={styles.meetingAttachmentMeta}>
                          <strong>{attachment.name}</strong>
                          <span>{attachment.sizeLabel}</span>
                        </div>
                        <button
                          type="button"
                          className={styles.meetingAttachmentRemove}
                          onClick={() => removeMeetingAttachment(attachment.id)}
                        >
                          Remover
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={styles.meetingAttachmentHint}>
                    Aceita PDF, DOC, TXT, MD e arquivos de audio como MP3, WAV e M4A.
                  </p>
                )}
              </div>
              <div className={styles.meetingFormActions}>
                <button
                  type="button"
                  className={styles.primaryActionButton}
                  onClick={() => router.push(`/vendedores/${sellerSlug}/reunioes`)}
                >
                  Salvar reuniao
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.meetingDetailStack}>
              <div className={styles.meetingDetailActions}>
                <button
                  type="button"
                  className={styles.primaryActionButton}
                  onClick={() => setShowAiAnalysis((value) => !value)}
                >
                  <SparkIcon />
                  <span>{showAiAnalysis ? "Ocultar analise da IA" : "Analisar com IA"}</span>
                </button>
              </div>
              <Row label="Responsavel" value={meeting.owner} />
              <Row label="Tipo" value={meeting.type} />
              <Row label="Resumo" value={meeting.summary} />
              {showAiAnalysis ? (
                <div className={styles.meetingAiPanel}>
                  <strong>Analise da IA</strong>
                  <p>
                    A reuniao indica foco em previsibilidade de receita e em proximos passos por conta.
                    Recomendacao: registrar todos os follow-ups no HubSpot em ate 24h e revisar negocios
                    parados antes do proximo ritual.
                  </p>
                </div>
              ) : null}
              <div className={styles.meetingAudioPanel}>
                <strong>Audio da reuniao</strong>
                {meeting.audioUrl ? (
                  <div className={styles.meetingAudioPlayer}>
                    <span>{meeting.audioLabel || "Gravacao disponivel"}</span>
                    <audio controls preload="none" src={meeting.audioUrl}>
                      Seu navegador nao suporta audio.
                    </audio>
                  </div>
                ) : (
                  <p>Nenhum audio disponivel para esta reuniao.</p>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>
    </section>
  );
}

function SellersContent({ dashboardData }) {
  const router = useRouter();
  const [sellerFilter, setSellerFilter] = useState("");
  const filteredSellers = dashboardData.sellers.filter((seller) =>
    seller.name.toLowerCase().includes(sellerFilter.trim().toLowerCase()),
  );
  const parseCurrencyLabel = (label) => {
    const numericValue = Number.parseFloat(
      String(label).replace(/[^\d,]/g, "").replace(/\./g, "").replace(",", "."),
    );

    return Number.isNaN(numericValue) ? 0 : numericValue;
  };

  const formatCurrency = (value) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(value);

  const getMotivationStatus = (seller) => {
    if (seller.metaPercent >= 105 && seller.health >= 8) {
      return "Alto";
    }

    if (seller.metaPercent >= 90 && seller.health >= 6) {
      return "Medio";
    }

    return "Baixo";
  };

  return (
    <section className={styles.dashboardSection}>
      <header className={styles.sellerPageHeader}>
        <div className={styles.settingsHeader}>
          <h1>Vendedores</h1>
        </div>
        <label className={styles.sellerFilterBox}>
          <span>Filtrar por nome</span>
          <input
            type="text"
            value={sellerFilter}
            onChange={(event) => setSellerFilter(event.target.value)}
            placeholder="Buscar vendedor"
          />
        </label>
      </header>

      <div className={styles.sellerProfilesGrid}>
        {filteredSellers.map((seller) => {
          const sellerDeals = dashboardData.deals.filter((deal) => deal.owner === seller.name);
          const totalPipeline = sellerDeals.reduce((sum, deal) => sum + parseCurrencyLabel(deal.amountLabel), 0);
          const pendingTasks = sellerDeals.filter((deal) => Number.parseInt(deal.staleLabel, 10) >= 3).length;
          const motivationStatus = getMotivationStatus(seller);

          return (
            <button
              key={seller.name}
              type="button"
              className={styles.sellerProfileContainer}
              onClick={() => router.push(`/vendedores/${sellerToSlug(seller.name)}`)}
            >
              <article className={styles.sellerProfileCard}>
                <div className={styles.sellerProfileTop}>
                  <div className={styles.sellerAvatar}>{seller.initials}</div>
                  <div className={styles.sellerIdentity}>
                    <strong>{seller.name}</strong>
                    <span>{seller.team}</span>
                  </div>
                </div>

                <div className={styles.sellerStats}>
                  <div>
                    <span>Negocios abertos</span>
                    <strong>{seller.openDeals}</strong>
                  </div>
                  <div>
                    <span>Valor total na pipeline</span>
                    <strong>{formatCurrency(totalPipeline)}</strong>
                  </div>
                </div>

                <div className={styles.sellerStats}>
                  <div>
                    <span>Tarefas a fazer</span>
                    <strong>{pendingTasks}</strong>
                  </div>
                  <div>
                    <span>Status motivacao</span>
                    <strong>{motivationStatus}</strong>
                  </div>
                </div>

                <div className={styles.sellerInsightBlock}>
                  <span className={styles.sellerInsightLabel}>Analise da IA</span>
                  <p className={styles.sellerNote}>{seller.note}</p>
                </div>
              </article>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function SellerProfileContent({ dashboardData, sellerSlug }) {
  const router = useRouter();
  const [selectedStage, setSelectedStage] = useState("");
  const seller = dashboardData.sellers.find((item) => sellerToSlug(item.name) === sellerSlug) || dashboardData.sellers[0];
  const sellerDeals = dashboardData.deals.filter((deal) => deal.owner === seller.name);
  const conversionRate = seller.openDeals + seller.wonDeals > 0
    ? Math.round((seller.wonDeals / (seller.openDeals + seller.wonDeals)) * 100)
    : 0;
  const totalPipelineValue = sellerDeals.reduce((sum, deal) => {
    const numericValue = Number.parseFloat(
      String(deal.amountLabel).replace(/[^\d,]/g, "").replace(/\./g, "").replace(",", "."),
    );
    return Number.isNaN(numericValue) ? sum : sum + numericValue;
  }, 0);
  const pendingTasks = sellerDeals.filter((deal) => Number.parseInt(deal.staleLabel, 10) >= 3).length;
  const motivationStatus = seller.metaPercent >= 105 && seller.health >= 8
    ? "Alto"
    : seller.metaPercent >= 90 && seller.health >= 6
      ? "Medio"
      : "Baixo";
  const activityKpis = [
    ["Chamadas", `${seller.openDeals * 7}`],
    ["Emails", `${seller.openDeals * 12}`],
    ["Reunioes", `${Math.max(2, seller.wonDeals * 2)}`],
  ];
  const kanbanColumns = [
    { title: "Discovery", count: sellerDeals.filter((deal) => deal.stage.toLowerCase().includes("discovery")).length },
    { title: "Proposal", count: sellerDeals.filter((deal) => deal.stage.toLowerCase().includes("proposal")).length },
    { title: "Negotiation", count: sellerDeals.filter((deal) => deal.stage.toLowerCase().includes("negotiation")).length },
    { title: "Commit", count: sellerDeals.filter((deal) => deal.stage.toLowerCase().includes("commit")).length },
  ];
  const maxKanbanCount = Math.max(1, ...kanbanColumns.map((column) => column.count));

  const stageMatches = (dealStage, stageTitle) => dealStage.toLowerCase().includes(stageTitle.toLowerCase());
  const stageDeals = selectedStage
    ? sellerDeals.filter((deal) => stageMatches(deal.stage, selectedStage))
    : [];

  return (
    <section className={styles.dashboardSection}>
      <header className={styles.sellerDetailHeader}>
        <div className={styles.sellerDetailIdentity}>
          <div className={styles.sellerDetailAvatar}>{seller.initials}</div>
          <div className={`${styles.settingsHeader} ${styles.sellerDetailHeaderBlock}`.trim()}>
            <h1>{seller.name}</h1>
            <p>{seller.team}</p>
          </div>
          <div className={`${styles.sellerMeetingActions} ${styles.sellerProfileMeetingActions}`.trim()}>
            <button
              type="button"
              className={styles.primaryActionButton}
              onClick={() => router.push(`/vendedores/${sellerSlug}/reunioes`)}
            >
              <MeetingIcon />
              <span>Reunioes internas</span>
            </button>
          </div>
        </div>
      </header>

      <div className={styles.grid}>
        <Card eyebrow="GERAL" title="Visao geral do pipeline" wide>
          <div className={styles.metrics}>
            <Metric title="Negocios abertos" value={`${seller.openDeals}`} />
            <Metric
              title="Valor total na pipeline"
              value={new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
                maximumFractionDigits: 0,
              }).format(totalPipelineValue)}
            />
            <Metric title="Tarefas a fazer" value={`${pendingTasks}`} />
            <Metric title="Status motivacao" value={motivationStatus} />
          </div>
          <div className={styles.pipelineStageChart}>
            {kanbanColumns.map((column) => (
              <button
                key={column.title}
                type="button"
                className={styles.pipelineStageBarCard}
                onClick={() => setSelectedStage(column.title)}
              >
                <div className={styles.pipelineStageBarWrap}>
                  <div
                    className={styles.pipelineStageBar}
                    style={{ height: `${Math.max(16, (column.count / maxKanbanCount) * 100)}%` }}
                  />
                </div>
                <strong>{column.count}</strong>
                <span>{column.title}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card eyebrow="PERFORMANCE" title="Performance e produtividade" wide>
          <div className={styles.metrics}>
            <Metric title="Taxa de conversao" value={`${conversionRate}%`} note="Negocios ganhos vs. perdidos/em aberto" />
            <Metric title="Atingimento de meta" value={`${seller.metaPercent}%`} note="Comparativo com a cota atual" />
            <Metric title="Pipeline" value={seller.pipelineLabel} note="Valor comercial sob gestao" />
          </div>
          <div className={styles.kpiRow}>
            {activityKpis.map((item) => (
              <div key={item[0]} className={styles.kpiCard}>
                <span>{item[0]}</span>
                <strong>{item[1]}</strong>
              </div>
            ))}
          </div>
        </Card>

        <Card eyebrow="COACHING" title="Desenvolvimento e coaching">
          <div className={styles.dealList}>
            <article className={styles.dealListItem}>
              <div className={styles.dealIdentity}>
                <strong>Repositorio de inteligencia</strong>
                <span>Gravacoes, audios e documentos documentados</span>
              </div>
              <div className={styles.dealMeta}>
                <strong>12 itens</strong>
                <span>Semana atual</span>
              </div>
              <div className={styles.dealMeta}>
                <strong>Atualizado</strong>
                <span>Sincronizado com HubSpot</span>
              </div>
            </article>
          </div>
          <div className={styles.kpiRow}>
            <div className={styles.kpiCard}>
              <span>Resiliencia</span>
              <strong>8.7</strong>
            </div>
            <div className={styles.kpiCard}>
              <span>Escuta ativa</span>
              <strong>8.4</strong>
            </div>
            <div className={styles.kpiCard}>
              <span>Feedback da supervisao</span>
              <strong>Bom momento de evolucao</strong>
            </div>
          </div>
        </Card>

        <Card eyebrow="NEGOCIOS" title="Pipeline do vendedor" wide>
          <div className={styles.dealList}>
            {sellerDeals.length ? sellerDeals.map((deal) => (
              <article key={deal.id} className={`${styles.dealListItem} ${styles.sellerDealListItem}`.trim()}>
                <div className={styles.dealIdentity}>
                  <strong>{deal.name}</strong>
                  <span>{deal.owner}</span>
                </div>
                <div className={styles.dealMeta}>
                  <strong>{deal.stage}</strong>
                  <span>Etapa da pipeline</span>
                </div>
                <div className={styles.dealMeta}>
                  <strong>{deal.amountLabel}</strong>
                  <span>Valor estimado</span>
                </div>
                <div className={styles.dealMeta}>
                  <strong>{deal.staleLabel}</strong>
                  <span>Ultima atividade</span>
                </div>
              </article>
            )) : <p className={styles.sellerDetailNote}>Nenhum negocio atribuido a este vendedor no momento.</p>}
          </div>
        </Card>
      </div>

      {selectedStage ? (
        <div
          className={styles.stageModalBackdrop}
          role="presentation"
          onClick={() => setSelectedStage("")}
        >
          <div
            className={styles.stageModal}
            role="dialog"
            aria-modal="true"
            aria-label={`Negocios em ${selectedStage}`}
            onClick={(event) => event.stopPropagation()}
          >
            <header className={styles.stageModalHeader}>
              <div>
                <span>ETAPA</span>
                <h3>{selectedStage}</h3>
                <p>{seller.name} · {stageDeals.length} negocio(s)</p>
              </div>
              <button
                type="button"
                className={styles.secondaryActionButton}
                onClick={() => setSelectedStage("")}
              >
                Fechar
              </button>
            </header>
            <div className={styles.stageModalList}>
              {stageDeals.length ? stageDeals.map((deal) => (
                <article key={deal.id} className={styles.stageModalItem}>
                  <div>
                    <strong>{deal.name}</strong>
                    <span>{deal.owner}</span>
                  </div>
                  <div>
                    <strong>{deal.amountLabel}</strong>
                    <span>{deal.staleLabel}</span>
                  </div>
                </article>
              )) : (
                <p className={styles.sellerDetailNote}>Nenhum negocio nesta etapa para este vendedor.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default function DashboardShell({
  initialNav = "reports",
  initialConfig = "hubspot",
  initialProfileView = false,
  sellerSlug = "",
  sellerMeetingsView = false,
  sellerMeetingId = "",
  dealId = "",
}) {
  const router = useRouter();
  const [personalization, setPersonalization] = useState(personalizationDefaults);
  const [dashboardData, setDashboardData] = useState(defaultDashboardData);
  const [hubspotMessage, setHubspotMessage] = useState("Carregando dados da HubSpot...");
  const [activeNav, setActiveNav] = useState(initialNav);
  const [activeConfig, setActiveConfig] = useState(initialConfig);
  const [profileViewOpen, setProfileViewOpen] = useState(initialProfileView);
  const [profilePhoto, setProfilePhoto] = useState("");
  const [collapsed, setCollapsed] = useState(personalizationDefaults.collapseSidebarOnOpen);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutPromptOpen, setLogoutPromptOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationTab, setNotificationTab] = useState("unread");
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const menuRef = useRef(null);

  useEffect(() => {
    function closeOnOutside(event) {
      if (!menuRef.current?.contains(event.target)) setMenuOpen(false);
    }
    function closeOnEscape(event) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setLogoutPromptOpen(false);
        setNotificationsOpen(false);
        setGlobalSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const next = { ...personalizationDefaults, ...JSON.parse(stored) };
      setPersonalization(next);
      setCollapsed(Boolean(next.collapseSidebarOnOpen));
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    const storedPhoto = window.localStorage.getItem(PROFILE_PHOTO_KEY);
    if (storedPhoto) {
      setProfilePhoto(storedPhoto);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadHubSpotData() {
      try {
        const response = await fetch("/api/hubspot/dashboard", { cache: "no-store" });
        const payload = await response.json();
        if (cancelled) return;

        if (!response.ok) {
          setDashboardData(defaultDashboardData);
          setHubspotMessage(payload.error || "Nao foi possivel consultar a HubSpot.");
          return;
        }

        setDashboardData(payload);
        setHubspotMessage("Dados da HubSpot sincronizados.");
      } catch {
        if (cancelled) return;
        setDashboardData(defaultDashboardData);
        setHubspotMessage("Nao foi possivel consultar a HubSpot.");
      }
    }

    loadHubSpotData();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const systemDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
    const theme = personalization.theme === "Automático" ? (systemDark ? "dark" : "light") : (personalization.theme === "Escuro" ? "dark" : "light");
    const fontMap = {
      Manrope: "manrope",
      "IBM Plex Sans": "ibm-plex-sans",
      "Source Sans 3": "source-sans-3",
      Montserrat: "montserrat",
      "Nunito Sans": "nunito-sans",
      "Work Sans": "work-sans",
    };
    const fontVariableMap = {
      Manrope: "var(--font-manrope)",
      "IBM Plex Sans": "var(--font-ibm-plex-sans)",
      "Source Sans 3": "var(--font-source-sans)",
      Montserrat: "var(--font-montserrat)",
      "Nunito Sans": "var(--font-nunito-sans)",
      "Work Sans": "var(--font-work-sans)",
    };
    const fontSizeMap = {
      Pequena: "small",
      "Média": "medium",
      Grande: "large",
    };
    const densityMap = {
      Compacta: "compact",
      "Confortável": "comfortable",
      Expandida: "expanded",
    };

    root.dataset.theme = theme;
    root.dataset.font = fontMap[personalization.font];
    root.style.setProperty("--app-font", fontVariableMap[personalization.font] || "var(--font-manrope)");
    root.dataset.fontSize = fontSizeMap[personalization.fontSize];
    root.dataset.density = densityMap[personalization.density];
    root.dataset.contrast = personalization.highContrast ? "high" : "normal";
    root.dataset.cards = personalization.reinforcedCards ? "reinforced" : "standard";
    root.dataset.animations = personalization.animations ? "on" : "off";
    root.dataset.shortcuts = personalization.showShortcuts ? "on" : "off";
    root.dataset.preview = personalization.instantPreview ? "instant" : "manual";

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(personalization));
  }, [personalization]);

  function updatePersonalization(key, value) {
    setPersonalization((current) => {
      const next = { ...current, [key]: value };
      if (key === "collapseSidebarOnOpen") {
        setCollapsed(Boolean(value));
      }
      return next;
    });
  }

  function handlePhotoChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) return;
      setProfilePhoto(result);
      window.localStorage.setItem(PROFILE_PHOTO_KEY, result);
    };
    reader.readAsDataURL(file);
  }

  function navigateToMainSection(section) {
    const routeMap = {
      reports: "/relatorios",
      sellers: "/vendedores",
      deals: "/negocios",
      settings: "/configuracoes",
      profile: "/perfil",
    };

    router.push(routeMap[section] || "/relatorios");
  }

  const currentSection = activeNav === "profile"
    ? accountSection
    : configSections.find((item) => item.id === activeConfig);
  const visibleNotifications = notificationItems.filter((item) => {
    if (notificationTab === "unread") return !item.read && !item.trash;
    if (notificationTab === "trash") return item.trash;
    return !item.trash;
  });
  const globalSearchResults = getGlobalSearchResults(globalSearchQuery);
  const globalSearchHint = getAiSearchHint(globalSearchQuery, globalSearchResults);

  const openGlobalSearchResult = (item) => {
    if (item.id === "notifications") {
      setNotificationsOpen(true);
    } else if (item.route) {
      router.push(item.route);
    }
    setGlobalSearchOpen(false);
    setGlobalSearchQuery("");
  };

  return (
    <main className={`${styles.appShell} ${collapsed ? styles.appShellCollapsed : ""}`.trim()}>
      <header className={styles.topbar}>
        <div className={styles.topbarGroup}>
          <div className={styles.menuWrap} ref={menuRef}>
            <button type="button" className={`${styles.topbarButton} ${menuOpen ? styles.topbarButtonActive : ""}`.trim()} onClick={() => setMenuOpen((value) => !value)} aria-expanded={menuOpen} aria-label="Menu"><MenuIcon /></button>
            {menuOpen ? <div className={styles.dropdownMenu} role="menu">{topMenuItems.map((item) => <button key={item} type="button" className={styles.dropdownItem} role="menuitem" onClick={() => setMenuOpen(false)}><span>{item}</span><kbd className={styles.shortcutHint}>{item.charAt(0)}</kbd></button>)}</div> : null}
          </div>
          <button type="button" className={styles.topbarButton} aria-label="Recolher barra lateral" onClick={() => setCollapsed((value) => !value)}><PanelsIcon /></button>
          <button type="button" className={styles.topbarButton} aria-label="Voltar" onClick={() => window.history.back()}><SimpleArrow /></button>
          <button type="button" className={styles.topbarButton} aria-label="Avançar" onClick={() => window.history.forward()}><SimpleArrow right /></button>
        </div>
        <div className={styles.topbarActions}>
          <button
            type="button"
            className={`${styles.topbarButton} ${styles.notificationButton} ${notificationsOpen ? styles.topbarButtonActive : ""}`.trim()}
            aria-label="Notificações"
            title="Notificações"
            onClick={() => setNotificationsOpen(true)}
          >
            <BellIcon />
          </button>
          <button
            type="button"
            className={styles.topbarButton}
            aria-label="Pesquisa geral com IA"
            title="Pesquisa geral com IA"
            onClick={() => setGlobalSearchOpen(true)}
          >
            <SearchIcon />
          </button>
          <button type="button" className={styles.aiButton} onClick={() => router.push("/ai-agent")} title="Agente de IA para análise completa do sistema respeitando perfil e acesso">
            <SparkIcon />
            <span>Agente de IA</span>
          </button>
          <button type="button" className={styles.logoutButton} onClick={() => setLogoutPromptOpen(true)}>
            <LogoutIcon />
            <span>Sair</span>
          </button>
        </div>
      </header>

      <aside className={styles.sidebar}>
        <div>
          <button type="button" className={styles.logoRow} onClick={() => router.push("/")}>
            <span className={styles.logoDark}>SALES</span>
            <span className={styles.logoAccent}>OPS</span>
          </button>
          <nav className={styles.navigation} aria-label="Principal">
            {navItems.slice(0, 3).map((item) => (
              <button key={item.id} type="button" onClick={() => navigateToMainSection(item.id)} className={`${styles.navItem} ${activeNav === item.id ? styles.navItemActive : ""}`.trim()} title={collapsed ? item.label : undefined}>
                <span className={styles.navIcon}>{getNavIcon(item.id)}</span>
                <span className={styles.navLabel}>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
        <div>
          <button type="button" onClick={() => navigateToMainSection("settings")} className={`${styles.navItem} ${styles.settingsItem} ${activeNav === "settings" && !profileViewOpen ? styles.navItemActive : ""}`.trim()} title={collapsed ? "Configurações" : undefined}>
            <span className={styles.navIcon}>{getNavIcon("settings")}</span>
            <span className={styles.navLabel}>Configurações</span>
          </button>
          <button
            type="button"
            className={`${styles.profileBox} ${profileViewOpen ? styles.profileBoxActive : ""}`.trim()}
            onClick={() => navigateToMainSection("profile")}
          >
            <div
              className={styles.profileAvatar}
              style={profilePhoto ? { backgroundImage: `url(${profilePhoto})` } : undefined}
            >
              {profilePhoto ? null : "?"}
            </div>
            <div className={styles.profileText}><div className={styles.profileName}>Usuário</div><div className={styles.profileRole}>Cargo</div></div>
          </button>
        </div>
      </aside>

      <section className={styles.content}>
        {activeNav === "settings" ? (
          <section className={styles.settingsLayout}>
            {!profileViewOpen ? (
              <aside className={styles.settingsSidebar}>
                <div className={styles.settingsSidebarTitle}>CONFIGURAÇÕES</div>
                <div className={styles.settingsSidebarList}>
                  {configSections.map((item) => (
                    <button key={item.id} type="button" onClick={() => { setActiveConfig(item.id); setProfileViewOpen(false); }} className={`${styles.settingsSidebarItem} ${activeConfig === item.id ? styles.settingsSidebarItemActive : ""}`.trim()}>
                      <span className={styles.settingsSidebarIcon}>{getConfigIcon(item.id)}</span>
                      <span className={styles.settingsSidebarLabel}>{item.label}</span>
                    </button>
                  ))}
                </div>
              </aside>
            ) : null}
            <div className={`${styles.settingsContent} ${profileViewOpen ? styles.settingsContentFull : ""}`.trim()}>
              <header className={styles.settingsHeader}>
                <h1>{currentSection?.label}</h1>
                <p>{currentSection?.description}</p>
              </header>
              {!dashboardData.configured && activeConfig === "hubspot" ? <div className={styles.integrationNotice}>{hubspotMessage}</div> : null}
              <SettingsContent section={activeConfig} personalization={personalization} updatePersonalization={updatePersonalization} profilePhoto={profilePhoto} onPhotoChange={handlePhotoChange} dashboardData={dashboardData} />
            </div>
          </section>
        ) : activeNav === "profile" ? (
          <section className={styles.profileLayout}>
            <div className={`${styles.settingsContent} ${styles.settingsContentFull}`.trim()}>
              <header className={styles.settingsHeader}>
                <h1>{accountSection.label}</h1>
                <p>{accountSection.description}</p>
              </header>
              <div className={styles.profileStandalone}>
                <SettingsContent section="account" personalization={personalization} updatePersonalization={updatePersonalization} profilePhoto={profilePhoto} onPhotoChange={handlePhotoChange} dashboardData={dashboardData} />
              </div>
            </div>
          </section>
        ) : dealId ? (
          <DealProfileContent dashboardData={dashboardData} dealId={dealId} />
        ) : sellerMeetingId ? (
          <SellerMeetingDetailContent dashboardData={dashboardData} sellerSlug={sellerSlug} meetingId={sellerMeetingId} />
        ) : sellerMeetingsView ? (
          <SellerMeetingsContent dashboardData={dashboardData} sellerSlug={sellerSlug} />
        ) : sellerSlug ? (
          <SellerProfileContent dashboardData={dashboardData} sellerSlug={sellerSlug} />
        ) : activeNav === "sellers" ? (
          <SellersContent dashboardData={dashboardData} />
        ) : activeNav === "reports" ? (
          <ReportsContent dashboardData={dashboardData} />
        ) : activeNav === "deals" ? (
          <DealsContent dashboardData={dashboardData} />
        ) : (
          <div className={styles.emptyState}><div className={styles.placeholderBadge}>Em breve</div><span>{navItems.find((item) => item.id === activeNav)?.label}</span></div>
        )}
      </section>

      {logoutPromptOpen ? (
        <div className={styles.logoutModalBackdrop} role="presentation" onClick={() => setLogoutPromptOpen(false)}>
          <div className={styles.logoutModal} role="dialog" aria-modal="true" aria-labelledby="logout-title" onClick={(event) => event.stopPropagation()}>
            <span className={styles.logoutEyebrow}>ENCERRAR SESSAO</span>
            <h2 id="logout-title">Deseja sair mesmo?</h2>
            <p>Ao continuar, você será redirecionado para a tela de login do SalesOps.</p>
            <div className={styles.logoutActions}>
              <button type="button" className={styles.logoutSecondaryButton} onClick={() => setLogoutPromptOpen(false)}>Cancelar</button>
              <button type="button" className={styles.logoutPrimaryButton} onClick={() => router.push("/login")}>Sair agora</button>
            </div>
          </div>
        </div>
      ) : null}

      {notificationsOpen ? (
        <div className={styles.notificationsBackdrop} role="presentation" onClick={() => setNotificationsOpen(false)}>
          <aside
            className={styles.notificationsPanel}
            role="dialog"
            aria-modal="true"
            aria-label="Notificacoes"
            onClick={(event) => event.stopPropagation()}
          >
            <header className={styles.notificationsHeader}>
              <h2>Notificações</h2>
              <button type="button" className={styles.notificationsClose} onClick={() => setNotificationsOpen(false)} aria-label="Fechar notificações">
                ×
              </button>
            </header>

            <div className={styles.notificationsTabs}>
              <button type="button" className={`${styles.notificationsTab} ${notificationTab === "unread" ? styles.notificationsTabActive : ""}`.trim()} onClick={() => setNotificationTab("unread")}>
                Não lidas (2)
              </button>
              <button type="button" className={`${styles.notificationsTab} ${notificationTab === "all" ? styles.notificationsTabActive : ""}`.trim()} onClick={() => setNotificationTab("all")}>
                Todos
              </button>
              <button type="button" className={`${styles.notificationsTab} ${notificationTab === "trash" ? styles.notificationsTabActive : ""}`.trim()} onClick={() => setNotificationTab("trash")}>
                Lixeira
              </button>
              <button type="button" className={styles.notificationsSettings} aria-label="Configurar notificações">
                {getConfigIcon("notifications")}
              </button>
            </div>

            <div className={styles.notificationsToolbar}>
              <label className={styles.notificationsCheckbox}>
                <input type="checkbox" />
                <span>Selecionar tudo</span>
              </label>
              <div className={styles.notificationsFilter}>
                <span>Tipo:</span>
                <button type="button">Todos</button>
              </div>
            </div>

            <div className={styles.notificationsList}>
              {visibleNotifications.map((item) => (
                <article key={item.id} className={styles.notificationRow}>
                  <label className={styles.notificationsCheckbox}>
                    <input type="checkbox" />
                  </label>
                  <div className={styles.notificationContent}>
                    <strong>{item.title}</strong>
                    {item.tag ? <span className={styles.notificationTag}>{item.tag}</span> : null}
                  </div>
                  <small>{item.age}</small>
                </article>
              ))}
            </div>
          </aside>
        </div>
      ) : null}

      {globalSearchOpen ? (
        <div className={styles.globalSearchBackdrop} role="presentation" onClick={() => setGlobalSearchOpen(false)}>
          <section
            className={styles.globalSearchPanel}
            role="dialog"
            aria-modal="true"
            aria-label="Pesquisa geral do sistema"
            onClick={(event) => event.stopPropagation()}
          >
            <header className={styles.globalSearchHeader}>
              <div>
                <h2>Pesquisa geral</h2>
                <p>Busque no sistema e use sugestões de IA para chegar mais rápido.</p>
              </div>
              <button type="button" className={styles.globalSearchClose} onClick={() => setGlobalSearchOpen(false)}>
                Fechar
              </button>
            </header>

            <input
              type="text"
              autoFocus
              className={styles.globalSearchInput}
              value={globalSearchQuery}
              onChange={(event) => setGlobalSearchQuery(event.target.value)}
              placeholder="Ex.: pipeline parado, vendedor com risco, métricas do mês..."
            />

            <div className={styles.globalSearchAiHint}>
              <span>IA</span>
              <p>{globalSearchHint}</p>
            </div>

            <div className={styles.globalSearchResults}>
              {globalSearchResults.length ? globalSearchResults.map((item) => (
                <button key={item.id} type="button" className={styles.globalSearchResultItem} onClick={() => openGlobalSearchResult(item)}>
                  <strong>{item.label}</strong>
                  <span>{item.description}</span>
                </button>
              )) : (
                <p className={styles.globalSearchEmpty}>Sem resultado direto para esse termo.</p>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}


