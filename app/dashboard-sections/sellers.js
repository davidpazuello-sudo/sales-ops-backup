"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  MeetingIcon,
  Metric,
  PageTitle,
  Row,
} from "../dashboard-ui";
import PageAgentPanel, { PageAgentToggleButton } from "../page-agent-panel";
import {
  SectionEmptyState,
  SectionNotice,
} from "../dashboard-section-feedback";
import styles from "../page.module.css";
import { getMeetingsForSeller, meetingToSlug, sellerToSlug } from "lib/dashboard-shell-helpers";
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
  const meetings = getMeetingsForSeller(dashboardData, seller);
  const loadingState = dashboardData.states?.loading || "ready";
  const stateErrors = dashboardData.states?.errors || [];

  if (!seller) {
    return (
      <section className={styles.dashboardSection}>
        <header className={styles.sellerDetailHeader}>
          <div className={styles.settingsHeader}>
            <PageTitle loading={loadingState === "loading"} loadingLabel="Carregando reunioes da HubSpot">
              Reunioes
            </PageTitle>
            <p>Nao encontramos um vendedor sincronizado para esta tela.</p>
          </div>
        </header>
        <SectionEmptyState
          title="Perfil do vendedor indisponivel"
          description="Volte para a lista de vendedores quando a sincronizacao terminar."
        />
      </section>
    );
  }

  return (
    <section className={styles.dashboardSection}>
      <header className={styles.sellerDetailHeader}>
        <div className={styles.settingsHeader}>
          <PageTitle loading={loadingState === "loading"} loadingLabel="Carregando reunioes da HubSpot">
            Reunioes internas
          </PageTitle>
          <p>{seller.name} · Lista consolidada de alinhamentos internos e rituais de acompanhamento.</p>
        </div>
        <div className={styles.sellerMeetingActions}>
          <button type="button" className={styles.primaryActionButton} onClick={() => router.push(`/vendedores/${sellerSlug}/reunioes/nova`)}>
            <MeetingIcon />
            <span>Registrar nova reuniao</span>
          </button>
        </div>
      </header>

      {stateErrors.length ? (
        <SectionNotice variant="error">{stateErrors[0] || "Nao foi possivel carregar as reunioes agora."}</SectionNotice>
      ) : null}

      {!meetings.length && loadingState === "ready" && !stateErrors.length ? (
        <SectionEmptyState
          title="Sem reunioes neste vendedor"
          description="Quando houver reunioes reais da HubSpot ou registros internos, elas aparecerao aqui."
        />
      ) : (
        <section className={styles.meetingsList}>
          {meetings.map((meeting) => (
            <button key={meeting.id} type="button" className={styles.meetingRow} onClick={() => router.push(`/vendedores/${sellerSlug}/reunioes/${meeting.slug || meetingToSlug(meeting)}`)}>
              <div className={styles.meetingPrimary}>
                <strong>{meeting.title}</strong>
                <span>{meeting.summary}</span>
              </div>
              <div className={styles.meetingMeta}>
                <strong>{meeting.dateLabel}</strong>
                <span>{meeting.timeLabel}</span>
              </div>
              <div className={styles.meetingMeta}>
                <strong>{meeting.type}</strong>
                <span>{meeting.owner}</span>
              </div>
            </button>
          ))}
        </section>
      )}
    </section>
  );
}

