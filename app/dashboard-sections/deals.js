"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  Row,
} from "../dashboard-ui";
import PageAgentPanel, { PageAgentToggleButton } from "../page-agent-panel";
import {
  SectionEmptyState,
  SectionLoadingState,
  SectionNotice,
} from "../dashboard-section-feedback";
import styles from "../page.module.css";
import { findDealByRouteId, sellerToSlug } from "lib/dashboard-shell-helpers";
import {
  formatCurrencyFromLabel,
  getBoardColumns,
  getOwnerOptions,
  getVisibleDeals,
  moveDealToStage,
} from "lib/services/dashboard-deals";

export function DealsContent({ dashboardData }) {
  const router = useRouter();
  const [boardDeals, setBoardDeals] = useState(dashboardData.deals);
  const [draggedDealId, setDraggedDealId] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("todos");
  const [activityWeeksFilter, setActivityWeeksFilter] = useState("1");
  const [collapsedStages, setCollapsedStages] = useState({});
  const [stageDrafts, setStageDrafts] = useState({});
  const [agentOpen, setAgentOpen] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [busyDealId, setBusyDealId] = useState("");
  const pipelineStages = dashboardData.pipeline?.stages || [];

  useEffect(() => {
    setBoardDeals(dashboardData.deals);
  }, [dashboardData.deals]);

  const ownerOptions = getOwnerOptions(boardDeals);
  const loadingState = dashboardData.states?.loading || "ready";
  const stateErrors = dashboardData.states?.errors || [];
  const visibleDeals = getVisibleDeals(boardDeals, ownerFilter, activityWeeksFilter);
  const boardColumns = getBoardColumns(visibleDeals, pipelineStages);

  async function handleStageUpdate(dealId, stageId, stageLabel) {
    if (!dealId || !stageId) {
      return;
    }

    setBusyDealId(dealId);
    setFeedback({ type: "", message: "" });

    const response = await fetch("/api/deals/stage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dealId, stageId, stageLabel }),
    }).catch(() => null);
    const payload = await response?.json().catch(() => null);

    setBusyDealId("");

    if (!response?.ok) {
      setFeedback({
        type: "error",
        message: payload?.error || "Nao foi possivel atualizar a etapa do negocio.",
      });
      return;
    }

    setBoardDeals((currentDeals) => moveDealToStage(currentDeals, dealId, { stageId, stageLabel }));
    setStageDrafts((current) => ({
      ...current,
      [dealId]: stageId,
    }));
    setFeedback({
      type: "success",
      message: payload?.message || `Etapa atualizada para ${stageLabel}.`,
    });
  }

  const handleDropStage = async (targetStage) => {
    if (!draggedDealId) {
      return;
    }

    await handleStageUpdate(draggedDealId, targetStage.stageId, targetStage.stage);
    setDraggedDealId("");
  };

  const toggleStageCollapse = (stage) => {
    setCollapsedStages((current) => ({ ...current, [stage]: !current[stage] }));
  };

  return (
    <section className={styles.dashboardSection}>
      <header className={styles.sectionHeaderBar}>
        <div className={styles.settingsHeader}>
          <h1>Negocios</h1>
        </div>
        <PageAgentToggleButton agentId="deals" open={agentOpen} onToggle={() => setAgentOpen((value) => !value)} />
      </header>

      {agentOpen ? (
        <div className={styles.grid}>
          <PageAgentPanel agentId="deals" dashboardData={dashboardData} />
        </div>
      ) : null}

      {feedback.message ? (
        <SectionNotice variant={feedback.type === "error" ? "error" : "success"}>
          {feedback.message}
        </SectionNotice>
      ) : null}

      <div className={styles.dealsFilters}>
        <label className={styles.dealsFilterField}>
          <span>Por proprietario</span>
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

        <label className={styles.dealsFilterField}>
          <span>Tempo da ultima atividade</span>
          <select
            className={styles.dealsFilterSelect}
            value={activityWeeksFilter}
            onChange={(event) => setActivityWeeksFilter(event.target.value)}
          >
            <option value="1">1 semana</option>
            <option value="2">2 semanas</option>
            <option value="3">3 semanas</option>
            <option value="4">4 semanas</option>
          </select>
        </label>
      </div>

      {loadingState === "loading" ? (
        <SectionLoadingState
          title="Carregando pipeline"
          description="Buscando negocios e etapas reais da HubSpot."
        />
      ) : null}

      {stateErrors.length ? (
        <SectionNotice variant="error">{stateErrors[0] || "A pipeline ainda nao conseguiu carregar dados reais."}</SectionNotice>
      ) : null}

      {!boardColumns.length ? (
        <SectionEmptyState
          title="Pipeline sem negocios sincronizados"
          description="Assim que a HubSpot retornar etapas e negocios reais, elas aparecerao aqui."
        />
      ) : null}

      <section className={styles.pipelineBoard} aria-busy={busyDealId ? "true" : "false"}>
        {boardColumns.map((column) => (
          <article
            key={column.stage}
            className={`${styles.pipelineColumn} ${collapsedStages[column.stage] ? styles.pipelineColumnCollapsed : ""}`.trim()}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => handleDropStage(column.stage)}
          >
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
                  aria-expanded={!collapsedStages[column.stage]}
                  aria-label={collapsedStages[column.stage] ? `Expandir etapa ${column.stage}` : `Recolher etapa ${column.stage}`}
                  title={collapsedStages[column.stage] ? "Expandir etapa" : "Recolher etapa"}
                >
                  {collapsedStages[column.stage] ? ">" : "<"}
                </button>
              </div>
            </header>

            <div className={styles.pipelineColumnBody}>
              {collapsedStages[column.stage] ? (
                <div className={styles.pipelineCollapsedSummary}>
                  <strong>{column.count}</strong>
                </div>
              ) : null}
              {column.deals.length ? column.deals.map((deal) => (
                <article
                  key={deal.id}
                  className={styles.pipelineDealCard}
                  draggable={busyDealId !== deal.id}
                  onDragStart={() => setDraggedDealId(deal.id)}
                  onDragEnd={() => setDraggedDealId("")}
                  onDoubleClick={() => router.push(`/negocios/${sellerToSlug(deal.name)}-${deal.id}`)}
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
                      <small>Sincronizado com HubSpot. Arraste o card ou use o seletor abaixo para atualizar a etapa.</small>
                      <div className={styles.pipelineDealActions}>
                        <label className={styles.pipelineStageField}>
                          <span className={styles.srOnly}>Selecionar etapa para {deal.name}</span>
                          <select
                            className={styles.pipelineStageSelect}
                            value={stageDrafts[deal.id] || deal.stageId || column.stageId}
                            onChange={(event) => setStageDrafts((current) => ({
                              ...current,
                              [deal.id]: event.target.value,
                            }))}
                            disabled={busyDealId === deal.id}
                          >
                            {pipelineStages.map((stage) => (
                              <option key={stage.id} value={stage.id}>{stage.label}</option>
                            ))}
                          </select>
                        </label>
                        <button
                          type="button"
                          className={styles.secondaryActionButton}
                          onClick={() => {
                            const targetStageId = stageDrafts[deal.id] || deal.stageId || column.stageId;
                            const targetStage = pipelineStages.find((stage) => stage.id === targetStageId);
                            if (!targetStage) {
                              return;
                            }
                            handleStageUpdate(deal.id, targetStage.id, targetStage.label);
                          }}
                          disabled={busyDealId === deal.id}
                        >
                          {busyDealId === deal.id ? "Salvando..." : "Mover etapa"}
                        </button>
                      </div>
                    </>
                  )}
                </article>
              )) : (
                <div className={styles.pipelineEmptyState}>
                  <span>Sem negocios neste estagio.</span>
                </div>
              )}
            </div>
            <footer className={styles.pipelineColumnFooter}>
              <strong>{column.totalLabel}</strong>
              <span>Valor total</span>
            </footer>
          </article>
        ))}
      </section>
    </section>
  );
}

