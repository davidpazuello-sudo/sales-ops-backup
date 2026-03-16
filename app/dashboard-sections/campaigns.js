"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, Metric, PageTitle, SimpleArrow } from "../dashboard-ui";
import PageAgentPanel, { PageAgentToggleButton } from "../page-agent-panel";
import {
  SectionEmptyState,
  SectionNotice,
} from "../dashboard-section-feedback";
import styles from "../page.module.css";
import {
  normalizeCampaignLabel,
} from "lib/services/dashboard-campaigns";

const EMPTY_CAMPAIGNS = [];
const EMPTY_CAMPAIGN_OPTIONS = [];
const OVERVIEW_DETAIL_CONFIG = {
  callsDaily: {
    eyebrow: "SDR",
    title: "Contatos conectados hoje",
    description: "Contatos da campanha com chamada no dia",
    columns: ["Proprietario", "Lead", "Data", "Status"],
    columnTemplate: "minmax(180px, 1.1fr) minmax(320px, 2.35fr) minmax(210px, 1.3fr) minmax(180px, 1fr)",
  },
  callsWeekly: {
    eyebrow: "SDR",
    title: "Chamadas na semana",
    description: "Chamadas da semana na campanha",
    columns: ["Proprietario", "Lead", "Data", "Status"],
    columnTemplate: "minmax(180px, 1.1fr) minmax(320px, 2.35fr) minmax(210px, 1.3fr) minmax(180px, 1fr)",
  },
  connectionsDaily: {
    eyebrow: "SDR",
    title: "Conexoes hoje",
    description: "Chamadas registradas no dia na campanha",
    columns: ["Proprietario", "Lead", "Data", "Status"],
    columnTemplate: "minmax(180px, 1.1fr) minmax(320px, 2.35fr) minmax(210px, 1.3fr) minmax(180px, 1fr)",
  },
  connectionsWeekly: {
    eyebrow: "SDR",
    title: "Conexoes na semana",
    description: "Conexoes da semana na campanha",
    columns: ["Proprietario", "Lead", "Data", "Status"],
    columnTemplate: "minmax(180px, 1.1fr) minmax(320px, 2.35fr) minmax(210px, 1.3fr) minmax(180px, 1fr)",
  },
  firstAttemptContacts: {
    eyebrow: "SDR",
    title: "1a tentativa",
    description: "Contatos na primeira tentativa",
    columns: ["Proprietario", "Lead", "Detalhe", "Status"],
    columnTemplate: "minmax(180px, 1.1fr) minmax(360px, 2.65fr) minmax(260px, 1.7fr) minmax(210px, 1.1fr)",
  },
  secondAttemptContacts: {
    eyebrow: "SDR",
    title: "2a tentativa",
    description: "Contatos na segunda tentativa",
    columns: ["Proprietario", "Lead", "Detalhe", "Status"],
    columnTemplate: "minmax(180px, 1.1fr) minmax(360px, 2.65fr) minmax(260px, 1.7fr) minmax(210px, 1.1fr)",
  },
  thirdAttemptContacts: {
    eyebrow: "SDR",
    title: "3a tentativa",
    description: "Contatos na terceira tentativa",
    columns: ["Proprietario", "Lead", "Detalhe", "Status"],
    columnTemplate: "minmax(180px, 1.1fr) minmax(360px, 2.65fr) minmax(260px, 1.7fr) minmax(210px, 1.1fr)",
  },
  fourthAttemptContacts: {
    eyebrow: "SDR",
    title: "4a tentativa+",
    description: "Contatos na quarta tentativa ou mais",
    columns: ["Proprietario", "Lead", "Detalhe", "Status"],
    columnTemplate: "minmax(180px, 1.1fr) minmax(360px, 2.65fr) minmax(260px, 1.7fr) minmax(210px, 1.1fr)",
  },
  wrongNumbers: {
    eyebrow: "SDR",
    title: "Numeros errados",
    description: "Contatos marcados com numero errado",
    columns: ["Proprietario", "Lead", "Detalhe", "Status"],
    columnTemplate: "minmax(180px, 1.1fr) minmax(360px, 2.65fr) minmax(260px, 1.7fr) minmax(210px, 1.1fr)",
  },
  updatedPhones: {
    eyebrow: "SDR",
    title: "Telefone atualizado",
    description: "Contatos com telefone atualizado",
    columns: ["Proprietario", "Lead", "Detalhe", "Status"],
    columnTemplate: "minmax(180px, 1.1fr) minmax(360px, 2.65fr) minmax(260px, 1.7fr) minmax(210px, 1.1fr)",
  },
  disqualifiedNumbers: {
    eyebrow: "SDR",
    title: "Numeros desqualificados",
    description: "Contatos desqualificados na campanha",
    columns: ["Proprietario", "Lead", "Detalhe", "Status"],
    columnTemplate: "minmax(180px, 1.1fr) minmax(360px, 2.65fr) minmax(260px, 1.7fr) minmax(210px, 1.1fr)",
  },
  totalLeads: {
    eyebrow: "LEADS",
    title: "Total de leads",
    description: "Leads mapeados na campanha",
    columns: ["Proprietario", "Lead", "Detalhe", "Status"],
    columnTemplate: "minmax(180px, 1.1fr) minmax(360px, 2.65fr) minmax(280px, 1.8fr) minmax(190px, 1fr)",
  },
  leadStage: {
    eyebrow: "QUALIFICACAO",
    title: "Lead",
    description: "Contatos em etapa Lead",
    columns: ["Proprietario", "Lead", "Detalhe", "Status"],
    columnTemplate: "minmax(180px, 1.1fr) minmax(360px, 2.65fr) minmax(280px, 1.8fr) minmax(190px, 1fr)",
  },
  prospects: {
    eyebrow: "QUALIFICACAO",
    title: "Prospect",
    description: "Contatos em etapa Prospect",
    columns: ["Proprietario", "Lead", "Detalhe", "Status"],
    columnTemplate: "minmax(180px, 1.1fr) minmax(360px, 2.65fr) minmax(280px, 1.8fr) minmax(190px, 1fr)",
  },
  uncontactedLeads: {
    eyebrow: "SQLS",
    title: "Leads sem contato",
    description: "Leads sem registro de chamada",
    columns: ["Proprietario", "Lead", "Detalhe", "Status"],
    columnTemplate: "minmax(180px, 1.1fr) minmax(360px, 2.65fr) minmax(280px, 1.8fr) minmax(190px, 1fr)",
  },
  sqls: {
    eyebrow: "SQLS",
    title: "Leads qualificados",
    description: "Leads qualificados por vendas",
    columns: ["Proprietario", "Lead", "Detalhe", "Status"],
    columnTemplate: "minmax(180px, 1.1fr) minmax(360px, 2.65fr) minmax(280px, 1.8fr) minmax(190px, 1fr)",
  },
  mqls: {
    eyebrow: "QUALIFICACAO",
    title: "MQLs",
    description: "Leads de marketing da campanha",
    columns: ["Proprietario", "Lead", "Detalhe", "Status"],
    columnTemplate: "minmax(180px, 1.1fr) minmax(360px, 2.65fr) minmax(280px, 1.8fr) minmax(190px, 1fr)",
  },
  qualificationConversion: {
    eyebrow: "QUALIFICACAO",
    title: "Taxa MQL > SQL",
    description: "Base de conversao de MQL para SQL",
    columns: ["Proprietario", "Lead", "Detalhe", "Status"],
    columnTemplate: "minmax(180px, 1.1fr) minmax(360px, 2.65fr) minmax(280px, 1.8fr) minmax(190px, 1fr)",
  },
  meetings: {
    eyebrow: "REUNIOES",
    title: "Reunioes da campanha",
    description: "Reunioes sincronizadas da HubSpot",
    columns: ["Proprietario", "Lead", "Data", "Status"],
    columnTemplate: "minmax(180px, 1.1fr) minmax(320px, 2.35fr) minmax(210px, 1.3fr) minmax(180px, 1fr)",
  },
  proposals: {
    eyebrow: "VENDAS",
    title: "Propostas",
    description: "Negocios em etapa de proposta",
    columns: ["Proprietario", "Negocio", "Valor", "Status"],
    columnTemplate: "minmax(180px, 1.1fr) minmax(400px, 2.7fr) minmax(180px, 1.15fr) minmax(220px, 1.2fr)",
  },
  closedWon: {
    eyebrow: "FECHADOS",
    title: "Negocios fechados",
    description: "Contratos fechados na campanha",
    columns: ["Proprietario", "Negocio", "Valor", "Status"],
    columnTemplate: "minmax(180px, 1.1fr) minmax(400px, 2.7fr) minmax(180px, 1.15fr) minmax(220px, 1.2fr)",
  },
  salesConversion: {
    eyebrow: "VENDAS",
    title: "Taxa proposta > fechamento",
    description: "Base de conversao de propostas em fechamentos",
    columns: ["Proprietario", "Negocio", "Valor", "Status"],
    columnTemplate: "minmax(180px, 1.1fr) minmax(400px, 2.7fr) minmax(180px, 1.15fr) minmax(220px, 1.2fr)",
  },
  qualifiedOpportunities: {
    eyebrow: "OPORTUNIDADES",
    title: "Oportunidades qualificadas",
    description: "Negocios qualificados em aberto na campanha",
    columns: ["Proprietario", "Negocio", "Valor", "Status"],
    columnTemplate: "minmax(180px, 1.1fr) minmax(400px, 2.7fr) minmax(180px, 1.15fr) minmax(220px, 1.2fr)",
  },
};

