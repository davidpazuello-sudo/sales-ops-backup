"use client";

import { useState } from "react";
import { Card, Metric, PageTitle, SimpleArrow } from "../dashboard-ui";
import PageAgentPanel, { PageAgentToggleButton } from "../page-agent-panel";
import {
  SectionEmptyState,
  SectionNotice,
} from "../dashboard-section-feedback";
import styles from "../page.module.css";
import {
  PRIMARY_CAMPAIGN_NAME,
  getPrimaryCampaign,
} from "lib/services/dashboard-campaigns";

const EMPTY_CAMPAIGNS = [];
const OVERVIEW_DETAIL_CONFIG = {
  totalLeads: {
    eyebrow: "LEADS",
    title: "Total de leads",
    description: "Leads mapeados na campanha",
    columns: ["Proprietario", "Lead", "Detalhe", "Status"],
  },
  sqls: {
    eyebrow: "SQLS",
    title: "Leads qualificados",
    description: "Leads qualificados por vendas",
    columns: ["Proprietario", "Lead", "Detalhe", "Status"],
  },
  meetings: {
    eyebrow: "REUNIOES",
    title: "Reunioes da campanha",
    description: "Reunioes sincronizadas da HubSpot",
    columns: ["Proprietario", "Lead", "Data", "Status"],
  },
  closedWon: {
    eyebrow: "FECHADOS",
    title: "Negocios fechados",
    description: "Contratos fechados na campanha",
    columns: ["Proprietario", "Negocio", "Valor", "Status"],
  },
  qualifiedOpportunities: {
    eyebrow: "OPORTUNIDADES",
    title: "Oportunidades qualificadas",
    description: "Negocios qualificados em aberto na campanha",
    columns: ["Proprietario", "Negocio", "Valor", "Status"],
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

function renderCampaignDetailRows(detailKey, summary) {
  if (!summary) {
    return [];
  }

  if (detailKey === "totalLeads") {
    return summary.qualification.totalLeadItems || [];
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

function getDetailCellValues(item) {
  return [
    item.ownerName || "Sem proprietario",
    item.leadName || item.recordName || "Sem registro",
    item.dateLabel || item.detailLabel || "Sem detalhe",
    item.statusLabel || "Sem status",
  ];
}

export function CampaignsContent({ dashboardData }) {
  const [agentOpen, setAgentOpen] = useState(false);
  const [activeDetail, setActiveDetail] = useState("");
  const [detailPageByKey, setDetailPageByKey] = useState({});
  const [detailRowsByKey, setDetailRowsByKey] = useState({});
  const [detailLoadingKey, setDetailLoadingKey] = useState("");
  const [detailError, setDetailError] = useState("");
  const campaigns = Array.isArray(dashboardData.campaigns) ? dashboardData.campaigns : EMPTY_CAMPAIGNS;
  const summary = getPrimaryCampaign(campaigns);
  const loadingState = dashboardData.states?.loading || "ready";
  const stateErrors = dashboardData.states?.errors || [];
  const activeDetailConfig = OVERVIEW_DETAIL_CONFIG[activeDetail] || null;
  const activeDetailRows = detailRowsByKey[activeDetail] || [];
  const activeDetailPage = detailPageByKey[activeDetail] || 1;
  const detailPageSize = 10;
  const activeDetailTotalPages = Math.max(1, Math.ceil(activeDetailRows.length / detailPageSize));
  const paginatedDetailRows = activeDetailRows.slice(
    (activeDetailPage - 1) * detailPageSize,
    activeDetailPage * detailPageSize,
  );

  async function handleOpenDetail(detailKey) {
    setActiveDetail(detailKey);
    setDetailError("");
    setDetailPageByKey((current) => ({
      ...current,
      [detailKey]: 1,
    }));

    if (detailRowsByKey[detailKey]) {
      return;
    }

    setDetailLoadingKey(detailKey);

    try {
      const response = await fetch(`/api/hubspot/dashboard?scope=campaigns&campaignDetail=${encodeURIComponent(detailKey)}`, {
        cache: "no-store",
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setDetailError(payload?.error || "Nao foi possivel carregar os detalhes deste indicador.");
        return;
      }

      const detailSummary = getPrimaryCampaign(Array.isArray(payload?.campaigns) ? payload.campaigns : []);
      setDetailRowsByKey((current) => ({
        ...current,
        [detailKey]: renderCampaignDetailRows(detailKey, detailSummary),
      }));
    } catch {
      setDetailError("Nao foi possivel carregar os detalhes deste indicador.");
    } finally {
      setDetailLoadingKey("");
    }
  }

  return (
    <section className={styles.dashboardSection}>
      <header className={styles.sectionHeaderBar}>
        <div className={styles.settingsHeader}>
          <PageTitle loading={loadingState === "loading"} loadingLabel="Carregando campanha da HubSpot">
            Campanhas
          </PageTitle>
          <p>Acompanhamento dedicado da campanha {PRIMARY_CAMPAIGN_NAME} com dados reais da HubSpot.</p>
        </div>
        <PageAgentToggleButton agentId="campaigns" open={agentOpen} onToggle={() => setAgentOpen((value) => !value)} />
      </header>

      {agentOpen ? (
        <div className={styles.grid}>
          <PageAgentPanel
            agentId="campaigns"
            dashboardData={dashboardData}
            context={{ campaignId: summary?.id || "" }}
          />
        </div>
      ) : null}

      <div className={styles.taskScopeHint}>
        {summary
          ? `Mostrando o acompanhamento da campanha ${summary.name}.`
          : `Mostrando apenas a campanha ${PRIMARY_CAMPAIGN_NAME}.`}
      </div>

      {stateErrors.length ? (
        <SectionNotice variant="error">{stateErrors[0] || "A campanha ainda nao conseguiu carregar dados reais."}</SectionNotice>
      ) : null}

      {!summary && loadingState === "ready" && !stateErrors.length ? (
        <SectionEmptyState
          title={`Campanha ${PRIMARY_CAMPAIGN_NAME} sem dados sincronizados`}
          description={`Assim que a HubSpot trouxer deals, contatos e atividades da campanha ${PRIMARY_CAMPAIGN_NAME}, o acompanhamento vai aparecer aqui.`}
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
            <div className={styles.metrics}>
              <Metric title="Ligacoes hoje" value={`${summary.prospecting.callsDaily}`} note="Meta minima diaria: 15" />
              <Metric title="Ligacoes na semana" value={`${summary.prospecting.callsWeekly}`} note="Volume semanal de prospeccao" />
              <Metric title="Conexoes hoje" value={`${summary.prospecting.connectionsDaily}`} note="Meta minima diaria: 7" />
              <Metric title="Conexoes na semana" value={`${summary.prospecting.connectionsWeekly}`} note="Emails, redes e outras interacoes" />
            </div>
          </Card>

          <Card eyebrow="QUALIFICACAO" title="Relatorios de qualificacao e conversao">
            <div className={styles.metrics}>
              <Metric title="Total de leads" value={`${summary.qualification.totalLeads}`} note="Base total de contatos da campanha" />
              <Metric title="MQLs" value={`${summary.qualification.mqlCount}`} note="Leads de marketing mapeados" />
              <Metric title="SQLs" value={`${summary.qualification.sqlCount}`} note="Meta da campanha: 40 ate 17/05/2026" />
              <Metric title="Taxa MQL > SQL" value={`${summary.qualification.conversionRate}%`} note="Efetividade da qualificacao SDR" />
            </div>
          </Card>

          <Card eyebrow="VENDAS" title="Relatorios de desempenho e fechamento">
            <div className={styles.metrics}>
              <Metric title="Propostas" value={`${summary.sales.proposalCount}`} note="Deals em etapa de proposta" />
              <Metric title="Fechados" value={`${summary.sales.closedWonCount}`} note="Meta da campanha: 15" />
              <Metric title="Taxa proposta > fechamento" value={`${summary.sales.conversionRate}%`} note="Eficacia do fechamento" />
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
            className={`${styles.stageModal} ${styles.campaignMeetingsModal}`.trim()}
            role="dialog"
            aria-modal="true"
            aria-label={`${activeDetailConfig.title} da campanha ${summary.name}`}
            onClick={(event) => event.stopPropagation()}
          >
            <header className={styles.stageModalHeader}>
              <div>
                <span>{activeDetailConfig.eyebrow}</span>
                <h3>{summary.name}</h3>
              </div>
              <button type="button" className={styles.secondaryActionButton} onClick={() => setActiveDetail("")}>
                Fechar
              </button>
            </header>

            <div className={`${styles.stageModalList} ${styles.campaignMeetingsList}`.trim()}>
              {detailLoadingKey === activeDetail ? (
                <div className={styles.campaignDetailLoadingState} role="status" aria-live="polite">
                  <span className={styles.sectionLoadingSpinner} aria-hidden="true" />
                  <strong>Carregando detalhes da HubSpot</strong>
                </div>
              ) : detailError ? (
                <SectionNotice variant="error">{detailError}</SectionNotice>
              ) : activeDetailRows.length ? (
                <>
                  <div className={`${styles.tableHead} ${styles.campaignMeetingItem}`.trim()}>
                    {activeDetailConfig.columns.map((column) => <span key={column}>{column}</span>)}
                  </div>
                  <div className={styles.campaignTableBody}>
                    {paginatedDetailRows.map((item) => {
                      const cellValues = getDetailCellValues(item);

                      return (
                        <article key={item.id} className={`${styles.stageModalItem} ${styles.campaignMeetingItem}`.trim()}>
                          {cellValues.map((value, index) => (
                            <div key={`${item.id}-${index}`}>
                              <strong className={styles.campaignTableCellValue} title={value}>{value}</strong>
                            </div>
                          ))}
                        </article>
                      );
                    })}
                  </div>
                  {activeDetailTotalPages > 1 ? (
                    <div className={styles.popupPaginationBar}>
                      <nav className={styles.popupPagination} aria-label={`Paginacao de ${activeDetailConfig.title}`}>
                        <button
                          type="button"
                          className={styles.popupPaginationNav}
                          onClick={() => setDetailPageByKey((current) => ({
                            ...current,
                            [activeDetail]: Math.max(1, activeDetailPage - 1),
                          }))}
                          disabled={activeDetailPage === 1}
                        >
                          <SimpleArrow />
                          <span>Voltar</span>
                        </button>

                        <div className={styles.popupPaginationPages}>
                          {Array.from({ length: activeDetailTotalPages }, (_, index) => {
                            const page = index + 1;
                            const isCurrentPage = activeDetailPage === page;

                            return (
                              <button
                                key={page}
                                type="button"
                                className={`${styles.popupPaginationPage} ${isCurrentPage ? styles.popupPaginationPageActive : ""}`.trim()}
                                onClick={() => setDetailPageByKey((current) => ({
                                  ...current,
                                  [activeDetail]: page,
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
                            [activeDetail]: Math.min(activeDetailTotalPages, activeDetailPage + 1),
                          }))}
                          disabled={activeDetailPage === activeDetailTotalPages}
                        >
                          <span>Proximo</span>
                          <SimpleArrow right />
                        </button>
                      </nav>
                    </div>
                  ) : null}
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
