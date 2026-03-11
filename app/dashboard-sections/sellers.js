"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  MeetingIcon,
  Metric,
  Row,
  SparkIcon,
} from "../dashboard-ui";
import styles from "../page.module.css";
import { getInternalMeetingsForSeller, meetingToSlug, sellerToSlug } from "lib/dashboard-shell-helpers";
import {
  getMaxKanbanCount,
  getMotivationStatus,
  getPendingSellerTasks,
  getSellerActivityKpis,
  getSellerConversionRate,
  getSellerDeals,
  getSellerKanbanColumns,
  getSellerPipelineValue,
  getStageDeals,
} from "lib/services/dashboard-sellers";
import { formatCurrency } from "lib/services/dashboard-deals";

export function SellerMeetingsContent({ dashboardData, sellerSlug }) {
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
          <button type="button" className={styles.primaryActionButton} onClick={() => router.push(`/vendedores/${sellerSlug}/reunioes/nova`)}>
            <MeetingIcon />
            <span>Registrar nova reuniao</span>
          </button>
        </div>
      </header>

      <section className={styles.meetingsList}>
        {meetings.map((meeting) => (
          <button key={meeting.id} type="button" className={styles.meetingRow} onClick={() => router.push(`/vendedores/${sellerSlug}/reunioes/${meetingToSlug(meeting.id)}`)}>
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

export function SellerMeetingDetailContent({ dashboardData, sellerSlug, meetingId }) {
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

  return (
    <section className={styles.dashboardSection}>
      <header className={styles.sellerDetailHeader}>
        <div className={styles.settingsHeader}>
          <h1>{isNewMeeting ? "Registrar nova reuniao" : meeting.title}</h1>
          <p>{isNewMeeting ? `Novo registro interno para ${seller.name}, preparado para posterior sincronizacao com a HubSpot.` : `${meeting.date} · ${meeting.time} · ${meeting.type}`}</p>
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
                    <input type="file" accept=".pdf,.doc,.docx,.txt,.rtf,.md,.mp3,.wav,.m4a,.ogg,.aac,.webm,audio/*" multiple className={styles.hiddenFileInput} onChange={handleMeetingAttachments} />
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
                        <button type="button" className={styles.meetingAttachmentRemove} onClick={() => setMeetingAttachments((current) => current.filter((item) => item.id !== attachment.id))}>
                          Remover
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={styles.meetingAttachmentHint}>Aceita PDF, DOC, TXT, MD e arquivos de audio como MP3, WAV e M4A.</p>
                )}
              </div>
              <div className={styles.meetingFormActions}>
                <button type="button" className={styles.primaryActionButton} onClick={() => router.push(`/vendedores/${sellerSlug}/reunioes`)}>
                  Salvar reuniao
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.meetingDetailStack}>
              <div className={styles.meetingDetailActions}>
                <button type="button" className={styles.primaryActionButton} onClick={() => setShowAiAnalysis((value) => !value)}>
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
                  <p>A reuniao indica foco em previsibilidade de receita e em proximos passos por conta. Recomendacao: registrar todos os follow-ups no HubSpot em ate 24h e revisar negocios parados antes do proximo ritual.</p>
                </div>
              ) : null}
              <div className={styles.meetingAudioPanel}>
                <strong>Audio da reuniao</strong>
                {meeting.audioUrl ? (
                  <div className={styles.meetingAudioPlayer}>
                    <span>{meeting.audioLabel || "Gravacao disponivel"}</span>
                    <audio controls preload="none" src={meeting.audioUrl}>Seu navegador nao suporta audio.</audio>
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

export function SellersContent({ dashboardData }) {
  const router = useRouter();
  const [sellerFilter, setSellerFilter] = useState("");
  const loadingState = dashboardData.states?.loading || "ready";
  const stateErrors = dashboardData.states?.errors || [];
  const filteredSellers = dashboardData.sellers.filter((seller) =>
    seller.name.toLowerCase().includes(sellerFilter.trim().toLowerCase()),
  );

  return (
    <section className={styles.dashboardSection}>
      <header className={styles.settingsHeader}>
        <h1>Vendedores</h1>
      </header>

      <div className={styles.dealsFilters}>
        <label className={styles.dealsFilterField}>
          <span>Filtrar por nome</span>
          <input type="text" className={styles.dealsFilterInput} value={sellerFilter} onChange={(event) => setSellerFilter(event.target.value)} placeholder="Buscar vendedor" />
        </label>
      </div>

      {loadingState !== "ready" || stateErrors.length ? (
        <div className={`${styles.sectionNotice} ${stateErrors.length ? styles.sectionNoticeError : ""}`.trim()}>
          {loadingState === "loading" ? "Carregando vendedores sincronizados da HubSpot..." : stateErrors[0] || "A lista de vendedores ainda nao conseguiu carregar dados reais."}
        </div>
      ) : null}

      {!filteredSellers.length ? (
        <div className={styles.sectionEmptyPanel}>
          <strong>{sellerFilter.trim() ? "Nenhum vendedor encontrado" : "Nenhum vendedor sincronizado"}</strong>
          <p>{sellerFilter.trim() ? "Tente ajustar o nome pesquisado ou limpar o filtro." : "Quando a HubSpot retornar owners reais, eles aparecerao nesta lista."}</p>
        </div>
      ) : null}

      <div className={styles.sellerProfilesGrid}>
        {filteredSellers.map((seller) => {
          const sellerDeals = getSellerDeals(dashboardData, seller.name);
          const totalPipeline = getSellerPipelineValue(sellerDeals);
          const pendingTasks = getPendingSellerTasks(sellerDeals);
          const motivationStatus = getMotivationStatus(seller);

          return (
            <button key={seller.name} type="button" className={styles.sellerProfileContainer} onClick={() => router.push(`/vendedores/${sellerToSlug(seller.name)}`)}>
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

export function SellerProfileContent({ dashboardData, sellerSlug }) {
  const router = useRouter();
  const [selectedStage, setSelectedStage] = useState("");
  const seller = dashboardData.sellers.find((item) => sellerToSlug(item.name) === sellerSlug) || dashboardData.sellers[0];

  if (!seller) {
    return (
      <section className={styles.dashboardSection}>
        <header className={styles.settingsHeader}>
          <h1>Vendedores</h1>
          <p>Nao encontramos um vendedor sincronizado para este perfil ainda.</p>
        </header>
        <div className={styles.sectionEmptyPanel}>
          <strong>Perfil indisponivel no momento</strong>
          <p>Volte para a lista de vendedores quando a HubSpot terminar a sincronizacao.</p>
        </div>
      </section>
    );
  }

  const sellerDeals = getSellerDeals(dashboardData, seller.name);
  const conversionRate = getSellerConversionRate(seller);
  const totalPipelineValue = getSellerPipelineValue(sellerDeals);
  const pendingTasks = getPendingSellerTasks(sellerDeals);
  const motivationStatus = getMotivationStatus(seller);
  const activityKpis = getSellerActivityKpis(seller);
  const kanbanColumns = getSellerKanbanColumns(sellerDeals);
  const maxKanbanCount = getMaxKanbanCount(kanbanColumns);
  const stageDeals = getStageDeals(sellerDeals, selectedStage);

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
            <button type="button" className={styles.primaryActionButton} onClick={() => router.push(`/vendedores/${sellerSlug}/reunioes`)}>
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
            <Metric title="Valor total na pipeline" value={formatCurrency(totalPipelineValue)} />
            <Metric title="Tarefas a fazer" value={`${pendingTasks}`} />
            <Metric title="Status motivacao" value={motivationStatus} />
          </div>
          <div className={styles.pipelineStageChart}>
            {kanbanColumns.map((column) => (
              <button key={column.title} type="button" className={styles.pipelineStageBarCard} onClick={() => setSelectedStage(column.title)}>
                <div className={styles.pipelineStageBarWrap}>
                  <div className={styles.pipelineStageBar} style={{ height: `${Math.max(16, (column.count / maxKanbanCount) * 100)}%` }} />
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
        <div className={styles.stageModalBackdrop} role="presentation" onClick={() => setSelectedStage("")}>
          <div className={styles.stageModal} role="dialog" aria-modal="true" aria-label={`Negocios em ${selectedStage}`} onClick={(event) => event.stopPropagation()}>
            <header className={styles.stageModalHeader}>
              <div>
                <span>ETAPA</span>
                <h3>{selectedStage}</h3>
                <p>{seller.name} · {stageDeals.length} negocio(s)</p>
              </div>
              <button type="button" className={styles.secondaryActionButton} onClick={() => setSelectedStage("")}>
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
