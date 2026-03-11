"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AttachmentIcon,
  Card,
  MicIcon,
  Row,
  SendIcon,
  SparkIcon,
} from "../dashboard-ui";
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
  const stageOrder = dashboardData.pipeline?.stages?.map((stage) => stage.label) || [];

  useEffect(() => {
    setBoardDeals(dashboardData.deals);
  }, [dashboardData.deals]);

  const ownerOptions = getOwnerOptions(boardDeals);
  const loadingState = dashboardData.states?.loading || "ready";
  const stateErrors = dashboardData.states?.errors || [];
  const visibleDeals = getVisibleDeals(boardDeals, ownerFilter, activityWeeksFilter);
  const boardColumns = getBoardColumns(visibleDeals, stageOrder);

  const handleDropStage = (targetStage) => {
    if (!draggedDealId) {
      return;
    }

    setBoardDeals((currentDeals) => moveDealToStage(currentDeals, draggedDealId, targetStage));
    setDraggedDealId("");
  };

  const toggleStageCollapse = (stage) => {
    setCollapsedStages((current) => ({ ...current, [stage]: !current[stage] }));
  };

  return (
    <section className={styles.dashboardSection}>
      <header className={styles.settingsHeader}>
        <h1>Negocios</h1>
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

      {loadingState !== "ready" || stateErrors.length ? (
        <div className={`${styles.sectionNotice} ${stateErrors.length ? styles.sectionNoticeError : ""}`.trim()}>
          {loadingState === "loading"
            ? "Carregando pipeline real da HubSpot..."
            : stateErrors[0] || "A pipeline ainda nao conseguiu carregar dados reais."}
        </div>
      ) : null}

      {!boardColumns.length ? (
        <div className={styles.sectionEmptyPanel}>
          <strong>Pipeline sem negocios sincronizados</strong>
          <p>Assim que a HubSpot retornar etapas e negocios reais, elas aparecerao aqui.</p>
        </div>
      ) : null}

      <section className={styles.pipelineBoard}>
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
                  draggable
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
                      <small>Sincronizado com HubSpot. Arraste para atualizar o estagio.</small>
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
  const [showAiSummary, setShowAiSummary] = useState(false);
  const [dealAiMessage, setDealAiMessage] = useState("");
  const [dealAiAttachments, setDealAiAttachments] = useState([]);
  const [activeAttachment, setActiveAttachment] = useState(null);
  const deal = findDealByRouteId(dashboardData.deals, dealId);

  const completedTasks = [
    { id: "sync", title: "Sincronizacao com HubSpot concluida", when: "Hoje, 09:12" },
    { id: "touch", title: "Atualizacao de etapa registrada", when: "Hoje, 10:40" },
    { id: "contact", title: "Contato com decisor principal validado", when: "Ontem, 16:25" },
  ];

  const completedAttachments = [
    { id: "a1", name: "gravacao-reuniao.mp3", note: "Gravacao da ultima call", url: "/anexos-negocio/gravacao-reuniao.html" },
    { id: "a2", name: "resumo-comercial.pdf", note: "Resumo enviado para aprovacao", url: "/anexos-negocio/resumo-comercial.html" },
    { id: "a3", name: "proposta-v3.docx", note: "Versao final da proposta", url: "/anexos-negocio/proposta-v3.html" },
  ];

  const upcomingTasks = [
    { id: "n1", title: "Enviar follow-up com proximos passos", due: "Hoje, 18:00" },
    { id: "n2", title: "Revisar objecoes comerciais com gestor", due: "Amanha, 10:00" },
    { id: "n3", title: "Agendar reuniao de validacao final", due: "Quinta, 14:30" },
  ];

  const handleDealAiAttachments = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) {
      return;
    }

    setDealAiAttachments((current) => [
      ...current,
      ...files.map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}`,
        name: file.name,
        sizeLabel: `${Math.max(1, Math.round(file.size / 1024))} KB`,
      })),
    ]);

    event.target.value = "";
  };

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
        <p>Perfil completo do negocio e status atual no pipeline.</p>
      </header>

      <div className={styles.grid}>
        <div className={styles.dealProfileActions}>
          <button type="button" className={styles.primaryActionButton} onClick={() => setShowAiSummary(true)}>
            <SparkIcon />
            <span>Resumo com IA</span>
          </button>
        </div>

        {showAiSummary ? (
          <Card eyebrow="IA" title="Resumo com IA" wide>
            <div className={styles.dealAiSummaryBox}>
              <strong>Resumo pela IA</strong>
              <p>Negocio em andamento com boa aderencia de escopo e evolucao de etapa. Recomendacao: reforcar proximo compromisso com decisor e registrar objecoes finais para acelerar fechamento.</p>
            </div>

            <div className={styles.dealAiComposer}>
              <label className={styles.dealAiComposerButton}>
                <AttachmentIcon />
                <input type="file" multiple className={styles.hiddenFileInput} onChange={handleDealAiAttachments} />
              </label>
              <button type="button" className={styles.dealAiComposerButton} aria-label="Gravar audio para IA">
                <MicIcon />
              </button>
              <input className={styles.dealAiInput} value={dealAiMessage} onChange={(event) => setDealAiMessage(event.target.value)} placeholder="Pergunte para IA sobre riscos, proximas acoes e prioridades deste negocio..." />
              <button type="button" className={styles.dealAiSendButton} aria-label="Enviar mensagem para IA">
                <SendIcon />
                <span>Enviar</span>
              </button>
            </div>

            {dealAiAttachments.length ? (
              <div className={styles.dealAttachmentList}>
                {dealAiAttachments.map((attachment) => (
                  <div key={attachment.id} className={styles.dealAttachmentItem}>
                    <div className={styles.dealAttachmentMeta}>
                      <strong>{attachment.name}</strong>
                      <span>{attachment.sizeLabel}</span>
                    </div>
                    <button type="button" className={styles.meetingAttachmentRemove} onClick={() => setDealAiAttachments((current) => current.filter((item) => item.id !== attachment.id))}>
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </Card>
        ) : null}

        <Card eyebrow="NEGOCIO" title="Resumo do Negocio">
          <Row label="Nome" value={deal.name} />
          <Row label="Responsavel" value={deal.owner} />
          <Row label="Etapa atual" value={deal.stage} />
          <Row label="Valor" value={deal.amountLabel} />
          <Row label="Ultima atualizacao" value={deal.staleLabel} />
        </Card>

        <Card eyebrow="ACOES" title="Proximos Passos">
          <Row label="Sincronizacao" value="HubSpot ativa" helper="Negocio vinculado ao pipeline principal" />
          <Row label="Movimentacao" value="Arraste no quadro de Negocios" helper="Pressione e arraste o card para mudar de etapa" />
          <Row label="Navegacao" value="Voltar ao pipeline" helper="Clique abaixo para retornar" />
          <button type="button" className={styles.secondaryActionButton} onClick={() => router.push("/negocios")}>
            Voltar para Negocios
          </button>
        </Card>

        <Card eyebrow="CONCLUIDO" title="Ultimas entregas" wide>
          <div className={styles.dealChecklist}>
            {completedTasks.map((task) => (
              <article key={task.id} className={styles.dealChecklistItem}>
                <div>
                  <strong>{task.title}</strong>
                  <span>{task.when}</span>
                </div>
                <span className={styles.dealTaskDone}>Concluido</span>
              </article>
            ))}
          </div>
        </Card>

        <Card eyebrow="PENDENTE" title="Itens em aberto" wide>
          <div className={styles.dealChecklist}>
            {upcomingTasks.map((task) => (
              <article key={task.id} className={styles.dealChecklistItem}>
                <div>
                  <strong>{task.title}</strong>
                  <span>{task.due}</span>
                </div>
                <span className={styles.dealTaskNext}>Pendente</span>
              </article>
            ))}
          </div>
        </Card>

        <Card eyebrow="ANEXOS" title="Documentos e materiais" wide>
          <div className={styles.dealAttachmentGrid}>
            {completedAttachments.map((attachment) => (
              <button key={attachment.id} type="button" className={styles.dealAttachmentCard} onClick={() => setActiveAttachment(attachment)}>
                <strong>{attachment.name}</strong>
                <span>{attachment.note}</span>
              </button>
            ))}
          </div>
        </Card>
      </div>

      {activeAttachment ? (
        <div className={styles.attachmentPopupBackdrop} role="presentation" onClick={() => setActiveAttachment(null)}>
          <div className={styles.attachmentPopup} role="dialog" aria-modal="true" aria-label={`Anexo ${activeAttachment.name}`} onClick={(event) => event.stopPropagation()}>
            <header className={styles.attachmentPopupHeader}>
              <div>
                <span>ANEXO</span>
                <h3>{activeAttachment.name}</h3>
                <p>{activeAttachment.note}</p>
              </div>
              <button type="button" className={styles.secondaryActionButton} onClick={() => setActiveAttachment(null)}>
                Fechar
              </button>
            </header>
            <iframe src={activeAttachment.url} title={activeAttachment.name} className={styles.attachmentPopupFrame} />
          </div>
        </div>
      ) : null}
    </section>
  );
}