function formatDateTime(value) {
  if (!value) {
    return "Sem atividade recente";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Sem atividade recente";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function buildPopupPaginationItems(totalPages, currentPage) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => ({
      type: "page",
      value: index + 1,
    }));
  }

  const items = [
    { type: "page", value: 1 },
    { type: "page", value: 2 },
  ];
  const middleStart = Math.max(3, currentPage - 1);
  const middleEnd = Math.min(totalPages - 1, currentPage + 1);

  if (middleStart > 3) {
    items.push({ type: "ellipsis", value: "ellipsis-before" });
  }

  for (let page = middleStart; page <= middleEnd; page += 1) {
    if (!items.some((item) => item.type === "page" && item.value === page)) {
      items.push({ type: "page", value: page });
    }
  }

  if (middleEnd < totalPages - 1) {
    items.push({ type: "ellipsis", value: "ellipsis-after" });
  }

  if (!items.some((item) => item.type === "page" && item.value === totalPages)) {
    items.push({ type: "page", value: totalPages });
  }

  return items;
}

function GoalList({ goals }) {
  return (
    <div className={styles.campaignGoalList}>
      {goals.map((goal) => (
        <article key={goal.id} className={styles.campaignGoalItem}>
          <div className={styles.campaignGoalHeader}>
            <div>
              <strong>{goal.label}</strong>
              <span>{goal.status}</span>
            </div>
            <div className={styles.campaignGoalMeta}>
              <strong>{`${goal.current}/${goal.target}`}</strong>
              <small>{goal.remaining ? `Faltam ${goal.remaining}` : "Meta batida"}</small>
            </div>
          </div>
          <div className={styles.campaignGoalBar} aria-hidden="true">
            <span className={styles.campaignGoalBarFill} style={{ width: `${Math.min(goal.progress, 100)}%` }} />
          </div>
        </article>
      ))}
    </div>
  );
}

