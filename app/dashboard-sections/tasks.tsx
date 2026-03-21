// @ts-nocheck
"use client";

import { useMemo, useState } from "react";
import { Card, Metric, PageTitle, SimpleArrow } from "../dashboard-ui";
import PageAgentPanel, { PageAgentToggleButton } from "../page-agent-panel";
import {
  SectionEmptyState,
  SectionNotice,
} from "../dashboard-section-feedback";
import styles from "./tasks.module.css";
import {
  buildUpcomingTaskSummary,
  canViewTeamTasks,
  getUpcomingTasks,
  getTaskOwnerOptions,
  getVisibleTasks,
  groupTasksByKind,
} from "lib/services/dashboard-tasks";

const TASK_POPUP_PAGE_SIZE = 10;

const TASK_DETAIL_CONFIG = {
  total: {
    title: "Atividades a fazer",
    label: "Atividades futuras visiveis no recorte atual",
    columns: ["Titulo", "Responsavel", "Prazo", "Status"],
    columnTemplate: "minmax(320px, 2.1fr) minmax(220px, 1.4fr) minmax(180px, 1fr) minmax(170px, 0.9fr)",
    emptyMessage: "Nenhuma atividade encontrada neste recorte.",
  },
  today: {
    title: "Atividades de hoje",
    label: "Itens agendados para hoje",
    columns: ["Titulo", "Responsavel", "Prazo", "Status"],
    columnTemplate: "minmax(320px, 2.1fr) minmax(220px, 1.4fr) minmax(180px, 1fr) minmax(170px, 0.9fr)",
    emptyMessage: "Nenhuma atividade agendada para hoje.",
  },
  thisWeek: {
    title: "Atividades nos proximos 7 dias",
    label: "Itens previstos nos proximos 7 dias",
    columns: ["Titulo", "Responsavel", "Prazo", "Status"],
    columnTemplate: "minmax(320px, 2.1fr) minmax(220px, 1.4fr) minmax(180px, 1fr) minmax(170px, 0.9fr)",
    emptyMessage: "Nenhuma atividade prevista para os proximos 7 dias.",
  },
  later: {
    title: "Atividades depois de 7 dias",
    label: "Itens previstos apos a janela dos proximos 7 dias",
    columns: ["Titulo", "Responsavel", "Prazo", "Status"],
    columnTemplate: "minmax(320px, 2.1fr) minmax(220px, 1.4fr) minmax(180px, 1fr) minmax(170px, 0.9fr)",
    emptyMessage: "Nenhuma atividade agendada depois de 7 dias.",
  },
  meeting: {
    title: "Reunioes",
    label: "Atividades futuras do tipo reuniao",
    columns: ["Titulo", "Responsavel", "Prazo", "Status"],
    columnTemplate: "minmax(320px, 2.1fr) minmax(220px, 1.4fr) minmax(180px, 1fr) minmax(170px, 0.9fr)",
    emptyMessage: "Nenhuma reuniao encontrada neste recorte.",
  },
  call: {
    title: "Chamadas",
    label: "Atividades futuras do tipo chamada",
    columns: ["Titulo", "Responsavel", "Prazo", "Status"],
    columnTemplate: "minmax(320px, 2.1fr) minmax(220px, 1.4fr) minmax(180px, 1fr) minmax(170px, 0.9fr)",
    emptyMessage: "Nenhuma chamada encontrada neste recorte.",
  },
  task: {
    title: "Outras tarefas",
    label: "Follow-ups e tarefas gerais futuras",
    columns: ["Titulo", "Responsavel", "Prazo", "Status"],
    columnTemplate: "minmax(320px, 2.1fr) minmax(220px, 1.4fr) minmax(180px, 1fr) minmax(170px, 0.9fr)",
    emptyMessage: "Nenhuma outra tarefa encontrada neste recorte.",
  },
};

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

function buildTaskPopupRows(tasks = []) {
  return tasks.map((task) => ({
    id: task.id,
    cells: [
      task.title || "Sem titulo",
      task.ownerName || "Sem responsavel",
      task.dueLabel || "Sem prazo",
      getTaskStatusLabel(task),
    ],
  }));
}

