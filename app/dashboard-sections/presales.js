"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, Metric, PageTitle } from "../dashboard-ui";
import {
  SectionEmptyState,
} from "../dashboard-section-feedback";
import styles from "../page.module.css";
import { canViewTeamTasks } from "lib/services/dashboard-tasks";

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

export function PreSalesContent({ dashboardData, initialOwnerFilter = "todos", sessionUser = {} }) {
  const router = useRouter();
  const [selectedOwnerDraft, setSelectedOwnerDraft] = useState("");
  const [isFilterPending, startFilterTransition] = useTransition();
  const loadingState = dashboardData.states?.loading || "ready";
  const stateErrors = dashboardData.states?.errors || [];
  const canViewTeam = canViewTeamTasks(sessionUser);
  const ownerOptions = useMemo(
    () => buildOwnerOptions(Array.isArray(dashboardData.integration?.ownerDirectory) ? dashboardData.integration.ownerDirectory : []),
    [dashboardData.integration?.ownerDirectory],
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
  const baselineDraftValue = useMemo(() => {
    if (!canViewTeam) {
      return "";
    }

    return initialResolvedOwner && normalizeComparable(initialResolvedOwner) !== "todos"
      ? initialResolvedOwner
      : "";
  }, [canViewTeam, initialResolvedOwner]);
  const placeholderText = canViewTeam ? "Todos" : sessionOwnerLabel || "Meu proprietario";
  const filtersDirty = canViewTeam
    ? normalizeComparable(selectedOwnerDraft || "") !== normalizeComparable(baselineDraftValue)
    : false;
  useEffect(() => {
    setSelectedOwnerDraft(baselineDraftValue);
  }, [baselineDraftValue]);

  function handleApplyFilters() {
    if (!canViewTeam) {
      return;
    }

    const resolvedOption = resolveOwnerOption(ownerOptions, selectedOwnerDraft || resolvedOwnerSelection);
    if (!resolvedOption?.label) {
      return;
    }

    startFilterTransition(() => {
      const searchParams = new URLSearchParams();
      if (normalizeComparable(resolvedOption.label) !== "todos") {
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
              <Metric title="Contatos gerais" value={summary.metrics.totalContacts} note="Contatos sob responsabilidade do pre-vendedor" />
              <Metric title="Sem conexao" value={summary.metrics.contactsWithoutConnection} note="Sem chamada, tarefa ou reuniao registrada" />
              <Metric title="Qualificados" value={summary.metrics.qualifiedContacts} note="Contatos prontos para avancar para vendas" />
              <Metric title="Oportunidades com deal" value={summary.metrics.opportunitiesWithDeals} note="Contatos que ja possuem oportunidade associada" />
            </div>
          </Card>

          <Card eyebrow="DESEMPENHO" title="Execucao do pre-vendedor" wide>
            <div className={styles.campaignProspectingMetrics}>
              <Metric title="Chamadas totais" value={summary.metrics.totalCalls} note="Registros de chamada ligados aos contatos da carteira" />
              <Metric title="Media de chamadas por contato" value={summary.metrics.averageCallsPerContact} note="Chamadas totais divididas pela carteira" />
              <Metric title="Conexoes totais" value={summary.metrics.totalConnections} note="Contatos com pelo menos uma interacao registrada" />
              <Metric title="Atividades feitas" value={summary.metrics.activitiesDone} note="Chamadas, reunioes e tarefas concluidas" />
              <Metric title="Atividades por fazer" value={summary.metrics.activitiesOpen} note="Itens ainda abertos no fluxo operacional" />
            </div>
          </Card>

          <Card eyebrow="REUNIOES" title="Passagem para vendas" wide>
            <div className={styles.campaignProspectingMetrics}>
              <Metric title="Reunioes programadas" value={summary.metrics.scheduledMeetings} note="Agenda futura registrada na HubSpot" />
              <Metric title="Reunioes realizadas" value={summary.metrics.completedMeetings} note="Reunioes que ja aconteceram na carteira" />
              <Metric title="Para reagendar" value={summary.metrics.meetingsToReschedule} note="No-show, canceladas ou que voltaram para o pre-vendedor" />
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
    </section>
  );
}
