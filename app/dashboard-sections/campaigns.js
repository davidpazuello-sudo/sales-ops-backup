"use client";

import { useState } from "react";
import { Card, Metric } from "../dashboard-ui";
import PageAgentPanel, { PageAgentToggleButton } from "../page-agent-panel";
import {
  SectionEmptyState,
  SectionNotice,
} from "../dashboard-section-feedback";
import styles from "../page.module.css";
import {
  PRIMARY_CAMPAIGN_NAME,
  getPrimaryCampaign,
} from "lib/services/dashboard-campaigns";

const EMPTY_CAMPAIGNS = [];

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
  const campaigns = Array.isArray(dashboardData.campaigns) ? dashboardData.campaigns : EMPTY_CAMPAIGNS;
  const summary = getPrimaryCampaign(campaigns);
  const loadingState = dashboardData.states?.loading || "ready";
  const stateErrors = dashboardData.states?.errors || [];

  return (
    <section className={styles.dashboardSection}>
      <header className={styles.sectionHeaderBar}>
        <div className={styles.settingsHeader}>
          <h1>Campanhas</h1>
          <p>Acompanhamento dedicado da campanha {PRIMARY_CAMPAIGN_NAME} com dados reais da HubSpot.</p>
        </div>
        <PageAgentToggleButton agentId="campaigns" open={agentOpen} onToggle={() => setAgentOpen((value) => !value)} />
      </header>

      {agentOpen ? (
        <div className={styles.grid}>
          <PageAgentPanel
            agentId="campaigns"
            dashboardData={dashboardData}
            context={{ campaignId: summary?.id || "" }}
          />
        </div>
      ) : null}

      <div className={styles.taskScopeHint}>
        {summary
          ? `Mostrando o acompanhamento da campanha ${summary.name}.`
          : `Mostrando apenas a campanha ${PRIMARY_CAMPAIGN_NAME}.`}
      </div>

      {stateErrors.length ? (
        <SectionNotice variant="error">{stateErrors[0] || "A campanha ainda nao conseguiu carregar dados reais."}</SectionNotice>
      ) : null}

      {!summary && loadingState === "ready" && !stateErrors.length ? (
        <SectionEmptyState
          title={`Campanha ${PRIMARY_CAMPAIGN_NAME} sem dados sincronizados`}
          description={`Assim que a HubSpot trouxer deals, contatos e atividades da campanha ${PRIMARY_CAMPAIGN_NAME}, o acompanhamento vai aparecer aqui.`}
        />
      ) : null}

      {summary ? (
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
        </div>
      ) : null}
    </section>
  );
}
