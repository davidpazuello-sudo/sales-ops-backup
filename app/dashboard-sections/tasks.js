"use client";

import { useState } from "react";
import { Card, Metric } from "../dashboard-ui";
import PageAgentPanel, { PageAgentToggleButton } from "../page-agent-panel";
import styles from "../page.module.css";
import {
  buildTaskSummary,
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
  const [statusFilter, setStatusFilter] = useState("pending");

  const allTasks = dashboardData.tasks || [];
  const teamAccess = canViewTeamTasks(sessionUser);
  const loadingState = dashboardData.states?.loading || "ready";
  const stateErrors = dashboardData.states?.errors || [];
  const ownerOptions = teamAccess ? getTaskOwnerOptions(allTasks) : [];
  const visibleTasks = getVisibleTasks(allTasks, sessionUser, {
    ownerFilter,
    typeFilter,
    statusFilter,
  });
  const groupedTasks = groupTasksByKind(visibleTasks);
  const summary = buildTaskSummary(visibleTasks);
  const scopeMessage = teamAccess
    ? (ownerFilter === "todos"
      ? "Voce pode acompanhar todas as tarefas da HubSpot e filtrar por vendedor."
      : `Mostrando tarefas do vendedor ${ownerFilter}.`)
    : "Mostrando apenas tarefas ligadas ao seu usuario na HubSpot.";

  return (
    <section className={styles.dashboardSection}>
      <header className={styles.sectionHeaderBar}>
        <div className={styles.settingsHeader}>
          <h1>Tarefas</h1>
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
              statusFilter,
            }}
          />
        </div>
      ) : null}

      <div className={styles.dealsFilters}>
        {teamAccess ? (
          <label className={styles.dealsFilterField}>
            <span>Vendedor</span>
            <select
              className={styles.dealsFilterSelect}
              value={ownerFilter}
              onChange={(event) => setOwnerFilter(event.target.value)}
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
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
          >
            <option value="todos">Todos</option>
            <option value="meeting">Reunioes</option>
            <option value="call">Chamadas</option>
            <option value="task">Outras tarefas</option>
          </select>
        </label>

        <label className={styles.dealsFilterField}>
          <span>Status</span>
          <select
            className={styles.dealsFilterSelect}
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="pending">Em aberto</option>
            <option value="overdue">Atrasadas</option>
            <option value="completed">Concluidas</option>
            <option value="todos">Todas</option>
          </select>
        </label>
      </div>

      <div className={styles.taskScopeHint}>{scopeMessage}</div>

      {loadingState !== "ready" || stateErrors.length ? (
        <div className={`${styles.sectionNotice} ${stateErrors.length ? styles.sectionNoticeError : ""}`.trim()}>
          {loadingState === "loading"
            ? "Carregando tarefas reais da HubSpot..."
            : stateErrors[0] || "As tarefas ainda nao conseguiram carregar dados reais."}
        </div>
      ) : null}

      {!allTasks.length && loadingState === "ready" && !stateErrors.length ? (
        <div className={styles.sectionEmptyPanel}>
          <strong>Sem tarefas sincronizadas</strong>
          <p>Quando a HubSpot retornar reunioes, chamadas e outras tarefas, elas aparecerao aqui.</p>
        </div>
      ) : null}

      <div className={styles.grid}>
        <Card eyebrow="HUBSPOT" title="Resumo operacional" wide>
          <div className={styles.metrics}>
            <Metric title="Em aberto" value={`${summary.open}`} note="Tarefas visiveis ainda pendentes" />
            <Metric title="Atrasadas" value={`${summary.overdue}`} note="Itens com prazo vencido" />
            <Metric title="Concluidas" value={`${summary.completed}`} note="Atividades ja finalizadas" />
            <Metric title="No filtro atual" value={`${summary.total}`} note="Total apos aplicar os filtros da pagina" />
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
