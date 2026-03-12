"use client";

import { useState } from "react";
import { Card, Metric, Table } from "../dashboard-ui";
import PageAgentPanel, { PageAgentToggleButton } from "../page-agent-panel";
import {
  SectionEmptyState,
  SectionLoadingState,
  SectionNotice,
} from "../dashboard-section-feedback";
import styles from "../page.module.css";
import {
  aggregateCampaignSummary,
  getCampaignById,
  getCampaignOptions,
} from "lib/services/dashboard-campaigns";

function formatDateTime(value) {
  if (!value) {
    return "Sem atividade recente";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Sem atividade recente";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function GoalList({ goals }) {
  return (
    <div className={styles.campaignGoalList}>
      {goals.map((goal) => (
        <article key={goal.id} className={styles.campaignGoalItem}>
          <div className={styles.campaignGoalHeader}>
            <div>
              <strong>{goal.label}</strong>
              <span>{goal.status}</span>
            </div>
            <div className={styles.campaignGoalMeta}>
              <strong>{`${goal.current}/${goal.target}`}</strong>
              <small>{goal.remaining ? `Faltam ${goal.remaining}` : "Meta batida"}</small>
            </div>
          </div>
          <div className={styles.campaignGoalBar} aria-hidden="true">
            <span className={styles.campaignGoalBarFill} style={{ width: `${Math.min(goal.progress, 100)}%` }} />
          </div>
        </article>
      ))}
    </div>
  );
}

export function CampaignsContent({ dashboardData }) {
  const [agentOpen, setAgentOpen] = useState(false);
  const [campaignFilter, setCampaignFilter] = useState("all");
  const campaigns = Array.isArray(dashboardData.campaigns) ? dashboardData.campaigns : [];
  const campaignOptions = getCampaignOptions(campaigns);
  const selectedCampaign = getCampaignById(campaigns, campaignFilter);
  const summary = selectedCampaign || aggregateCampaignSummary(campaigns);
  const loadingState = dashboardData.states?.loading || "ready";
  const stateErrors = dashboardData.states?.errors || [];

  return (
    <section className={styles.dashboardSection}>
      <header className={styles.sectionHeaderBar}>
        <div className={styles.settingsHeader}>
          <h1>Campanhas</h1>
          <p>Acompanhamento geral de campanhas com SDR, SQL, reunioes, propostas e fechamentos puxados da HubSpot.</p>
        </div>
        <PageAgentToggleButton agentId="campaigns" open={agentOpen} onToggle={() => setAgentOpen((value) => !value)} />
      </header>

      {agentOpen ? (
        <div className={styles.grid}>
          <PageAgentPanel
            agentId="campaigns"
            dashboardData={dashboardData}
            context={{ campaignId: campaignFilter === "all" ? "" : campaignFilter }}
          />
        </div>
      ) : null}

      <div className={styles.dealsFilters}>
        <label className={styles.dealsFilterField}>
          <span>Campanha</span>
          <select
            className={styles.dealsFilterSelect}
            value={campaignFilter}
            onChange={(event) => setCampaignFilter(event.target.value)}
          >
            <option value="all">Todas as campanhas</option>
            {campaignOptions.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>{campaign.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.taskScopeHint}>
        {campaignFilter === "all"
          ? "Mostrando uma consolidacao geral das campanhas sincronizadas pela HubSpot."
          : `Mostrando o acompanhamento da campanha ${selectedCampaign?.name || "selecionada"}.`}
      </div>

      {loadingState === "loading" ? (
        <SectionLoadingState
          title="Carregando campanhas"
          description="Buscando campanhas, atividades SDR e resultados mais recentes."
        />
      ) : null}

      {stateErrors.length ? (
        <SectionNotice variant="error">{stateErrors[0] || "As campanhas ainda nao conseguiram carregar dados reais."}</SectionNotice>
      ) : null}

      {!campaigns.length && loadingState === "ready" && !stateErrors.length ? (
        <SectionEmptyState
          title="Sem campanhas consolidadas"
          description="Assim que a HubSpot trouxer campanhas, contatos e atividades associadas, o acompanhamento vai aparecer aqui."
        />
      ) : null}

      <div className={styles.grid}>
        <Card eyebrow="VISAO GERAL" title={summary.name} wide>
          <div className={styles.metrics}>
            <Metric title="SQLs" value={`${summary.qualification.sqlCount}`} note="Meta da campanha: 40" />
            <Metric title="Reunioes" value={`${summary.meetingCount}`} note="Meta da campanha: 70" />
            <Metric title="Fechados" value={`${summary.sales.closedWonCount}`} note="Meta da campanha: 15" />
            <Metric title="Oportunidades qualificadas" value={`${summary.qualifiedOpportunityCount}`} note="Objetivo principal: 65" />
          </div>
          <div className={styles.campaignSummaryMeta}>
            <span>{`Ultima atividade: ${formatDateTime(summary.lastActivityAt)}`}</span>
            <span>{`Conversao MQL > SQL: ${summary.qualification.conversionRate}%`}</span>
            <span>{`Conversao proposta > fechamento: ${summary.sales.conversionRate}%`}</span>
          </div>
        </Card>

        <Card eyebrow="SDR" title="Relatorios de prospeccao e atividade" wide>
          <div className={styles.metrics}>
            <Metric title="Ligacoes hoje" value={`${summary.prospecting.callsDaily}`} note="Meta minima diaria: 15" />
            <Metric title="Ligacoes na semana" value={`${summary.prospecting.callsWeekly}`} note="Volume semanal de prospeccao" />
            <Metric title="Conexoes hoje" value={`${summary.prospecting.connectionsDaily}`} note="Meta minima diaria: 7" />
            <Metric title="Conexoes na semana" value={`${summary.prospecting.connectionsWeekly}`} note="Emails, redes e outras interacoes" />
          </div>
        </Card>

        <Card eyebrow="QUALIFICACAO" title="Relatorios de qualificacao e conversao">
          <div className={styles.metrics}>
            <Metric title="MQLs" value={`${summary.qualification.mqlCount}`} note="Leads de marketing mapeados" />
            <Metric title="SQLs" value={`${summary.qualification.sqlCount}`} note="Meta da campanha: 40 ate 17/05/2026" />
            <Metric title="Taxa MQL > SQL" value={`${summary.qualification.conversionRate}%`} note="Efetividade da qualificacao SDR" />
          </div>
        </Card>

        <Card eyebrow="VENDAS" title="Relatorios de desempenho e fechamento">
          <div className={styles.metrics}>
            <Metric title="Propostas" value={`${summary.sales.proposalCount}`} note="Deals em etapa de proposta" />
            <Metric title="Fechados" value={`${summary.sales.closedWonCount}`} note="Meta da campanha: 15" />
            <Metric title="Taxa proposta > fechamento" value={`${summary.sales.conversionRate}%`} note="Eficacia do fechamento" />
          </div>
        </Card>

        <Card eyebrow="METAS SMART" title="Acompanhamento macro da campanha" wide>
          <GoalList goals={summary.smartGoals} />
        </Card>

        <Card eyebrow="COMPARATIVO" title="Campanhas sincronizadas" wide>
          <Table
            head={["Campanha", "SQLs", "Reunioes", "Fechados", "Conv. proposta"]}
            rows={campaigns.map((campaign) => [
              campaign.name,
              `${campaign.qualification.sqlCount}`,
              `${campaign.meetingCount}`,
              `${campaign.sales.closedWonCount}`,
              `${campaign.sales.conversionRate}%`,
            ])}
          />
        </Card>
      </div>
    </section>
  );
}