export function SellerMeetingDetailContent({ dashboardData, sellerSlug, meetingId }) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: "",
    date: "",
    time: "",
    type: "Reuniao interna",
    summary: "",
  });
  const [formError, setFormError] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const loadingState = dashboardData.states?.loading || "ready";
  const stateErrors = dashboardData.states?.errors || [];
  const seller = dashboardData.sellers.find((item) => sellerToSlug(item.name) === sellerSlug) || dashboardData.sellers[0];
  const meetings = getMeetingsForSeller(dashboardData, seller);
  const selectedMeeting = meetings.find((item) => (item.slug || meetingToSlug(item)) === meetingId) || meetings[0];
  const meeting = selectedMeeting
    ? {
        ...selectedMeeting,
        title: selectedMeeting.title || "Reuniao interna",
        date: selectedMeeting.dateLabel || selectedMeeting.date || "Sem data",
        time: selectedMeeting.timeLabel || selectedMeeting.time || "Sem horario",
        type: selectedMeeting.type || "Reuniao",
      }
    : {
        title: "Reuniao interna",
        date: "Sem data",
        time: "Sem horario",
        type: "Reuniao",
      };
  const isNewMeeting = meetingId === "nova";

  useEffect(() => {
    if (!isNewMeeting) {
      return;
    }

    const nextDate = new Date();
    const datePart = nextDate.toISOString().slice(0, 10);
    const timePart = nextDate.toTimeString().slice(0, 5);
    setFormData((current) => ({
      ...current,
      date: current.date || datePart,
      time: current.time || timePart,
    }));
  }, [isNewMeeting]);

  if (!seller) {
    return (
      <section className={styles.dashboardSection}>
        <header className={styles.settingsHeader}>
          <PageTitle loading={loadingState === "loading"} loadingLabel="Carregando reuniao da HubSpot">
            {isNewMeeting ? "Registrar nova reuniao" : "Reuniao interna"}
          </PageTitle>
          <p>Preparando os dados do vendedor para esta tela.</p>
        </header>
        {stateErrors.length ? (
          <SectionNotice variant="error">{stateErrors[0] || "Nao foi possivel carregar o vendedor agora."}</SectionNotice>
        ) : null}
        <SectionEmptyState
          title={loadingState === "loading" ? "Carregando vendedor" : "Vendedor nao encontrado"}
          description={loadingState === "loading"
            ? "Aguarde alguns instantes enquanto sincronizamos os dados da HubSpot."
            : "Volte para a lista de vendedores e tente abrir novamente."}
        />
      </section>
    );
  }

  async function handleMeetingSave() {
    const title = formData.title.trim();
    const summary = formData.summary.trim();
    const meetingAt = formData.date && formData.time ? `${formData.date}T${formData.time}:00` : "";

    if (!title || !meetingAt) {
      setFormError("Preencha titulo, data e horario para registrar a reuniao.");
      return;
    }

    setSaving(true);
    setFormError("");
    setFormMessage("");

    const response = await fetch("/api/meetings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        summary,
        meetingAt: new Date(meetingAt).toISOString(),
        type: formData.type,
        ownerName: seller?.name || "",
        ownerEmail: seller?.email || "",
        hubspotOwnerId: seller?.id || "",
      }),
    }).catch(() => null);

    const payload = await response?.json().catch(() => null);
    setSaving(false);

    if (!response?.ok) {
      setFormError(payload?.error || "Nao foi possivel registrar a reuniao agora.");
      return;
    }

    setFormMessage(payload?.message || "Reuniao registrada com sucesso.");
    router.push(`/vendedores/${sellerSlug}/reunioes`);
  }

  return (
    <section className={styles.dashboardSection}>
      <header className={styles.sellerDetailHeader}>
        <div className={styles.settingsHeader}>
          <PageTitle loading={loadingState === "loading"} loadingLabel="Carregando reuniao da HubSpot">
            {isNewMeeting ? "Registrar nova reuniao" : meeting.title}
          </PageTitle>
          <p>{isNewMeeting ? `Novo registro interno para ${seller.name}, preparado para posterior sincronizacao com a HubSpot.` : `${meeting.date} · ${meeting.time} · ${meeting.type}`}</p>
        </div>
      </header>

      <div className={styles.grid}>
        <Card eyebrow="REUNIAO" title={isNewMeeting ? "Novo registro" : "Resumo da reuniao"} wide>
          {isNewMeeting ? (
            <div className={styles.meetingComposer}>
              {formError ? <SectionNotice variant="error">{formError}</SectionNotice> : null}
              {formMessage ? <SectionNotice variant="success">{formMessage}</SectionNotice> : null}
              <label className={styles.meetingField}>
                <span>Titulo</span>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(event) => setFormData((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Ex.: Alinhamento semanal do pipeline"
                />
              </label>
              <div className={styles.meetingFieldRow}>
                <label className={styles.meetingField}>
                  <span>Data</span>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(event) => setFormData((current) => ({ ...current, date: event.target.value }))}
                  />
                </label>
                <label className={styles.meetingField}>
                  <span>Horario</span>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(event) => setFormData((current) => ({ ...current, time: event.target.value }))}
                  />
                </label>
              </div>
              <label className={styles.meetingField}>
                <span>Tipo</span>
                <input
                  type="text"
                  value={formData.type}
                  onChange={(event) => setFormData((current) => ({ ...current, type: event.target.value }))}
                  placeholder="Ex.: Coaching, Operacao, Ritual semanal"
                />
              </label>
              <label className={styles.meetingField}>
                <span>Resumo</span>
                <textarea
                  rows="5"
                  value={formData.summary}
                  onChange={(event) => setFormData((current) => ({ ...current, summary: event.target.value }))}
                  placeholder="Descreva objetivo, contexto e decisoes da reuniao."
                />
              </label>
              <div className={styles.meetingFormActions}>
                <button type="button" className={styles.secondaryActionButton} onClick={() => router.push(`/vendedores/${sellerSlug}/reunioes`)}>
                  Cancelar
                </button>
                <button type="button" className={styles.primaryActionButton} onClick={handleMeetingSave} disabled={saving}>
                  {saving ? "Salvando..." : "Salvar reuniao"}
                </button>
              </div>
            </div>
          ) : meeting ? (
            <div className={styles.meetingDetailStack}>
              <Row label="Responsavel" value={meeting.owner} />
              <Row label="Tipo" value={meeting.type} />
              <Row label="Status" value={meeting.statusLabel || "Registrada"} />
              <Row label="Origem" value={meeting.source === "hubspot" ? "HubSpot" : "Workspace operacional"} />
              <Row label="Resumo" value={meeting.summary} />
              {meeting.notes ? (
                <div className={styles.meetingAiPanel}>
                  <strong>Notas operacionais</strong>
                  <p>{meeting.notes}</p>
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
          ) : (
            <SectionEmptyState
              title="Reuniao nao encontrada"
              description="Volte para a lista e abra uma reuniao sincronizada ou registre uma nova."
            />
          )}
        </Card>
      </div>
    </section>
  );
}

export function SellersContent({ dashboardData }) {
  const router = useRouter();
  const [sellerFilter, setSellerFilter] = useState("");
  const [sellerDraft, setSellerDraft] = useState("");
  const [agentOpen, setAgentOpen] = useState(false);
  const loadingState = dashboardData.states?.loading || "ready";
  const stateErrors = dashboardData.states?.errors || [];
  const filteredSellers = dashboardData.sellers.filter((seller) =>
    seller.name.toLowerCase().includes(sellerFilter.trim().toLowerCase()),
  );
  const filtersDirty = sellerDraft.trim() !== sellerFilter;

  function handleApplyFilters(event) {
    event.preventDefault();
    setSellerFilter(sellerDraft.trim());
  }

  return (
    <section className={styles.dashboardSection}>
      <header className={styles.sectionHeaderBar}>
        <div className={styles.settingsHeader}>
          <PageTitle loading={loadingState === "loading"} loadingLabel="Carregando usuarios da HubSpot">
            Vendedores
          </PageTitle>
        </div>
        <PageAgentToggleButton agentId="sellers" open={agentOpen} onToggle={() => setAgentOpen((value) => !value)} />
      </header>

      {agentOpen ? (
        <div className={styles.grid}>
          <PageAgentPanel agentId="sellers" dashboardData={dashboardData} />
        </div>
      ) : null}

      <form className={styles.dealsFilters} onSubmit={handleApplyFilters}>
        <label className={styles.dealsFilterField}>
          <span>Filtrar por nome</span>
          <input type="text" className={styles.dealsFilterInput} value={sellerDraft} onChange={(event) => setSellerDraft(event.target.value)} placeholder="Buscar vendedor" />
        </label>
        <div className={styles.filterActionGroup}>
          <button type="submit" className={`${styles.primaryActionButton} ${styles.filterApplyButton}`.trim()} disabled={!filtersDirty}>
            Filtrar
          </button>
        </div>
      </form>

      {stateErrors.length ? (
        <SectionNotice variant="error">{stateErrors[0] || "A lista de vendedores ainda nao conseguiu carregar dados reais."}</SectionNotice>
      ) : null}

      {!filteredSellers.length && loadingState === "ready" && !stateErrors.length ? (
        <SectionEmptyState
          title={sellerFilter.trim() ? "Nenhum vendedor encontrado" : "Nenhum vendedor sincronizado"}
          description={sellerFilter.trim() ? "Tente ajustar o nome pesquisado ou limpar o filtro." : "Quando a HubSpot retornar owners reais, eles aparecerao nesta lista."}
        />
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
  const loadingState = dashboardData.states?.loading || "ready";
  const seller = dashboardData.sellers.find((item) => sellerToSlug(item.name) === sellerSlug) || dashboardData.sellers[0];

  if (!seller) {
    return (
      <section className={styles.dashboardSection}>
        <header className={styles.settingsHeader}>
          <PageTitle loading={loadingState === "loading"} loadingLabel="Carregando vendedor da HubSpot">
            Vendedores
          </PageTitle>
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
  const sellerMeetings = getMeetingsForSeller(dashboardData, seller);
  const nextMeeting = sellerMeetings[0] || null;

  return (
    <section className={styles.dashboardSection}>
      <header className={styles.sellerDetailHeader}>
        <div className={styles.sellerDetailIdentity}>
          <div className={styles.sellerDetailAvatar}>{seller.initials}</div>
          <div className={`${styles.settingsHeader} ${styles.sellerDetailHeaderBlock}`.trim()}>
            <PageTitle loading={loadingState === "loading"} loadingLabel="Carregando vendedor da HubSpot">
              {seller.name}
            </PageTitle>
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
                <strong>Cadencia operacional</strong>
                <span>Reunioes, tarefas e acompanhamentos reais deste vendedor</span>
              </div>
              <div className={styles.dealMeta}>
                <strong>{sellerMeetings.length}</strong>
                <span>Reunioes registradas</span>
              </div>
              <div className={styles.dealMeta}>
                <strong>{pendingTasks}</strong>
                <span>Tarefas em aberto</span>
              </div>
            </article>
          </div>
          <div className={styles.kpiRow}>
            <div className={styles.kpiCard}>
              <span>Proxima reuniao</span>
              <strong>{nextMeeting ? `${nextMeeting.dateLabel} ${nextMeeting.timeLabel}` : "Sem agenda"}</strong>
            </div>
            <div className={styles.kpiCard}>
              <span>Origem mais recente</span>
              <strong>{nextMeeting ? (nextMeeting.source === "hubspot" ? "HubSpot" : "Workspace") : "Sem registros"}</strong>
            </div>
            <div className={styles.kpiCard}>
              <span>Resumo operacional</span>
              <strong>{seller.note}</strong>
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
