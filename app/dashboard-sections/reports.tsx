// @ts-nocheck
"use client";

import { useState } from "react";
import { Card, Metric, PageTitle, Table } from "../dashboard-ui";
import PageAgentPanel, { PageAgentToggleButton } from "../page-agent-panel";
import {
  SectionEmptyState,
  SectionNotice,
} from "../dashboard-section-feedback";
import styles from "./reports.module.css";

export function ReportsContent({ dashboardData }) {
  const [agentOpen, setAgentOpen] = useState(false);
  const loadingState = dashboardData.states?.loading || "ready";
  const stateErrors = dashboardData.states?.errors || [];

  return (
    <section className={styles.dashboardSection}>
      <header className={styles.sectionHeaderBar}>
        <div className={styles.settingsHeader}>
          <PageTitle loading={loadingState === "loading"} loadingLabel="Carregando relatórios da HubSpot">
            Relatórios
          </PageTitle>
          <p>Resumo executivo puxado da HubSpot, com visão por vendedor e pipeline aberto.</p>
        </div>
        <PageAgentToggleButton agentId="reports" open={agentOpen} onToggle={() => setAgentOpen((value) => !value)} />
      </header>

      {agentOpen ? (
        <div className={styles.grid}>
          <PageAgentPanel agentId="reports" dashboardData={dashboardData} />
        </div>
      ) : null}

      {stateErrors.length ? (
        <SectionNotice variant="error">{stateErrors[0] || "Os relatórios ainda não conseguiram carregar dados reais."}</SectionNotice>
      ) : null}

      {!dashboardData.reports.length && loadingState === "ready" && !stateErrors.length ? (
        <SectionEmptyState
          title="Sem relatórios consolidados"
          description="Assim que o dashboard receber dados reais da HubSpot, os resumos por vendedor aparecerão aqui."
        />
      ) : null}

      <div className={styles.grid}>
        <Card eyebrow="HUBSPOT" title="KPIs comerciais" wide>
          <div className={styles.metrics}>
            <Metric title="Pipeline aberto" value={`R$ ${Math.round((dashboardData.summary.totalPipeline || 0) / 1000)}k`} note="Negócios em aberto na HubSpot" />
            <Metric title="Won no mês" value={`R$ ${Math.round((dashboardData.summary.wonThisMonth || 0) / 1000)}k`} note="Fechamentos marcados como closed won" />
            <Metric title="Negócios parados" value={`${dashboardData.summary.stalledDeals || 0}`} note="Sem contato recente" />
          </div>
        </Card>

        <Card eyebrow="TIME" title="Visão por vendedor" wide>
          <Table head={["Vendedor", "Meta", "Pipeline", "Status"]} rows={dashboardData.reports} />
        </Card>
      </div>
    </section>
  );
}
