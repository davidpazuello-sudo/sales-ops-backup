"use client";

import { useState } from "react";
import { Card, Metric, PageTitle } from "../dashboard-ui";
import PageAgentPanel, { PageAgentToggleButton } from "../page-agent-panel";
import {
  SectionEmptyState,
  SectionNotice,
} from "../dashboard-section-feedback";
import styles from "../page.module.css";
import {
  buildUpcomingTaskSummary,
  canViewTeamTasks,
  getTaskOwnerOptions,
  getVisibleTasks,
  groupTasksByKind,
} from "lib/services/dashboard-tasks";

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
}) {
  return (
    <Card eyebrow={eyebrow} title={`${title} (${tasks.length})`} wide>
      {tasks.length ? (
        <div className={styles.dealList}>
          {tasks.map((task) => (
            <article key={task.id} className={`${styles.dealListItem} ${styles.taskListItem}`.trim()}>
              <div className={styles.dealIdentity}>
                <strong>{task.title}</strong>
                <span>{task.description || task.taskTypeLabel}</span>
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

  const allTasks = dashboardData.tasks || [];
  const teamAccess = canViewTeamTasks(sessionUser);
  const loadingState = dashboardData.states?.loading || "ready";
  const stateErrors = dashboardData.states?.errors || [];
  const ownerOptions = teamAccess ? getTaskOwnerOptions(allTasks) : [];
  const visibleTasks = getVisibleTasks(allTasks, sessionUser, {
    ownerFilter,
    typeFilter,
  });
  const groupedTasks = groupTasksByKind(visibleTasks);
  const summary = buildUpcomingTaskSummary(visibleTasks);
  const scopeMessage = teamAccess
    ? (ownerFilter === "todos"
      ? "Voce pode acompanhar todas as tarefas da HubSpot e filtrar por vendedor."
      : `Mostrando todas as tarefas do vendedor ${ownerFilter}.`)
    : "Mostrando todas as tarefas ligadas ao seu usuario na HubSpot.";
  const filtersDirty = ownerDraft !== ownerFilter || typeDraft !== typeFilter;

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
        <SectionNotice variant="error">{stateErrors[0] || "As tarefas ainda nao conseguiram carregar dados reais."}</SectionNotice>
      ) : null}

      {!allTasks.length && loadingState === "ready" && !stateErrors.length ? (
        <SectionEmptyState
          title="Sem tarefas sincronizadas"
          description="Quando a HubSpot retornar reunioes, chamadas e outras tarefas, elas aparecerao aqui."
        />
      ) : null}

      <div className={styles.grid}>
        <Card eyebrow="HUBSPOT" title="Resumo operacional" wide>
          <div className={styles.metrics}>
            <Metric title="A fazer" value={`${summary.total}`} note="Atividades visiveis no recorte atual" />
            <Metric title="Hoje" value={`${summary.today}`} note="Itens agendados para hoje" />
            <Metric title="Proximos 7 dias" value={`${summary.thisWeek}`} note="Atividades previstas nos proximos 7 dias" />
            <Metric title="Depois" value={`${summary.later}`} note="Atividades previstas apos os proximos 7 dias" />
          </div>
        </Card>

        <Card eyebrow="TIPOS" title="Resumo por tipo" wide>
          <div className={styles.metrics}>
            <Metric title="Reunioes" value={`${groupedTasks.meeting.length}`} note="Atividades do tipo reuniao no recorte atual" />
            <Metric title="Chamadas" value={`${groupedTasks.call.length}`} note="Atividades do tipo chamada no recorte atual" />
            <Metric title="Outras tarefas" value={`${groupedTasks.task.length}`} note="Follow-ups e tarefas gerais visiveis no recorte atual" />
          </div>
        </Card>

        <TaskGroupCard
          eyebrow="REUNIOES"
          title="Reunioes"
          tasks={groupedTasks.meeting}
          emptyTitle="Nenhuma reuniao neste recorte"
          emptyDescription="Ajuste os filtros ou aguarde novas reunioes sincronizadas pela HubSpot."
        />

        <TaskGroupCard
          eyebrow="CHAMADAS"
          title="Chamadas"
          tasks={groupedTasks.call}
          emptyTitle="Nenhuma chamada neste recorte"
          emptyDescription="Quando houver chamadas ligadas ao usuario ou ao vendedor filtrado, elas aparecerao aqui."
        />

        <TaskGroupCard
          eyebrow="OUTRAS"
          title="Outras tarefas"
          tasks={groupedTasks.task}
          emptyTitle="Nenhuma outra tarefa neste recorte"
          emptyDescription="Use esta area para acompanhar follow-ups, lembretes e atividades gerais vindas da HubSpot."
        />
      </div>
    </section>
  );
}
