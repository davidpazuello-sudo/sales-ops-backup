// @ts-nocheck
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  PageTitle,
  Row,
} from "../dashboard-ui";
import PageAgentPanel, { PageAgentToggleButton } from "../page-agent-panel";
import {
  SectionEmptyState,
  SectionNotice,
} from "../dashboard-section-feedback";
import styles from "./deals.module.css";
import { findDealByRouteId, sellerToSlug } from "lib/dashboard-shell-helpers";
import {
  getDefaultPipelineId,
  formatCurrencyFromLabel,
  getBoardColumns,
  getOwnerOptions,
  getPipelineOptions,
  getVisibleDeals,
  moveDealToStage,
} from "lib/services/dashboard-deals";

export function DealsContent({
  dashboardData,
  initialOwnerFilter = "todos",
  initialActivityWeeksFilter = "1",
}) {
  const router = useRouter();
  const [boardDeals, setBoardDeals] = useState(dashboardData.deals);
  const [draggedDealId, setDraggedDealId] = useState("");
  const [pipelineDraft, setPipelineDraft] = useState("");
  const [ownerDraft, setOwnerDraft] = useState(initialOwnerFilter || "todos");
  const [activityWeeksDraft, setActivityWeeksDraft] = useState(initialActivityWeeksFilter || "1");
  const [collapsedStages, setCollapsedStages] = useState({});
  const [stageDrafts, setStageDrafts] = useState({});
  const [agentOpen, setAgentOpen] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [busyDealId, setBusyDealId] = useState("");
  const pipelineStages = dashboardData.pipeline?.stages || [];

  useEffect(() => {
    setBoardDeals(dashboardData.deals);
  }, [dashboardData.deals]);

  useEffect(() => {
    const nextDefaultPipelineId = getDefaultPipelineId(dashboardData.pipeline);
    setPipelineDraft(nextDefaultPipelineId);
  }, [dashboardData.pipeline]);

  useEffect(() => {
    setOwnerDraft(String(initialOwnerFilter || "todos"));
  }, [initialOwnerFilter]);

  useEffect(() => {
    setActivityWeeksDraft(String(initialActivityWeeksFilter || "1"));
  }, [initialActivityWeeksFilter]);

  const currentPipelineId = getDefaultPipelineId(dashboardData.pipeline);
  const currentOwnerFilter = String(initialOwnerFilter || "todos");
  const currentActivityWeeksFilter = String(initialActivityWeeksFilter || "1");
  const ownerOptions = getOwnerOptions(boardDeals);
  const pipelineOptions = getPipelineOptions(dashboardData.pipeline);
  const loadingState = dashboardData.states?.loading || "ready";
  const stateErrors = dashboardData.states?.errors || [];
  const visibleDeals = getVisibleDeals(boardDeals, currentOwnerFilter, currentActivityWeeksFilter, currentPipelineId);
  const boardColumns = getBoardColumns(visibleDeals, dashboardData.pipeline, currentPipelineId);
  const selectedPipeline = Array.isArray(dashboardData.pipeline?.items)
    ? dashboardData.pipeline.items.find((item) => item.id === currentPipelineId)
    : null;
  const stageOptions = Array.isArray(selectedPipeline?.stages) && selectedPipeline.stages.length
    ? selectedPipeline.stages
    : pipelineStages;
  const filtersDirty = pipelineDraft !== currentPipelineId
    || ownerDraft !== currentOwnerFilter
    || activityWeeksDraft !== currentActivityWeeksFilter;

  function updateDealsRoute(nextFilters = {}) {
    const fallbackPipelineId = currentPipelineId || getDefaultPipelineId(dashboardData.pipeline);
    const targetPipelineId = String((nextFilters.pipelineId ?? fallbackPipelineId) || "").trim();
    const targetOwnerFilter = String((nextFilters.ownerFilter ?? currentOwnerFilter) || "todos").trim() || "todos";
    const targetActivityWeeksFilter = String((nextFilters.activityWeeksFilter ?? currentActivityWeeksFilter) || "1").trim() || "1";
    const searchParams = new URLSearchParams();

    if (targetPipelineId) {
      searchParams.set("pipeline", targetPipelineId);
    }
    if (targetOwnerFilter && targetOwnerFilter !== "todos") {
      searchParams.set("owner", targetOwnerFilter);
    }
    if (targetActivityWeeksFilter && targetActivityWeeksFilter !== "1") {
      searchParams.set("activityWeeks", targetActivityWeeksFilter);
    }

    const nextRoute = searchParams.toString()
      ? `/negocios?${searchParams.toString()}`
      : "/negocios";

    router.replace(nextRoute, { scroll: false });
  }

  function handleFiltersApply(event) {
    event.preventDefault();
    if (!filtersDirty) {
      return;
    }
    updateDealsRoute({
      pipelineId: pipelineDraft,
      ownerFilter: ownerDraft,
      activityWeeksFilter: activityWeeksDraft,
    });
  }

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
        message: payload?.error || "Não foi possível atualizar a etapa do negócio.",
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
    <section className={`${styles.dashboardSection} ${styles.dealsSection}`.trim()}>
      <header className={styles.sectionHeaderBar}>
        <div className={styles.settingsHeader}>
          <PageTitle loading={loadingState === "loading"} loadingLabel="Carregando pipeline da HubSpot">
            Negocios
          </PageTitle>
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

      <form className={styles.dealsFilters} onSubmit={handleFiltersApply}>
        <label className={styles.dealsFilterField}>
          <span>Pipeline</span>
          <select
            className={styles.dealsFilterSelect}
            value={pipelineDraft}
            onChange={(event) => setPipelineDraft(event.target.value)}
          >
            {pipelineOptions.map((pipeline) => (
              <option key={pipeline.id} value={pipeline.id}>{pipeline.label}</option>
            ))}
          </select>
        </label>

        <label className={styles.dealsFilterField}>
          <span>Por proprietario</span>
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

        <label className={styles.dealsFilterField}>
          <span>Tempo da ultima atividade</span>
          <select
            className={styles.dealsFilterSelect}
            value={activityWeeksDraft}
            onChange={(event) => setActivityWeeksDraft(event.target.value)}
          >
            <option value="1">1 semana</option>
            <option value="2">2 semanas</option>
            <option value="3">3 semanas</option>
            <option value="4">4 semanas</option>
          </select>
        </label>
        <div className={styles.filterActionGroup}>
          <button type="submit" className={`${styles.primaryActionButton} ${styles.filterApplyButton}`.trim()} disabled={!filtersDirty}>
            Filtrar
          </button>
        </div>
      </form>

      {stateErrors.length ? (
        <SectionNotice variant="error">{stateErrors[0] || "A pipeline ainda não conseguiu carregar dados reais."}</SectionNotice>
      ) : null}

      {!boardColumns.length && loadingState === "ready" && !stateErrors.length ? (
        <SectionEmptyState
          title="Pipeline sem negocios sincronizados"
          description="Assim que a HubSpot retornar etapas e negócios reais, eles aparecerão aqui."
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
                  onClick={() => {
                    const searchParams = new URLSearchParams();
                    const activePipelineId = deal.pipelineId || pipelineFilter;
                    if (activePipelineId) {
                      searchParams.set("pipeline", activePipelineId);
                    }
                    if (ownerFilter && ownerFilter !== "todos") {
                      searchParams.set("owner", ownerFilter);
                    }
                    if (activityWeeksFilter && activityWeeksFilter !== "1") {
                      searchParams.set("activityWeeks", activityWeeksFilter);
                    }

                    router.push(
                      searchParams.toString()
                        ? `/negocios/${sellerToSlug(deal.name)}-${deal.id}?${searchParams.toString()}`
                        : `/negocios/${sellerToSlug(deal.name)}-${deal.id}`,
                    );
                  }}
                  onDragStart={() => setDraggedDealId(deal.id)}
                  onDragEnd={() => setDraggedDealId("")}
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
                            onClick={(event) => event.stopPropagation()}
                            onChange={(event) => setStageDrafts((current) => ({
                              ...current,
                              [deal.id]: event.target.value,
                            }))}
                            disabled={busyDealId === deal.id || !stageOptions.length}
                          >
                            {stageOptions.map((stage) => (
                              <option key={stage.id} value={stage.id}>{stage.label}</option>
                            ))}
                          </select>
                        </label>
                        <button
                          type="button"
                          className={styles.secondaryActionButton}
                          onClick={(event) => {
                            event.stopPropagation();
                            const targetStageId = stageDrafts[deal.id] || deal.stageId || column.stageId;
                            const targetStage = stageOptions.find((stage) => stage.id === targetStageId);
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

interface DealProfileContentProps {
  dashboardData: DashboardData;
  dealId: string;
}

export function DealProfileContent({ dashboardData, dealId }: DealProfileContentProps) {
  const router = useRouter();
  const loadingState = dashboardData.states?.loading || "ready";
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
          <PageTitle loading={loadingState === "loading"} loadingLabel="Carregando negocio da HubSpot">
            Negocio nao encontrado
          </PageTitle>
          <p>Nao localizamos esse negocio no pipeline atual.</p>
        </header>
        <button type="button" className={styles.secondaryActionButton} onClick={() => router.push("/negocios")}>
          Voltar para Negócios
        </button>
      </section>
    );
  }

  return (
    <section className={styles.dashboardSection}>
      <header className={styles.settingsHeader}>
        <PageTitle loading={loadingState === "loading"} loadingLabel="Carregando negocio da HubSpot">
          {deal.name}
        </PageTitle>
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
          <Row label="Movimentação" value="Atualize pela etapa do pipeline" helper="Use o seletor no quadro de Negocios para persistir a nova etapa" />
          <Row label="Atividades em aberto" value={`${openTasks.length}`} helper="Tasks reais vinculadas a este negocio" />
          <button type="button" className={styles.secondaryActionButton} onClick={() => router.push("/negocios")}>
            Voltar para Negócios
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
              description="Quando houver follow-ups, chamadas ou reuniões em aberto ligadas a este negócio, elas aparecerão aqui."
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