function formatDateBucket(value, mode = "day") {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  if (mode === "week") {
    const weekStart = new Date(date);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    return weekStart.toISOString().slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
}

function renderCampaignDetailRows(detailKey, summary) {
  if (!summary) {
    return [];
  }

  if (detailKey === "callsDaily") {
    const today = formatDateBucket(new Date().toISOString(), "day");
    return (summary.prospecting.callItems || []).filter((item) => formatDateBucket(item.dateValue, "day") === today);
  }

  if (detailKey === "callsWeekly") {
    const currentWeek = formatDateBucket(new Date().toISOString(), "week");
    return (summary.prospecting.callItems || []).filter((item) => formatDateBucket(item.dateValue, "week") === currentWeek);
  }

  if (detailKey === "connectionsDaily") {
    const today = formatDateBucket(new Date().toISOString(), "day");
    return (summary.prospecting.callItems || []).filter((item) => formatDateBucket(item.dateValue, "day") === today);
  }

  if (detailKey === "connectionsWeekly") {
    const currentWeek = formatDateBucket(new Date().toISOString(), "week");
    return (summary.prospecting.connectionItems || []).filter((item) => formatDateBucket(item.dateValue, "week") === currentWeek);
  }

  if (detailKey === "firstAttemptContacts") {
    return summary.prospecting.firstAttemptItems || [];
  }

  if (detailKey === "secondAttemptContacts") {
    return summary.prospecting.secondAttemptItems || [];
  }

  if (detailKey === "thirdAttemptContacts") {
    return summary.prospecting.thirdAttemptItems || [];
  }

  if (detailKey === "fourthAttemptContacts") {
    return summary.prospecting.fourthAttemptItems || [];
  }

  if (detailKey === "wrongNumbers") {
    return summary.prospecting.wrongNumberItems || [];
  }

  if (detailKey === "updatedPhones") {
    return summary.prospecting.updatedPhoneItems || [];
  }

  if (detailKey === "disqualifiedNumbers") {
    return summary.prospecting.disqualifiedNumberItems || [];
  }

  if (detailKey === "totalLeads") {
    return summary.qualification.totalLeadItems || [];
  }

  if (detailKey === "leadStage") {
    return summary.qualification.leadItems || [];
  }

  if (detailKey === "prospects") {
    return summary.qualification.prospectItems || [];
  }

  if (detailKey === "uncontactedLeads") {
    return summary.qualification.uncontactedLeadItems || [];
  }

  if (detailKey === "mqls" || detailKey === "qualificationConversion") {
    return summary.qualification.mqlLeadItems || [];
  }

  if (detailKey === "sqls") {
    return summary.qualification.sqlLeadItems || [];
  }

  if (detailKey === "meetings") {
    return summary.meetings || [];
  }

  if (detailKey === "closedWon") {
    return summary.sales.closedWonItems || [];
  }

  if (detailKey === "proposals" || detailKey === "salesConversion") {
    return summary.sales.proposalItems || [];
  }

  if (detailKey === "qualifiedOpportunities") {
    return summary.qualifiedOpportunityItems || [];
  }

  return [];
}

function CampaignMetricButton({ title, value, note, onClick, expanded = false }) {
  return (
    <button
      type="button"
      className={`${styles.metric} ${styles.metricButton}`.trim()}
      onClick={onClick}
      aria-haspopup="dialog"
      aria-expanded={expanded}
    >
      <span>{title}</span>
      <strong>{value}</strong>
      {note ? <small>{note}</small> : null}
    </button>
  );
}

function getDetailCellValues(detailKey, item) {
  if (["proposals", "closedWon", "salesConversion", "qualifiedOpportunities"].includes(detailKey)) {
    return [
      item.ownerName || "Sem proprietario",
      item.recordName || "Negocio sem nome",
      item.detailLabel || "Sem valor",
      item.statusLabel || "Sem status",
    ];
  }

  return [
    item.ownerName || "Sem proprietario",
    item.leadName || item.recordName || "Sem registro",
    item.dateLabel || item.detailLabel || "Sem detalhe",
    item.statusLabel || "Sem status",
  ];
}

function normalizeCampaignSearchValue(value) {
  return String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function resolveCampaignOptionLabel(options = [], value = "") {
  const normalizedValue = normalizeCampaignSearchValue(value);
  if (!normalizedValue) {
    return "";
  }

  const exactOption = options.find((option) => normalizeCampaignSearchValue(option?.label) === normalizedValue);
  return exactOption?.label || "";
}

export function CampaignsContent({ dashboardData }) {
  const router = useRouter();
  const [agentOpen, setAgentOpen] = useState(false);
  const [activeDetail, setActiveDetail] = useState("");
  const [detailPageByKey, setDetailPageByKey] = useState({});
  const [detailRowsByKey, setDetailRowsByKey] = useState({});
  const [detailLoadingKey, setDetailLoadingKey] = useState("");
  const [detailError, setDetailError] = useState("");
  const [campaignOptions, setCampaignOptions] = useState(EMPTY_CAMPAIGN_OPTIONS);
  const [campaignOptionsLoading, setCampaignOptionsLoading] = useState(false);
  const [campaignOptionsError, setCampaignOptionsError] = useState("");
  const [selectedCampaignDraft, setSelectedCampaignDraft] = useState("");
  const [isFilterPending, startFilterTransition] = useTransition();
  const campaigns = Array.isArray(dashboardData.campaigns) ? dashboardData.campaigns : EMPTY_CAMPAIGNS;
  const summary = campaigns[0] || null;
  const loadingState = dashboardData.states?.loading || "ready";
  const stateErrors = dashboardData.states?.errors || [];
  const primaryErrorMessage = String(stateErrors[0] || "").trim();
  const duplicatedErrorMessage = primaryErrorMessage && primaryErrorMessage === String(campaignOptionsError || "").trim();
  const normalizedSummaryName = useMemo(() => normalizeCampaignLabel(summary?.name), [summary?.name]);
  const activeDetailConfig = OVERVIEW_DETAIL_CONFIG[activeDetail] || null;
  const activeDetailCacheKey = activeDetail ? `${normalizedSummaryName || "sem-campanha"}::${activeDetail}` : "";
  const activeDetailRows = activeDetailCacheKey ? detailRowsByKey[activeDetailCacheKey] || [] : [];
  const activeDetailPage = activeDetailCacheKey ? detailPageByKey[activeDetailCacheKey] || 1 : 1;
  const detailPageSize = 10;
  const resolvedCampaignSelection = resolveCampaignOptionLabel(campaignOptions, selectedCampaignDraft);
  const activeDetailTotalPages = Math.max(1, Math.ceil(activeDetailRows.length / detailPageSize));
  const popupPaginationItems = useMemo(
    () => buildPopupPaginationItems(activeDetailTotalPages, activeDetailPage),
    [activeDetailPage, activeDetailTotalPages],
  );
  const paginatedDetailRows = activeDetailRows.slice(
    (activeDetailPage - 1) * detailPageSize,
    activeDetailPage * detailPageSize,
  );

  useEffect(() => {
    let cancelled = false;

    async function loadCampaignOptions() {
      setCampaignOptionsLoading(true);
      setCampaignOptionsError("");

      try {
        const response = await fetch("/api/hubspot/dashboard?scope=campaigns&campaignOptions=1", {
          cache: "no-store",
        });
        const payload = await response.json().catch(() => null);

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          setCampaignOptions([]);
          setCampaignOptionsError(payload?.error || "Nao foi possivel carregar as campanhas da HubSpot.");
          return;
        }

        setCampaignOptions(Array.isArray(payload?.campaignOptions) ? payload.campaignOptions : []);
      } catch {
        if (!cancelled) {
          setCampaignOptions([]);
          setCampaignOptionsError("Nao foi possivel carregar as campanhas da HubSpot.");
        }
      } finally {
        if (!cancelled) {
          setCampaignOptionsLoading(false);
        }
      }
    }

    loadCampaignOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (normalizedSummaryName) {
      setSelectedCampaignDraft(normalizedSummaryName);
    }
  }, [normalizedSummaryName]);

  useEffect(() => {
    setActiveDetail("");
    setDetailError("");
    setDetailLoadingKey("");
  }, [normalizedSummaryName]);

  async function handleOpenDetail(detailKey) {
    const detailCacheKey = `${normalizedSummaryName || "sem-campanha"}::${detailKey}`;
    setActiveDetail(detailKey);
    setDetailError("");
    setDetailPageByKey((current) => ({
      ...current,
      [detailCacheKey]: 1,
    }));

    if (detailRowsByKey[detailCacheKey]) {
      return;
    }

    setDetailLoadingKey(detailCacheKey);

    try {
      const searchParams = new URLSearchParams({
        scope: "campaigns",
        campaignDetail: detailKey,
      });

      if (summary?.name) {
        searchParams.set("campaign", summary.name);
      }

      const response = await fetch(`/api/hubspot/dashboard?${searchParams.toString()}`, {
        cache: "no-store",
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setDetailError(payload?.error || "Nao foi possivel carregar os detalhes deste indicador.");
        return;
      }

      const detailSummary = Array.isArray(payload?.campaigns) ? payload.campaigns[0] || null : null;
      setDetailRowsByKey((current) => ({
        ...current,
        [detailCacheKey]: renderCampaignDetailRows(detailKey, detailSummary),
      }));
    } catch {
      setDetailError("Nao foi possivel carregar os detalhes deste indicador.");
    } finally {
      setDetailLoadingKey("");
    }
  }

  function handleApplyCampaignFilter() {
    const resolvedCampaignName = resolvedCampaignSelection;
    if (!resolvedCampaignName) {
      return;
    }

    startFilterTransition(() => {
      router.push(`/campanhas?campanha=${encodeURIComponent(resolvedCampaignName)}`);
    });
  }

  return (
    <section className={styles.dashboardSection}>
      <header className={styles.sectionHeaderBar}>
        <div className={styles.settingsHeader}>
          <PageTitle loading={loadingState === "loading"} loadingLabel="Carregando campanha da HubSpot">
            Campanhas
          </PageTitle>
        </div>
        <PageAgentToggleButton agentId="campaigns" open={agentOpen} onToggle={() => setAgentOpen((value) => !value)} />
      </header>

      <div className={styles.campaignFilterBar}>
        <label className={styles.campaignFilterField}>
          <span>Escolher campanha</span>
          <input
            type="text"
            list="campaigns-hubspot-options"
            className={styles.campaignFilterInput}
            placeholder={campaignOptionsLoading ? "Carregando campanhas da HubSpot..." : "Buscar campanha"}
            value={selectedCampaignDraft}
            onChange={(event) => setSelectedCampaignDraft(event.target.value)}
            disabled={campaignOptionsLoading || isFilterPending}
          />
          <datalist id="campaigns-hubspot-options">
            {campaignOptions.map((option) => (
              <option key={option.id || option.label} value={option.label} />
            ))}
          </datalist>
        </label>

        <button
          type="button"
          className={`${styles.primaryActionButton} ${styles.filterApplyButton}`.trim()}
          onClick={handleApplyCampaignFilter}
          disabled={!resolvedCampaignSelection || campaignOptionsLoading || isFilterPending}
        >
          Filtrar
        </button>
      </div>

      {campaignOptionsError && !duplicatedErrorMessage ? (
        <SectionNotice variant="error">{campaignOptionsError}</SectionNotice>
      ) : null}

      {agentOpen ? (
        <div className={styles.grid}>
          <PageAgentPanel
            agentId="campaigns"
            dashboardData={dashboardData}
            context={{ campaignId: summary?.id || "" }}
          />
        </div>
      ) : null}

      {primaryErrorMessage ? (
        <SectionNotice variant="error">{primaryErrorMessage || "A campanha ainda nao conseguiu carregar dados reais."}</SectionNotice>
      ) : null}

      {!summary && loadingState === "ready" && !primaryErrorMessage ? (
        <SectionEmptyState
          title={`Campanha ${selectedCampaignDraft || "selecionada"} sem dados sincronizados`}
          description="Assim que a HubSpot trouxer deals, contatos e atividades da campanha escolhida, o acompanhamento vai aparecer aqui."
        />
      ) : null}

      {summary ? (
        <div className={styles.grid}>
          <Card eyebrow="VISAO GERAL" title={summary.name} wide>
            <div className={styles.metrics}>
              <CampaignMetricButton
                title="Total de leads"
                value={`${summary.qualification.totalLeads}`}
                note="Base total mapeada na campanha"
                onClick={() => handleOpenDetail("totalLeads")}
                expanded={activeDetail === "totalLeads"}
              />
              <CampaignMetricButton
                title="SQLs"
                value={`${summary.qualification.sqlCount}`}
                note="Meta da campanha: 40"
                onClick={() => handleOpenDetail("sqls")}
                expanded={activeDetail === "sqls"}
              />
              <CampaignMetricButton
                title="Reunioes"
                value={`${summary.meetingCount}`}
                note="Meta da campanha: 70"
                onClick={() => handleOpenDetail("meetings")}
                expanded={activeDetail === "meetings"}
              />
              <CampaignMetricButton
                title="Fechados"
                value={`${summary.sales.closedWonCount}`}
                note="Meta da campanha: 15"
                onClick={() => handleOpenDetail("closedWon")}
                expanded={activeDetail === "closedWon"}
              />
              <CampaignMetricButton
                title="Oportunidades qualificadas"
                value={`${summary.qualifiedOpportunityCount}`}
                note="Objetivo principal: 65"
                onClick={() => handleOpenDetail("qualifiedOpportunities")}
                expanded={activeDetail === "qualifiedOpportunities"}
              />
            </div>
            <div className={styles.campaignSummaryMeta}>
              <span>{`Ultima atividade: ${formatDateTime(summary.lastActivityAt)}`}</span>
              <span>{`Conversao MQL > SQL: ${summary.qualification.conversionRate}%`}</span>
              <span>{`Conversao proposta > fechamento: ${summary.sales.conversionRate}%`}</span>
            </div>
          </Card>

          <Card eyebrow="SDR" title="Relatorios de prospeccao e atividade" wide>
            <div className={`${styles.metrics} ${styles.campaignProspectingMetrics}`.trim()}>
              <CampaignMetricButton
                title="Contatos conectados hoje"
                value={`${summary.prospecting.callsDaily}`}
                onClick={() => handleOpenDetail("callsDaily")}
                expanded={activeDetail === "callsDaily"}
              />
              <CampaignMetricButton
                title="Chamadas na semana"
                value={`${summary.prospecting.callsWeekly}`}
                onClick={() => handleOpenDetail("callsWeekly")}
                expanded={activeDetail === "callsWeekly"}
              />
              <CampaignMetricButton
                title="Conexoes hoje"
                value={`${summary.prospecting.connectionsDaily}`}
                onClick={() => handleOpenDetail("connectionsDaily")}
                expanded={activeDetail === "connectionsDaily"}
              />
              <CampaignMetricButton
                title="Conexoes na semana"
                value={`${summary.prospecting.connectionsWeekly}`}
                onClick={() => handleOpenDetail("connectionsWeekly")}
                expanded={activeDetail === "connectionsWeekly"}
              />
              <CampaignMetricButton
                title="1a tentativa"
                value={`${summary.prospecting.firstAttemptCount || 0}`}
                onClick={() => handleOpenDetail("firstAttemptContacts")}
                expanded={activeDetail === "firstAttemptContacts"}
              />
              <CampaignMetricButton
                title="2a tentativa"
                value={`${summary.prospecting.secondAttemptCount || 0}`}
                onClick={() => handleOpenDetail("secondAttemptContacts")}
                expanded={activeDetail === "secondAttemptContacts"}
              />
              <CampaignMetricButton
                title="3a tentativa"
                value={`${summary.prospecting.thirdAttemptCount || 0}`}
                onClick={() => handleOpenDetail("thirdAttemptContacts")}
                expanded={activeDetail === "thirdAttemptContacts"}
              />
              <CampaignMetricButton
                title="4a tentativa+"
                value={`${summary.prospecting.fourthAttemptCount || 0}`}
                onClick={() => handleOpenDetail("fourthAttemptContacts")}
                expanded={activeDetail === "fourthAttemptContacts"}
              />
              <CampaignMetricButton
                title="Numeros errados"
                value={`${summary.prospecting.wrongNumbersCount || 0}`}
                onClick={() => handleOpenDetail("wrongNumbers")}
                expanded={activeDetail === "wrongNumbers"}
              />
              <CampaignMetricButton
                title="Telefone atualizado"
                value={`${summary.prospecting.updatedPhoneCount || 0}`}
                onClick={() => handleOpenDetail("updatedPhones")}
                expanded={activeDetail === "updatedPhones"}
              />
              <CampaignMetricButton
                title="Numeros desqualificados"
                value={`${summary.prospecting.disqualifiedNumbersCount || 0}`}
                onClick={() => handleOpenDetail("disqualifiedNumbers")}
                expanded={activeDetail === "disqualifiedNumbers"}
              />
            </div>
          </Card>

          <Card eyebrow="QUALIFICACAO" title="Relatorios de qualificacao e conversao">
            <div className={styles.metrics}>
              <CampaignMetricButton
                title="Total de leads"
                value={`${summary.qualification.totalLeads}`}
                note="Base total de contatos da campanha"
                onClick={() => handleOpenDetail("totalLeads")}
                expanded={activeDetail === "totalLeads"}
              />
              <CampaignMetricButton
                title="Lead"
                value={`${summary.qualification.leadCount || 0}`}
                note="Contatos em etapa Lead"
                onClick={() => handleOpenDetail("leadStage")}
                expanded={activeDetail === "leadStage"}
              />
              <CampaignMetricButton
                title="Prospect"
                value={`${summary.qualification.prospectCount || 0}`}
                note="Contatos em etapa Prospect"
                onClick={() => handleOpenDetail("prospects")}
                expanded={activeDetail === "prospects"}
              />
              <CampaignMetricButton
                title="MQLs"
                value={`${summary.qualification.mqlCount}`}
                note="Leads de marketing mapeados"
                onClick={() => handleOpenDetail("mqls")}
                expanded={activeDetail === "mqls"}
              />
              <CampaignMetricButton
                title="SQLs"
                value={`${summary.qualification.sqlCount}`}
                note="Meta da campanha: 40 ate 17/05/2026"
                onClick={() => handleOpenDetail("sqls")}
                expanded={activeDetail === "sqls"}
              />
              <CampaignMetricButton
                title="Taxa MQL > SQL"
                value={`${summary.qualification.conversionRate}%`}
                note="Efetividade da qualificacao SDR"
                onClick={() => handleOpenDetail("qualificationConversion")}
                expanded={activeDetail === "qualificationConversion"}
              />
            </div>
          </Card>

          <Card eyebrow="VENDAS" title="Relatorios de desempenho e fechamento">
            <div className={styles.metrics}>
              <CampaignMetricButton
                title="Propostas"
                value={`${summary.sales.proposalCount}`}
                note="Deals em etapa de proposta"
                onClick={() => handleOpenDetail("proposals")}
                expanded={activeDetail === "proposals"}
              />
              <CampaignMetricButton
                title="Fechados"
                value={`${summary.sales.closedWonCount}`}
                note="Meta da campanha: 15"
                onClick={() => handleOpenDetail("closedWon")}
                expanded={activeDetail === "closedWon"}
              />
              <CampaignMetricButton
                title="Taxa proposta > fechamento"
                value={`${summary.sales.conversionRate}%`}
                note="Eficacia do fechamento"
                onClick={() => handleOpenDetail("salesConversion")}
                expanded={activeDetail === "salesConversion"}
              />
            </div>
          </Card>

          <Card eyebrow="METAS SMART" title="Acompanhamento macro da campanha" wide>
            <GoalList goals={summary.smartGoals} />
          </Card>
        </div>
      ) : null}

      {summary && activeDetailConfig ? (
        <div className={styles.stageModalBackdrop} role="presentation" onClick={() => setActiveDetail("")}>
          <div
            className={`${styles.stageModal} ${styles.campaignReportModal}`.trim()}
            role="dialog"
            aria-modal="true"
            aria-label={`${activeDetailConfig.title} da campanha ${summary.name}`}
            onClick={(event) => event.stopPropagation()}
          >
            <header className={styles.campaignReportHeader}>
              <h3>Detalhes do relatorio</h3>
              <button
                type="button"
                className={styles.campaignReportClose}
                onClick={() => setActiveDetail("")}
                aria-label="Fechar detalhes"
              >
                ×
              </button>
            </header>

            <div className={styles.campaignReportBody}>
              <div className={styles.campaignReportBreadcrumb}>
                <span>{summary.name}</span>
                <span>›</span>
                <span>{activeDetailConfig.title}</span>
              </div>

              <div className={styles.campaignReportMetaBar}>
                <div className={styles.campaignReportMetaPrimary}>
                  <strong>{activeDetailRows.length} linhas</strong>
                  <span>{activeDetailConfig.description}</span>
                </div>
              </div>

              {detailLoadingKey === activeDetailCacheKey ? (
                <div className={styles.campaignDetailLoadingState} role="status" aria-live="polite">
                  <span className={styles.sectionLoadingSpinner} aria-hidden="true" />
                  <strong>Carregando detalhes da HubSpot</strong>
                </div>
              ) : detailError ? (
                <SectionNotice variant="error">{detailError}</SectionNotice>
              ) : activeDetailRows.length ? (
                <>
                  <div className={styles.campaignReportTableFrame}>
                    <div
                      className={`${styles.campaignReportGrid} ${styles.campaignReportTableHead}`.trim()}
                      style={{ "--campaign-report-columns": activeDetailConfig.columnTemplate }}
                    >
                      {activeDetailConfig.columns.map((column) => <span key={column}>{column}</span>)}
                    </div>
                    <div className={styles.campaignTableBody}>
                      {paginatedDetailRows.map((item) => {
                        const cellValues = getDetailCellValues(activeDetail, item);

                        return (
                          <article
                            key={item.id}
                            className={`${styles.campaignReportGrid} ${styles.campaignReportTableRow}`.trim()}
                            style={{ "--campaign-report-columns": activeDetailConfig.columnTemplate }}
                          >
                            {cellValues.map((value, index) => (
                              <div key={`${item.id}-${index}`} className={styles.campaignReportCell}>
                                <strong className={styles.campaignTableCellValue} title={value}>{value}</strong>
                              </div>
                            ))}
                          </article>
                        );
                      })}
                    </div>
                  </div>
                  <div className={styles.campaignReportFooter}>
                    {activeDetailTotalPages > 1 ? (
                      <div className={styles.popupPaginationBar}>
                        <nav className={styles.popupPagination} aria-label={`Paginacao de ${activeDetailConfig.title}`}>
                          <button
                            type="button"
                            className={styles.popupPaginationNav}
                            onClick={() => setDetailPageByKey((current) => ({
                              ...current,
                              [activeDetailCacheKey]: Math.max(1, activeDetailPage - 1),
                            }))}
                            disabled={activeDetailPage === 1}
                          >
                            <SimpleArrow />
                            <span>Voltar</span>
                          </button>

                          <div className={styles.popupPaginationPages}>
                            {popupPaginationItems.map((item) => {
                              if (item.type === "ellipsis") {
                                return (
                                  <span key={item.value} className={styles.popupPaginationEllipsis} aria-hidden="true">
                                    ...
                                  </span>
                                );
                              }

                              const page = item.value;
                              const isCurrentPage = activeDetailPage === page;

                              return (
                                <button
                                  key={page}
                                  type="button"
                                  className={`${styles.popupPaginationPage} ${isCurrentPage ? styles.popupPaginationPageActive : ""}`.trim()}
                                  onClick={() => setDetailPageByKey((current) => ({
                                    ...current,
                                    [activeDetailCacheKey]: page,
                                  }))}
                                  aria-current={isCurrentPage ? "page" : undefined}
                                  aria-label={`Ir para pagina ${page}`}
                                >
                                  {page}
                                </button>
                              );
                            })}
                          </div>

                          <button
                            type="button"
                            className={styles.popupPaginationNav}
                            onClick={() => setDetailPageByKey((current) => ({
                              ...current,
                              [activeDetailCacheKey]: Math.min(activeDetailTotalPages, activeDetailPage + 1),
                            }))}
                            disabled={activeDetailPage === activeDetailTotalPages}
                          >
                            <span>Proximo</span>
                            <SimpleArrow right />
                          </button>
                        </nav>
                      </div>
                    ) : <div />}
                    <div className={styles.campaignReportPageSize}>10 linhas por pagina</div>
                  </div>
                </>
              ) : (
                <p className={styles.sellerDetailNote}>Nenhum item sincronizado para este indicador no momento.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