export function DealProfileContent({ dashboardData, dealId }) {
  const router = useRouter();
  const deal = findDealByRouteId(dashboardData.deals, dealId);
  const relatedTasks = (dashboardData.tasks || [])
    .filter((task) => Array.isArray(task.dealIds) && task.dealIds.includes(deal?.id));
  const openTasks = relatedTasks.filter((task) => !task.isCompleted);
  const completedTasks = relatedTasks.filter((task) => task.isCompleted);
  const relatedMeetings = relatedTasks.filter((task) => task.kind === "meeting");

  if (!deal) {
    return (
      <section className={styles.dashboardSection}>
        <header className={styles.settingsHeader}>
          <h1>Negocio nao encontrado</h1>
          <p>Nao localizamos esse negocio no pipeline atual.</p>
        </header>
        <button type="button" className={styles.secondaryActionButton} onClick={() => router.push("/negocios")}>
          Voltar para Negocios
        </button>
      </section>
    );
  }

  return (
    <section className={styles.dashboardSection}>
      <header className={styles.settingsHeader}>
        <h1>{deal.name}</h1>
        <p>Perfil operacional do negocio, com atividades e proximos passos puxados do fluxo real.</p>
      </header>

      <div className={styles.grid}>
        <Card eyebrow="NEGOCIO" title="Resumo do Negocio">
          <Row label="Nome" value={deal.name} />
          <Row label="Responsavel" value={deal.owner} />
          <Row label="Etapa atual" value={deal.stage} />
          <Row label="Valor" value={deal.amountLabel} />
          <Row label="Ultima atualizacao" value={deal.staleLabel} />
        </Card>

        <Card eyebrow="ACOES" title="Proximos Passos">
          <Row label="Sincronizacao" value="HubSpot ativa" helper="Negocio vinculado ao pipeline principal" />
          <Row label="Movimentacao" value="Atualize pela etapa do pipeline" helper="Use o seletor no quadro de Negocios para persistir a nova etapa" />
          <Row label="Atividades em aberto" value={`${openTasks.length}`} helper="Tasks reais vinculadas a este negocio" />
          <button type="button" className={styles.secondaryActionButton} onClick={() => router.push("/negocios")}>
            Voltar para Negocios
          </button>
        </Card>

        <Card eyebrow="EM ABERTO" title="Atividades pendentes" wide>
          {openTasks.length ? (
            <div className={styles.dealChecklist}>
              {openTasks.map((task) => (
                <article key={task.id} className={styles.dealChecklistItem}>
                  <div>
                    <strong>{task.title}</strong>
                    <span>{task.dueLabel || task.statusLabel}</span>
                  </div>
                  <span className={styles.dealTaskNext}>{task.statusLabel || "Pendente"}</span>
                </article>
              ))}
            </div>
          ) : (
            <SectionEmptyState
              title="Nenhuma atividade pendente"
              description="Quando houver follow-ups, chamadas ou reunioes em aberto ligadas a este negocio, elas aparecerao aqui."
            />
          )}
        </Card>

        <Card eyebrow="CONCLUIDO" title="Atividades concluidas" wide>
          {completedTasks.length ? (
            <div className={styles.dealChecklist}>
              {completedTasks.map((task) => (
                <article key={task.id} className={styles.dealChecklistItem}>
                  <div>
                    <strong>{task.title}</strong>
                    <span>{task.dueLabel || task.statusLabel}</span>
                  </div>
                  <span className={styles.dealTaskDone}>Concluida</span>
                </article>
              ))}
            </div>
          ) : (
            <SectionEmptyState
              title="Sem atividades concluidas"
              description="As entregas finalizadas deste negocio vao aparecer aqui assim que a HubSpot devolver o historico completo."
            />
          )}
        </Card>

        <Card eyebrow="REUNIOES" title="Reunioes relacionadas" wide>
          {relatedMeetings.length ? (
            <div className={styles.dealChecklist}>
              {relatedMeetings.map((meeting) => (
                <article key={meeting.id} className={styles.dealChecklistItem}>
                  <div>
                    <strong>{meeting.title}</strong>
                    <span>{meeting.dueLabel || meeting.statusLabel}</span>
                  </div>
                  <span className={styles.dealTaskNext}>{meeting.statusLabel || "Agendada"}</span>
                </article>
              ))}
            </div>
          ) : (
            <SectionEmptyState
              title="Sem reunioes relacionadas"
              description="As reunioes deste negocio vao aparecer aqui quando forem associadas na HubSpot."
            />
          )}
        </Card>
      </div>
    </section>
  );
}
