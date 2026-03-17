"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, PageTitle, SimpleArrow } from "../dashboard-ui";
import {
  SectionEmptyState,
} from "../dashboard-section-feedback";
import styles from "../page.module.css";
import { canViewTeamTasks } from "lib/services/dashboard-tasks";

const PRESALES_POPUP_PAGE_SIZE = 10;
const PRESALES_DETAIL_CONFIG = {
  totalContacts: {
    title: "Contatos gerais",
    label: "Contatos sob responsabilidade do pre-vendedor",
    columns: ["Proprietario", "Contato", "Detalhe", "Status"],
    columnTemplate: "minmax(220px, 1.2fr) minmax(360px, 2.3fr) minmax(280px, 1.8fr) minmax(200px, 1fr)",
    emptyMessage: "Nenhum contato encontrado neste recorte.",
  },
  contactsWithoutConnection: {
    title: "Sem conexao",
    label: "Contatos sem chamada, tarefa ou reuniao registrada",
    columns: ["Proprietario", "Contato", "Detalhe", "Status"],
    columnTemplate: "minmax(220px, 1.2fr) minmax(360px, 2.3fr) minmax(280px, 1.8fr) minmax(200px, 1fr)",
    emptyMessage: "Nenhum contato sem conexao neste recorte.",
  },
  qualifiedContacts: {
    title: "Qualificados",
    label: "Contatos prontos para avancar para vendas",
    columns: ["Proprietario", "Contato", "Detalhe", "Status"],
    columnTemplate: "minmax(220px, 1.2fr) minmax(360px, 2.3fr) minmax(280px, 1.8fr) minmax(200px, 1fr)",
    emptyMessage: "Nenhum contato qualificado neste recorte.",
  },
  opportunitiesWithDeals: {
    title: "Oportunidades com deal",
    label: "Contatos com oportunidade associada",
    columns: ["Proprietario", "Negocio", "Valor", "Status"],
    columnTemplate: "minmax(220px, 1.2fr) minmax(400px, 2.4fr) minmax(180px, 1fr) minmax(220px, 1.2fr)",
    emptyMessage: "Nenhuma oportunidade associada neste recorte.",
  },
  totalCalls: {
    title: "Chamadas totais",
    label: "Registros de chamada ligados aos contatos da carteira",
    columns: ["Proprietario", "Atividade", "Prazo", "Status"],
    columnTemplate: "minmax(220px, 1.2fr) minmax(420px, 2.6fr) minmax(200px, 1.2fr) minmax(180px, 1fr)",
    emptyMessage: "Nenhuma chamada encontrada neste recorte.",
  },
  averageCallsPerContact: {
    title: "Media de chamadas por contato",
    label: "Contatos com chamadas registradas",
    columns: ["Proprietario", "Contato", "Chamadas", "Status"],
    columnTemplate: "minmax(220px, 1.2fr) minmax(360px, 2.2fr) minmax(180px, 1fr) minmax(200px, 1fr)",
    emptyMessage: "Nenhum contato com chamadas registradas neste recorte.",
  },
  totalConnections: {
    title: "Conexoes totais",
    label: "Contatos com pelo menos uma interacao registrada",
    columns: ["Proprietario", "Contato", "Detalhe", "Status"],
    columnTemplate: "minmax(220px, 1.2fr) minmax(360px, 2.3fr) minmax(280px, 1.8fr) minmax(200px, 1fr)",
    emptyMessage: "Nenhum contato com conexao neste recorte.",
  },
  activitiesDone: {
    title: "Atividades feitas",
    label: "Chamadas, reunioes e tarefas concluidas",
    columns: ["Proprietario", "Atividade", "Prazo", "Status"],
    columnTemplate: "minmax(220px, 1.2fr) minmax(420px, 2.6fr) minmax(200px, 1.2fr) minmax(180px, 1fr)",
    emptyMessage: "Nenhuma atividade concluida neste recorte.",
  },
  activitiesOpen: {
    title: "Atividades por fazer",
    label: "Itens ainda abertos no fluxo operacional",
    columns: ["Proprietario", "Atividade", "Prazo", "Status"],
    columnTemplate: "minmax(220px, 1.2fr) minmax(420px, 2.6fr) minmax(200px, 1.2fr) minmax(180px, 1fr)",
    emptyMessage: "Nenhuma atividade em aberto neste recorte.",
  },
  scheduledMeetings: {
    title: "Reunioes programadas",
    label: "Agenda futura registrada na HubSpot",
    columns: ["Proprietario", "Atividade", "Prazo", "Status"],
    columnTemplate: "minmax(220px, 1.2fr) minmax(420px, 2.6fr) minmax(200px, 1.2fr) minmax(180px, 1fr)",
    emptyMessage: "Nenhuma reuniao programada neste recorte.",
  },
  completedMeetings: {
    title: "Reunioes realizadas",
    label: "Reunioes que ja aconteceram na carteira",
    columns: ["Proprietario", "Atividade", "Prazo", "Status"],
    columnTemplate: "minmax(220px, 1.2fr) minmax(420px, 2.6fr) minmax(200px, 1.2fr) minmax(180px, 1fr)",
    emptyMessage: "Nenhuma reuniao realizada neste recorte.",
  },
  meetingsToReschedule: {
    title: "Para reagendar",
    label: "No-show, canceladas ou que voltaram para o pre-vendedor",
    columns: ["Proprietario", "Atividade", "Prazo", "Status"],
    columnTemplate: "minmax(220px, 1.2fr) minmax(420px, 2.6fr) minmax(200px, 1.2fr) minmax(180px, 1fr)",
    emptyMessage: "Nenhuma reuniao para reagendar neste recorte.",
  },
};