function TaskMetricButton({ title, value, note, onOpen }) {
  return (
    <button type="button" className={`${styles.metric} ${styles.metricButton}`.trim()} onClick={onOpen}>
      <span>{title}</span>
      <strong>{value}</strong>
      {note ? <small>{note}</small> : null}
    </button>
  );
}

function getTaskStatusLabel(task) {
  if (task.isCompleted) {
    return "Concluida";
  }

  if (task.isOverdue) {
    return "Atrasada";
  }

  return task.statusLabel || "Em aberto";
}

function getTaskStatusClass(task) {
  if (task.isCompleted) {
    return styles.taskStatusBadgeDone;
  }

  if (task.isOverdue) {
    return styles.taskStatusBadgeOverdue;
  }

  return styles.taskStatusBadgeOpen;
}

function TaskGroupCard({
  eyebrow,
  title,
  tasks,
  emptyTitle,
  emptyDescription,
  onOpen,
}) {
  function handleKeyDown(event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen();
    }
  }

  return (
    <Card
      eyebrow={eyebrow}
      title={`${title} (${tasks.length})`}
      wide
      className={styles.cardClickable}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={handleKeyDown}
      aria-label={`Abrir detalhes de ${title}`}
    >
      {tasks.length ? (
        <div className={styles.dealList}>
          {tasks.map((task) => (
            <article key={task.id} className={`${styles.dealListItem} ${styles.taskListItem}`.trim()}>
              <div className={styles.dealIdentity}>
                <strong>{task.title}</strong>
              </div>

              <div className={styles.dealMeta}>
                <strong>{task.ownerName}</strong>
                <span>{task.ownerTeam || task.ownerEmail || "Sem responsavel definido"}</span>
              </div>

              <div className={styles.dealMeta}>
                <strong>{task.dueLabel}</strong>
                <span>{`${task.kindLabel} - ${task.priority}`}</span>
              </div>

              <div className={styles.taskStatusWrap}>
                <span className={`${styles.taskStatusBadge} ${getTaskStatusClass(task)}`.trim()}>
                  {getTaskStatusLabel(task)}
                </span>
                <small>{task.taskTypeLabel}</small>
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

export function TasksContent({ dashboardData, sessionUser = {} }) {
  const [agentOpen, setAgentOpen] = useState(false);
  const [ownerFilter, setOwnerFilter] = useState("todos");
  const [typeFilter, setTypeFilter] = useState("todos");
  const [ownerDraft, setOwnerDraft] = useState("todos");
  const [typeDraft, setTypeDraft] = useState("todos");
  const [activeDetail, setActiveDetail] = useState("");
  const [activeDetailPage, setActiveDetailPage] = useState(1);

  const allTasks = dashboardData.tasks || [];
  const upcomingTasks = getUpcomingTasks(allTasks);
  const teamAccess = canViewTeamTasks(sessionUser);
  const loadingState = dashboardData.states?.loading || "ready";
  const stateErrors = dashboardData.states?.errors || [];
  const ownerOptions = teamAccess ? getTaskOwnerOptions(upcomingTasks) : [];
  const visibleTasks = getVisibleTasks(upcomingTasks, sessionUser, {
    ownerFilter,
    typeFilter,
  });
  const groupedTasks = groupTasksByKind(visibleTasks);
  const summary = buildUpcomingTaskSummary(visibleTasks);
  const scopeMessage = teamAccess
    ? (ownerFilter === "todos"
      ? "Voce pode acompanhar apenas as proximas tarefas da HubSpot e filtrar por vendedor."
      : `Mostrando apenas as proximas tarefas do vendedor ${ownerFilter}.`)
    : "Mostrando apenas as suas proximas tarefas na HubSpot.";
  const filtersDirty = ownerDraft !== ownerFilter || typeDraft !== typeFilter;
  const detailSets = useMemo(() => {
    const todayTasks = [];
    const thisWeekTasks = [];
    const laterTasks = [];
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const tomorrowStart = todayStart + 86400000;
    const nextWeekStart = todayStart + (7 * 86400000);

    visibleTasks.forEach((task) => {
      const timestamp = task?.dueAt ? new Date(task.dueAt).getTime() : Number.NaN;

      if (!Number.isFinite(timestamp)) {
        return;
      }

      if (timestamp >= todayStart && timestamp < tomorrowStart) {
        todayTasks.push(task);
      } else if (timestamp >= tomorrowStart && timestamp < nextWeekStart) {
        thisWeekTasks.push(task);
      } else if (timestamp >= nextWeekStart) {
        laterTasks.push(task);
      }
    });

    return {
      total: visibleTasks,
      today: todayTasks,
      thisWeek: thisWeekTasks,
      later: laterTasks,
      meeting: groupedTasks.meeting,
      call: groupedTasks.call,
      task: groupedTasks.task,
    };
  }, [groupedTasks.call, groupedTasks.meeting, groupedTasks.task, visibleTasks]);
  const activeDetailConfig = activeDetail ? TASK_DETAIL_CONFIG[activeDetail] : null;
  const activeDetailRows = activeDetail ? buildTaskPopupRows(detailSets[activeDetail] || []) : [];
  const activeDetailTotalPages = Math.max(1, Math.ceil(activeDetailRows.length / TASK_POPUP_PAGE_SIZE));
  const popupPaginationItems = useMemo(
    () => buildPopupPaginationItems(activeDetailTotalPages, activeDetailPage),
    [activeDetailPage, activeDetailTotalPages],
  );
  const paginatedDetailRows = activeDetailRows.slice(
    (activeDetailPage - 1) * TASK_POPUP_PAGE_SIZE,
    activeDetailPage * TASK_POPUP_PAGE_SIZE,
  );

  function openDetail(detailKey) {
    setActiveDetail(detailKey);
    setActiveDetailPage(1);
  }

  function handleApplyFilters(event) {
    event.preventDefault();
    setOwnerFilter(ownerDraft);
    setTypeFilter(typeDraft);
  }

  return (
    <section className={styles.dashboardSection}>
      <header className={styles.sectionHeaderBar}>
        <div className={styles.settingsHeader}>
          <PageTitle loading={loadingState === "loading"} loadingLabel="Carregando tarefas da HubSpot">
            Tarefas
          </PageTitle>
          <p>Reunioes, chamadas e tarefas comerciais sincronizadas com a HubSpot e respeitando o cargo do usuario.</p>
        </div>
        <PageAgentToggleButton agentId="tasks" open={agentOpen} onToggle={() => setAgentOpen((value) => !value)} />
      </header>

      {agentOpen ? (
        <div className={styles.grid}>
          <PageAgentPanel
            agentId="tasks"
            dashboardData={dashboardData}
            context={{
              sessionUser,
              tasks: visibleTasks,
              ownerFilter,
              typeFilter,
            }}
          />
        </div>
      ) : null}

      <form className={styles.dealsFilters} onSubmit={handleApplyFilters}>
        {teamAccess ? (
          <label className={styles.dealsFilterField}>
            <span>Vendedor</span>
            <select
              className={styles.dealsFilterSelect}
              value={ownerDraft}
              onChange={(event) => setOwnerDraft(event.target.value)}
            >
              <option value="todos">Todos</option>
              {ownerOptions.map((owner) => (
                <option key={owner} value={owner}>{owner}</option>
              ))}
            </select>
          </label>
        ) : null}

        <label className={styles.dealsFilterField}>
          <span>Tipo</span>
          <select
            className={styles.dealsFilterSelect}
            value={typeDraft}
            onChange={(event) => setTypeDraft(event.target.value)}
          >
            <option value="todos">Todos</option>
            <option value="meeting">Reunioes</option>
            <option value="call">Chamadas</option>
            <option value="task">Outras tarefas</option>
          </select>
        </label>
        <div className={styles.filterActionGroup}>
          <button type="submit" className={`${styles.primaryActionButton} ${styles.filterApplyButton}`.trim()} disabled={!filtersDirty}>
            Filtrar
          </button>
        </div>
      </form>

      <div className={styles.taskScopeHint}>{scopeMessage}</div>

      {stateErrors.length ? (
        <SectionNotice variant="error">{stateErrors[0] || "As tarefas ainda não conseguiram carregar dados reais."}</SectionNotice>
      ) : null}

      {!upcomingTasks.length && loadingState === "ready" && !stateErrors.length ? (
        <SectionEmptyState
          title="Sem proximas tarefas"
          description="Quando a HubSpot retornar reuniões, chamadas e outras tarefas futuras, elas aparecerão aqui."
        />
      ) : null}

      <div className={styles.grid}>
        <Card eyebrow="HUBSPOT" title="Resumo operacional" wide>
          <div className={styles.metrics}>
            <TaskMetricButton title="A fazer" value={`${summary.total}`} note="Atividades futuras visiveis no recorte atual" onOpen={() => openDetail("total")} />
            <TaskMetricButton title="Hoje" value={`${summary.today}`} note="Itens agendados para hoje" onOpen={() => openDetail("today")} />
            <TaskMetricButton title="Proximos 7 dias" value={`${summary.thisWeek}`} note="Atividades previstas nos proximos 7 dias" onOpen={() => openDetail("thisWeek")} />
            <TaskMetricButton title="Depois" value={`${summary.later}`} note="Atividades previstas apos os proximos 7 dias" onOpen={() => openDetail("later")} />
          </div>
        </Card>

        <Card eyebrow="TIPOS" title="Resumo por tipo" wide>
          <div className={styles.metrics}>
            <TaskMetricButton title="Reunioes" value={`${groupedTasks.meeting.length}`} note="Atividades futuras do tipo reuniao no recorte atual" onOpen={() => openDetail("meeting")} />
            <TaskMetricButton title="Chamadas" value={`${groupedTasks.call.length}`} note="Atividades futuras do tipo chamada no recorte atual" onOpen={() => openDetail("call")} />
            <TaskMetricButton title="Outras tarefas" value={`${groupedTasks.task.length}`} note="Follow-ups e tarefas gerais futuras visiveis no recorte atual" onOpen={() => openDetail("task")} />
          </div>
        </Card>

        <TaskGroupCard
          eyebrow="REUNIOES"
          title="Reunioes"
          tasks={groupedTasks.meeting}
          emptyTitle="Nenhuma reuniao neste recorte"
          emptyDescription="Ajuste os filtros ou aguarde novas reunioes sincronizadas pela HubSpot."
          onOpen={() => openDetail("meeting")}
        />

        <TaskGroupCard
          eyebrow="CHAMADAS"
          title="Chamadas"
          tasks={groupedTasks.call}
          emptyTitle="Nenhuma chamada neste recorte"
          emptyDescription="Quando houver chamadas ligadas ao usuário ou ao vendedor filtrado, elas aparecerão aqui."
          onOpen={() => openDetail("call")}
        />

        <TaskGroupCard
          eyebrow="OUTRAS"
          title="Outras tarefas"
          tasks={groupedTasks.task}
          emptyTitle="Nenhuma outra tarefa neste recorte"
          emptyDescription="Use esta area para acompanhar follow-ups, lembretes e atividades gerais vindas da HubSpot."
          onOpen={() => openDetail("task")}
        />
      </div>

      {activeDetailConfig ? (
        <div className={styles.stageModalBackdrop} role="presentation" onClick={() => setActiveDetail("")}>
          <div
            className={`${styles.stageModal} ${styles.campaignReportModal}`.trim()}
            role="dialog"
            aria-modal="true"
            aria-label={`${activeDetailConfig.title} em tarefas`}
            onClick={(event) => event.stopPropagation()}
          >
            <header className={styles.campaignReportHeader}>
              <h3>Detalhes do relatório</h3>
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
                <span>Tarefas</span>
                <span>/</span>
                <span>{activeDetailConfig.title}</span>
              </div>

              <div className={styles.campaignReportMetaBar}>
                <strong>{activeDetailRows.length} linhas</strong>
                <span>{activeDetailConfig.label}</span>
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
