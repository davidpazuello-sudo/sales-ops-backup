"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, Metric, PageTitle } from "../dashboard-ui";
import {
  SectionEmptyState,
  SectionNotice,
} from "../dashboard-section-feedback";
import styles from "../page.module.css";

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

export function PreSalesContent({ dashboardData, initialOwnerFilter = "todos" }) {
  const router = useRouter();
  const [selectedOwnerDraft, setSelectedOwnerDraft] = useState(initialOwnerFilter || "todos");
  const [isFilterPending, startFilterTransition] = useTransition();
  const loadingState = dashboardData.states?.loading || "ready";
  const stateErrors = dashboardData.states?.errors || [];
  const ownerOptions = useMemo(
    () => buildOwnerOptions(Array.isArray(dashboardData.integration?.ownerDirectory) ? dashboardData.integration.ownerDirectory : []),
    [dashboardData.integration?.ownerDirectory],
  );
  const resolvedOwnerSelection = resolveOwnerOptionLabel(ownerOptions, selectedOwnerDraft);
  const summary = dashboardData.presales || null;
  const filtersDirty = normalizeComparable(selectedOwnerDraft || "todos") !== normalizeComparable(initialOwnerFilter || "todos");
  const scopeMessage = resolvedOwnerSelection && normalizeComparable(resolvedOwnerSelection) !== "todos"
    ? `Mostrando a rotina operacional do pre-vendedor ${resolvedOwnerSelection}.`
    : "Mostrando a carteira consolidada de todos os pre-vendedores da HubSpot.";

  useEffect(() => {
    setSelectedOwnerDraft(initialOwnerFilter || "todos");
  }, [initialOwnerFilter]);

  function handleApplyFilters() {
    if (!resolvedOwnerSelection) {
      return;
    }

    startFilterTransition(() => {
      const searchParams = new URLSearchParams();
      if (normalizeComparable(resolvedOwnerSelection) !== "todos") {
        searchParams.set("proprietario", resolvedOwnerSelection);
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
            placeholder="Buscar proprietario"
            value={selectedOwnerDraft}
            onChange={(event) => setSelectedOwnerDraft(event.target.value)}
            disabled={isFilterPending}
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
          disabled={!resolvedOwnerSelection || !filtersDirty || isFilterPending}
        >
          Filtrar
        </button>
      </div>

      <SectionNotice
        variant="info"
        title="Visao operacional"
      >
        {scopeMessage}
      </SectionNotice>

      {stateErrors.length ? (
        <SectionNotice
          variant="error"
          title="Falha de integracao"
        >
          {stateErrors[0]}
        </SectionNotice>
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