function normalizeComparable(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function buildOwnerOptions(ownerDirectory = []) {
  const options = ownerDirectory
    .map((owner) => ({
      id: String(owner?.id || "").trim(),
      label: String(owner?.name || "").trim(),
      email: String(owner?.email || "").trim(),
    }))
    .filter((owner) => owner.label)
    .sort((left, right) => left.label.localeCompare(right.label, "pt-BR"));

  return [{ id: "todos", label: "Todos" }, ...options];
}

function buildCampaignOptions(campaignOptions = []) {
  return campaignOptions
    .map((option) => ({
      id: String(option?.slug || option?.label || "").trim(),
      label: String(option?.label || "").trim(),
    }))
    .filter((option) => option.label)
    .sort((left, right) => left.label.localeCompare(right.label, "pt-BR"));
}

function resolveCampaignOption(campaignOptions = [], draftValue = "") {
  const normalizedDraft = normalizeComparable(draftValue);
  return campaignOptions.find((option) => normalizeComparable(option.label) === normalizedDraft) || null;
}

function resolveCampaignOptionLabel(campaignOptions = [], draftValue = "") {
  return resolveCampaignOption(campaignOptions, draftValue)?.label || "";
}

function resolveOwnerOptionLabel(ownerOptions = [], draftValue = "") {
  const normalizedDraft = normalizeComparable(draftValue || "todos");
  const matchedOption = ownerOptions.find((option) => normalizeComparable(option.label) === normalizedDraft);
  return matchedOption?.label || "";
}

function resolveOwnerOption(ownerOptions = [], draftValue = "") {
  const normalizedDraft = normalizeComparable(draftValue || "todos");
  return ownerOptions.find((option) =>
    normalizeComparable(option.label) === normalizedDraft
    || normalizeComparable(option.email) === normalizedDraft) || null;
}

function resolveSessionOwnerLabel(ownerOptions = [], sessionUser = {}) {
  const normalizedName = normalizeComparable(sessionUser?.name);
  const normalizedEmail = normalizeComparable(sessionUser?.email);
  const matchedOption = ownerOptions.find((option) => {
    const normalizedLabel = normalizeComparable(option.label);
    return (normalizedName && normalizedLabel === normalizedName)
      || (normalizedEmail && normalizeComparable(option.email) === normalizedEmail);
  });

  return matchedOption?.label || String(sessionUser?.name || sessionUser?.email || "").trim();
}

function PreSalesListCard({ eyebrow, title, items, emptyTitle, emptyDescription }) {
  return (
    <Card eyebrow={eyebrow} title={title} wide>
      {items.length ? (
        <div className={styles.dealList}>
          {items.map((item) => (
            <article key={item.id} className={styles.presalesListItem}>
              <div className={styles.presalesCell}>
                <strong>{item.title}</strong>
                <span>{item.subtitle}</span>
              </div>
              <div className={styles.presalesCell}>
                <strong>{item.meta}</strong>
                <span>{item.status}</span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className={styles.taskEmptyState}>
          <strong>{emptyTitle}</strong>
          <span>{emptyDescription}</span>
        </div>
      )}
    </Card>
  );
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

function PreSalesMetricButton({ title, value, note, onOpen, expanded = false }) {
  return (
    <button
      type="button"
      className={`${styles.metric} ${styles.metricButton}`.trim()}
      onClick={onOpen}
      aria-haspopup="dialog"
      aria-expanded={expanded}
    >
      <span>{title}</span>
      <strong>{value}</strong>
      {note ? <small>{note}</small> : null}
    </button>
  );
}

export function PreSalesContent({
  dashboardData,
  initialOwnerFilter = "todos",
  initialCampaignName = "Aluno a Bordo 2026",
  sessionUser = {},
}) {
  const router = useRouter();
  const [selectedOwnerDraft, setSelectedOwnerDraft] = useState("");
  const [selectedCampaignDraft, setSelectedCampaignDraft] = useState("");
  const [activeDetail, setActiveDetail] = useState("");
  const [activeDetailPage, setActiveDetailPage] = useState(1);
  const [isFilterPending, startFilterTransition] = useTransition();
  const loadingState = dashboardData.states?.loading || "ready";
  const stateErrors = dashboardData.states?.errors || [];
  const canViewTeam = canViewTeamTasks(sessionUser);
  const ownerOptions = useMemo(
    () => buildOwnerOptions(Array.isArray(dashboardData.integration?.ownerDirectory) ? dashboardData.integration.ownerDirectory : []),
    [dashboardData.integration?.ownerDirectory],
  );
  const campaignOptions = useMemo(
    () => buildCampaignOptions(Array.isArray(dashboardData.campaignOptions) ? dashboardData.campaignOptions : []),
    [dashboardData.campaignOptions],
  );
  const sessionOwnerLabel = useMemo(
    () => resolveSessionOwnerLabel(ownerOptions, sessionUser),
    [ownerOptions, sessionUser],
  );
  const initialResolvedOwner = useMemo(() => {
    if (!canViewTeam) {
      return sessionOwnerLabel;
    }

    if (!initialOwnerFilter || normalizeComparable(initialOwnerFilter) === "todos") {
      return "Todos";
    }

    return resolveOwnerOptionLabel(ownerOptions, initialOwnerFilter) || initialOwnerFilter;
  }, [canViewTeam, initialOwnerFilter, ownerOptions, sessionOwnerLabel]);
  const resolvedOwnerSelection = useMemo(() => {
    const resolvedDraft = resolveOwnerOption(ownerOptions, selectedOwnerDraft);
    if (resolvedDraft?.label) {
      return resolvedDraft.label;
    }

    return initialResolvedOwner || "";
  }, [initialResolvedOwner, ownerOptions, selectedOwnerDraft]);
  const summary = dashboardData.presales || null;
  const initialResolvedCampaign = useMemo(
    () => resolveCampaignOptionLabel(campaignOptions, initialCampaignName) || initialCampaignName,
    [campaignOptions, initialCampaignName],
  );
  const baselineDraftValue = useMemo(() => {
    if (!canViewTeam) {
      return "";
    }

    return initialResolvedOwner && normalizeComparable(initialResolvedOwner) !== "todos"
      ? initialResolvedOwner
      : "";
  }, [canViewTeam, initialResolvedOwner]);
  const baselineCampaignDraftValue = initialResolvedCampaign || "Aluno a Bordo 2026";
  const placeholderText = canViewTeam ? "Todos" : sessionOwnerLabel || "Meu proprietario";
  const filtersDirty = (
    (canViewTeam && normalizeComparable(selectedOwnerDraft || "") !== normalizeComparable(baselineDraftValue))
    || normalizeComparable(selectedCampaignDraft || "") !== normalizeComparable(baselineCampaignDraftValue)
  );
  const activeDetailConfig = activeDetail ? PRESALES_DETAIL_CONFIG[activeDetail] : null;
  const activeDetailRows = activeDetail ? summary?.details?.[activeDetail] || [] : [];
  const activeDetailTotalPages = Math.max(1, Math.ceil(activeDetailRows.length / PRESALES_POPUP_PAGE_SIZE));
  const popupPaginationItems = useMemo(
    () => buildPopupPaginationItems(activeDetailTotalPages, activeDetailPage),
    [activeDetailPage, activeDetailTotalPages],
  );
  const paginatedDetailRows = activeDetailRows.slice(
    (activeDetailPage - 1) * PRESALES_POPUP_PAGE_SIZE,
    activeDetailPage * PRESALES_POPUP_PAGE_SIZE,
  );

  useEffect(() => {
    setSelectedOwnerDraft(baselineDraftValue);
  }, [baselineDraftValue]);

  useEffect(() => {
    setSelectedCampaignDraft(baselineCampaignDraftValue);
  }, [baselineCampaignDraftValue]);

  function openDetail(detailKey) {
    setActiveDetail(detailKey);
    setActiveDetailPage(1);
  }

  function handleApplyFilters() {
    if (!canViewTeam) {
      return;
    }

    const resolvedCampaign = resolveCampaignOption(campaignOptions, selectedCampaignDraft || baselineCampaignDraftValue);
    if (!resolvedCampaign?.label) {
      return;
    }

    const resolvedOption = canViewTeam
      ? resolveOwnerOption(ownerOptions, selectedOwnerDraft || resolvedOwnerSelection)
      : null;
    if (canViewTeam && !resolvedOption?.label) {
      return;
    }

    startFilterTransition(() => {
      const searchParams = new URLSearchParams();
      searchParams.set("campanha", resolvedCampaign.label);
      if (canViewTeam && normalizeComparable(resolvedOption.label) !== "todos") {
        searchParams.set("proprietario", resolvedOption.label);
      }

      const suffix = searchParams.toString();
      router.push(suffix ? `/pre-vendedores?${suffix}` : "/pre-vendedores");
    });
  }

  return (
    <section className={styles.dashboardSection}>
      <header className={styles.sectionHeaderBar}>
        <div className={styles.settingsHeader}>
          <PageTitle loading={loadingState === "loading"} loadingLabel="Carregando dados do pre-vendedor">
            Pre-vendedores
          </PageTitle>
        </div>
      </header>

      <div className={styles.campaignFilterBar}>
        <label className={styles.campaignFilterField}>
          <span>Campanha</span>
          <input
            type="text"
            list="presales-campaign-options"
            className={styles.campaignFilterInput}
            placeholder="Aluno a Bordo 2026"
            value={selectedCampaignDraft}
            onChange={(event) => setSelectedCampaignDraft(event.target.value)}
            disabled={isFilterPending}
          />
          <datalist id="presales-campaign-options">
            {campaignOptions.map((option) => (
              <option key={option.id || option.label} value={option.label} />
            ))}
          </datalist>
        </label>

        <label className={styles.campaignFilterField}>
          <span>Proprietario</span>
          <input
            type="text"
            list="presales-owner-options"
            className={styles.campaignFilterInput}
            placeholder={placeholderText}
            value={selectedOwnerDraft}
            onChange={(event) => setSelectedOwnerDraft(event.target.value)}
            disabled={isFilterPending || !canViewTeam}
          />
          <datalist id="presales-owner-options">
            {ownerOptions.map((option) => (
              <option key={option.id || option.label} value={option.label} />
            ))}
          </datalist>
        </label>

        <button
          type="button"
          className={`${styles.primaryActionButton} ${styles.filterApplyButton}`.trim()}
          onClick={handleApplyFilters}
          disabled={!canViewTeam || !filtersDirty || isFilterPending}
        >
          Filtrar
        </button>
      </div>

      {stateErrors.length ? (
        <div className={`${styles.sectionNotice} ${styles.sectionNoticeError}`.trim()} role="status" aria-live="polite">
          <strong className={styles.sectionNoticeTitle}>Falha de integracao</strong>
          <span>{stateErrors[0]}</span>
        </div>
      ) : null}

      {!summary ? (
        <SectionEmptyState
          title="Sem dados do pre-vendedor por enquanto"
          description="Assim que a HubSpot sincronizar contatos, atividades e reunioes dos proprietarios, esta pagina vai mostrar a rotina operacional."
        />
      ) : (
        <div className={styles.grid}>
          <Card eyebrow="CARTEIRA" title="Acompanhamento geral" wide>
            <div className={styles.campaignProspectingMetrics}>
              <PreSalesMetricButton title="Contatos gerais" value={summary.metrics.totalContacts} note="Contatos sob responsabilidade do pre-vendedor" onOpen={() => openDetail("totalContacts")} expanded={activeDetail === "totalContacts"} />
              <PreSalesMetricButton title="Sem conexao" value={summary.metrics.contactsWithoutConnection} note="Sem chamada, tarefa ou reuniao registrada" onOpen={() => openDetail("contactsWithoutConnection")} expanded={activeDetail === "contactsWithoutConnection"} />
              <PreSalesMetricButton title="Qualificados" value={summary.metrics.qualifiedContacts} note="Contatos prontos para avancar para vendas" onOpen={() => openDetail("qualifiedContacts")} expanded={activeDetail === "qualifiedContacts"} />
              <PreSalesMetricButton title="Oportunidades com deal" value={summary.metrics.opportunitiesWithDeals} note="Contatos que ja possuem oportunidade associada" onOpen={() => openDetail("opportunitiesWithDeals")} expanded={activeDetail === "opportunitiesWithDeals"} />
            </div>
          </Card>

          <Card eyebrow="DESEMPENHO" title="Execucao do pre-vendedor" wide>
            <div className={styles.campaignProspectingMetrics}>
              <PreSalesMetricButton title="Chamadas totais" value={summary.metrics.totalCalls} note="Registros de chamada ligados aos contatos da carteira" onOpen={() => openDetail("totalCalls")} expanded={activeDetail === "totalCalls"} />
              <PreSalesMetricButton title="Media de chamadas por contato" value={summary.metrics.averageCallsPerContact} note="Chamadas totais divididas pela carteira" onOpen={() => openDetail("averageCallsPerContact")} expanded={activeDetail === "averageCallsPerContact"} />
              <PreSalesMetricButton title="Conexoes totais" value={summary.metrics.totalConnections} note="Contatos com pelo menos uma interacao registrada" onOpen={() => openDetail("totalConnections")} expanded={activeDetail === "totalConnections"} />
              <PreSalesMetricButton title="Atividades feitas" value={summary.metrics.activitiesDone} note="Chamadas, reunioes e tarefas concluidas" onOpen={() => openDetail("activitiesDone")} expanded={activeDetail === "activitiesDone"} />
              <PreSalesMetricButton title="Atividades por fazer" value={summary.metrics.activitiesOpen} note="Itens ainda abertos no fluxo operacional" onOpen={() => openDetail("activitiesOpen")} expanded={activeDetail === "activitiesOpen"} />
            </div>
          </Card>

          <Card eyebrow="REUNIOES" title="Passagem para vendas" wide>
            <div className={styles.campaignProspectingMetrics}>
              <PreSalesMetricButton title="Reunioes programadas" value={summary.metrics.scheduledMeetings} note="Agenda futura registrada na HubSpot" onOpen={() => openDetail("scheduledMeetings")} expanded={activeDetail === "scheduledMeetings"} />
              <PreSalesMetricButton title="Reunioes realizadas" value={summary.metrics.completedMeetings} note="Reunioes que ja aconteceram na carteira" onOpen={() => openDetail("completedMeetings")} expanded={activeDetail === "completedMeetings"} />
              <PreSalesMetricButton title="Para reagendar" value={summary.metrics.meetingsToReschedule} note="No-show, canceladas ou que voltaram para o pre-vendedor" onOpen={() => openDetail("meetingsToReschedule")} expanded={activeDetail === "meetingsToReschedule"} />
            </div>
          </Card>

          <PreSalesListCard
            eyebrow="SEM CONEXAO"
            title="Contatos que ainda nao tiveram conexao"
            items={summary.lists.contactsWithoutConnection}
            emptyTitle="Nenhum contato sem conexao"
            emptyDescription="Todos os contatos visiveis neste recorte ja possuem ao menos um registro de atividade."
          />

          <PreSalesListCard
            eyebrow="QUALIFICADOS"
            title="Contatos prontos para passar ao vendedor"
            items={summary.lists.qualifiedContacts}
            emptyTitle="Nenhum contato qualificado"
            emptyDescription="Quando os contatos avancarem na qualificacao, eles vao aparecer aqui."
          />

          <PreSalesListCard
            eyebrow="AGENDA"
            title="Proximas reunioes programadas"
            items={summary.lists.scheduledMeetings}
            emptyTitle="Nenhuma reuniao programada"
            emptyDescription="Nao encontrei reunioes futuras neste recorte."
          />

          <PreSalesListCard
            eyebrow="RETOMADA"
            title="Reunioes que precisam ser reagendadas"
            items={summary.lists.meetingsToReschedule}
            emptyTitle="Nenhuma reuniao para reagendar"
            emptyDescription="Nao ha reunioes canceladas, com no-show ou atrasadas para retomar agora."
          />

          <PreSalesListCard
            eyebrow="ATIVIDADES"
            title="Atividades dos proximos 7 dias"
            items={summary.lists.upcomingActivities}
            emptyTitle="Nenhuma atividade prevista"
            emptyDescription="Nao encontrei atividades em aberto para os proximos 7 dias neste recorte."
          />
        </div>
      )}

      {summary && activeDetailConfig ? (
        <div className={styles.stageModalBackdrop} role="presentation" onClick={() => setActiveDetail("")}>
          <div
            className={`${styles.stageModal} ${styles.campaignReportModal}`.trim()}
            role="dialog"
            aria-modal="true"
            aria-label={`${activeDetailConfig.title} de pre-vendedores`}
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
                <span>Pre-vendedores</span>
                <span>/</span>
                <span>{activeDetailConfig.title}</span>
              </div>

              <div className={styles.campaignReportMetaBar}>
                <div className={styles.campaignReportMetaPrimary}>
                  <strong>{activeDetailRows.length} linhas</strong>
                  <span>{activeDetailConfig.label}</span>
                </div>
              </div>

              {activeDetailRows.length ? (
                <>
                  <div className={styles.campaignReportTableFrame}>
                    <div
                      className={`${styles.campaignReportGrid} ${styles.campaignReportTableHead}`.trim()}
                      style={{ "--campaign-report-columns": activeDetailConfig.columnTemplate }}
                    >
                      {activeDetailConfig.columns.map((column) => <span key={column}>{column}</span>)}
                    </div>
                    <div className={styles.campaignTableBody}>
                      {paginatedDetailRows.map((row) => (
                        <article
                          key={row.id}
                          className={`${styles.campaignReportGrid} ${styles.campaignReportTableRow}`.trim()}
                          style={{ "--campaign-report-columns": activeDetailConfig.columnTemplate }}
                        >
                          {row.cells.map((value, index) => (
                            <div key={`${row.id}-${index}`} className={styles.campaignReportCell}>
                              <strong className={styles.campaignTableCellValue} title={value}>{value}</strong>
                            </div>
                          ))}
                        </article>
                      ))}
                    </div>
                  </div>
                  <div className={styles.campaignReportFooter}>
                    {activeDetailTotalPages > 1 ? (
                      <div className={styles.popupPaginationBar}>
                        <nav className={styles.popupPagination} aria-label={`Paginacao de ${activeDetailConfig.title}`}>
                          <button
                            type="button"
                            className={styles.popupPaginationNav}
                            onClick={() => setActiveDetailPage((current) => Math.max(1, current - 1))}
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
                                  onClick={() => setActiveDetailPage(page)}
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
                            onClick={() => setActiveDetailPage((current) => Math.min(activeDetailTotalPages, current + 1))}
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
                <p className={styles.sellerDetailNote}>{activeDetailConfig.emptyMessage}</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
