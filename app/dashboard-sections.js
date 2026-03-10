"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import {
  Card,
  MeetingIcon,
  Metric,
  OptionGroup,
  PhotoOption,
  PreferenceTable,
  Row,
  SparkIcon,
  Table,
} from "./dashboard-ui";

export function SettingsSectionContent({
  section,
  personalization,
  updatePersonalization,
  profilePhoto,
  onPhotoChange,
  dashboardData,
  resources,
}) {
  const {
    accountSection,
    permissionRows,
    mappingRows,
    errorRows,
    metricRows,
    reportRows,
    queueRows,
    auditRows,
    maskingRows,
    themeOptions,
    fontOptions,
    fontSizeOptions,
    densityOptions,
    personalizationToggles,
  } = resources;

  if (section === "account") {
    return (
      <div className={styles.grid}>
        <Card eyebrow="PERFIL" title="Conta & Acesso">
          <PhotoOption profilePhoto={profilePhoto} onPhotoChange={onPhotoChange} />
          <Row label="Nome" value="Usuário SalesOps" />
          <Row label="Senha" value="Última troca há 14 dias" />
          <Row label="2FA" value="Obrigatório para gestão" helper="SMS + autenticador" />
          <Row label="Sessões ativas" value="5 dispositivos" helper="2 navegadores e 3 mobile" />
        </Card>
        <Card eyebrow="PERMISSÕES" title="Permissões por cargo">
          <Table head={["Cargo", "Acesso"]} rows={permissionRows} />
        </Card>
      </div>
    );
  }

  if (section === "hubspot") {
    return (
      <div className={styles.grid}>
        <Card eyebrow="STATUS" title="Integração HubSpot">
          <Row
            label="Conexão"
            value={dashboardData.configured ? dashboardData.integration.status : "Pendente"}
            helper={
              dashboardData.configured
                ? `${dashboardData.integration.owners} proprietarios e ${dashboardData.integration.deals} negocios sincronizados`
                : "Configure o token para sincronizar com a HubSpot"
            }
          />
          <Row label="Origem dos dados" value="HubSpot API" helper="Private app access token" />
          <Row label="Pipeline ativo" value={`R$ ${Math.round((dashboardData.integration.pipelineAmount || 0) / 1000)}k`} />
        </Card>
        <Card eyebrow="MAPEAMENTO" title="Campos sincronizados" wide>
          <Table head={["SalesOps", "HubSpot", "Status"]} rows={mappingRows} />
        </Card>
        <Card eyebrow="LOG" title="Erros recentes">
          <Table
            head={["Hora", "Erro", "Gravidade"]}
            rows={dashboardData.configured ? [["Agora", "Sincronizacao via API operando", "Baixo"]] : errorRows}
          />
        </Card>
      </div>
    );
  }

  if (section === "notifications") {
    return (
      <div className={styles.grid}>
        <Card eyebrow="CANAIS" title="Notificações & Alertas">
          <Row label="Email" value="Ativo" helper="comercial@salesops.ai" />
          <Row label="Push" value="Ativo" helper="Chrome + mobile" />
          <Row label="Resumo automático" value="Diário" />
        </Card>
        <Card eyebrow="THRESHOLDS" title="Metas e thresholds" wide>
          <div className={styles.metrics}>
            {metricRows.map((item) => <Metric key={item[0]} title={item[0]} value={item[1]} note={item[2]} />)}
          </div>
        </Card>
      </div>
    );
  }

  if (section === "ai") {
    return (
      <div className={styles.grid}>
        <Card eyebrow="MODELO" title="IA & Diagnósticos">
          <Row label="Modelo ativo" value="GPT SalesOps Analyst" />
          <Row label="Assistente de voz" value="Habilitado" />
          <Row label="Sensibilidade" value="Moderada" helper="menos ruído, mais sinais de risco" />
        </Card>
        <Card eyebrow="DADOS" title="Dados que alimentam a IA" wide>
          <div className={styles.tags}>
            <span>Negócios</span>
            <span>Atividades</span>
            <span>Calls gravadas</span>
            <span>Sentimento do vendedor</span>
            <span>Próximas tarefas</span>
          </div>
        </Card>
      </div>
    );
  }

  if (section === "personalize") {
    return (
      <div className={styles.grid}>
        <Card eyebrow="APARÊNCIA" title="Tema e tipografia">
          <OptionGroup title="Tema" options={themeOptions} value={personalization.theme} onChange={(value) => updatePersonalization("theme", value)} />
          <OptionGroup title="Fonte principal" options={fontOptions} value={personalization.font} onChange={(value) => updatePersonalization("font", value)} />
          <OptionGroup title="Tamanho das letras" options={fontSizeOptions} value={personalization.fontSize} onChange={(value) => updatePersonalization("fontSize", value)} />
        </Card>
        <Card eyebrow="INTERFACE" title="Densidade e leitura">
          <OptionGroup title="Densidade" options={densityOptions} value={personalization.density} onChange={(value) => updatePersonalization("density", value)} />
          <PreferenceTable rows={personalizationToggles} values={personalization} onToggle={(id) => updatePersonalization(id, !personalization[id])} />
        </Card>
        <Card eyebrow="VISUAL" title="Prévia das personalizações" wide>
          <div className={styles.previewPanel}>
            <div className={styles.previewCard}>
              <span>Cards</span>
              <strong>{personalization.reinforcedCards ? "Borda reforçada" : "Borda padrão"}</strong>
              <small>{personalization.reinforcedCards ? "Superfícies com mais destaque visual." : "Superfícies leves e discretas."}</small>
            </div>
            <div className={styles.previewCard}>
              <span>Texto</span>
              <strong>{personalization.fontSize}</strong>
              <small>{personalization.font} com escala {personalization.fontSize.toLowerCase()}.</small>
            </div>
            <div className={styles.previewCard}>
              <span>Navegação</span>
              <strong>{personalization.density}</strong>
              <small>{personalization.collapseSidebarOnOpen ? "Sidebar inicia recolhida." : "Sidebar inicia expandida."}</small>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (section === "exports") {
    return (
      <div className={styles.grid}>
        <Card eyebrow="AGENDAMENTO" title="Relatórios & Exportação">
          <Row label="Envio semanal" value="Segunda, 07:30" />
          <Row label="Formato" value="PDF + XLSX" />
          <Row label="Marca d'água" value="Confidencial" />
        </Card>
        <Card eyebrow="TEMPLATES" title="Templates por cargo" wide>
          <Table head={["Cargo", "Template", "Formato"]} rows={reportRows} />
        </Card>
      </div>
    );
  }

  if (section === "storage") {
    return (
      <div className={styles.grid}>
        <Card eyebrow="USO" title="Gestão de Mídia & Storage">
          <div className={styles.usage}>
            <div className={styles.usageTop}>
              <strong>38.4 / 100 GB</strong>
              <span>38%</span>
            </div>
            <div className={styles.usageBar}><span style={{ width: "38.4%" }} /></div>
            <p>Gravações semanais, áudios e anexos operacionais.</p>
          </div>
          <Row label="Hot storage" value="45 dias" />
          <Row label="Cold storage" value="365 dias" helper="arquivamento automático" />
        </Card>
        <Card eyebrow="STT" title="Fila de transcrição em tempo real" wide>
          <Table head={["Arquivo", "Status", "Progresso"]} rows={queueRows} />
        </Card>
        <Card eyebrow="PROVEDOR" title="Indexação e provedor">
          <Row label="Provedor" value="Azure Blob Storage" />
          <Row label="Região" value="Brazil South" helper="aderência LGPD" />
          <Row label="Indexação IA" value="Ativa" />
        </Card>
      </div>
    );
  }

  const currentSectionLabel = accountSection?.label || "Conta & Acesso";

  return (
    <div className={styles.grid}>
      <Card eyebrow="AUDITORIA" title="Eventos recentes" wide>
        <Table head={["Quem", "O quê", "Quando"]} rows={auditRows} />
      </Card>
      <Card eyebrow="MASKING" title="Matriz visual por campo e cargo">
        <Table head={["Campo", "Admin", "Gestor", "Vendedor"]} rows={maskingRows} matrix />
      </Card>
      <Card eyebrow="LGPD" title={`Consentimento e conformidade`}>
        <Row label="Consentimento" value="Registrado por contato" />
        <Row label="Esquecimento" value="Fluxo habilitado" helper="remoção em até 7 dias" />
        <Row label="Relatório" value="Atualizado hoje" />
      </Card>
    </div>
  );
}

export function DealsSectionContent({ dashboardData }) {
  const [boardDeals, setBoardDeals] = useState(dashboardData.deals);
  const [draggedDealId, setDraggedDealId] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("todos");
  const [activityWeeksFilter, setActivityWeeksFilter] = useState("1");
  const [collapsedStages, setCollapsedStages] = useState({});
  const stageOrder = [
    "Oportunidade",
    "Primeira Reunião",
    "Avaliação Técnica Feita",
    "Criação de Tabela de Preço",
    "Tabela de Preço Criada",
    "Avaliação da Tabela Feita",
    "Tabela de Preço Enviada",
    "Tabela de Preço Aceita",
    "Elaboração de DOT",
    "DOT Criado",
    "Avaliação de DOT",
    "DOT Aprovado",
    "DOT Entregue",
    "Elaboração da Proposta",
    "Proposta Criada",
    "Avaliação da Proposta Feita",
    "Proposta Enviada",
    "Proposta Aceita",
    "Elaboração do Acordo de Cooperação",
    "Acordo de Cooperação Criado",
    "Acordo de Cooperação Assinado",
    "Elaboração do Contrato",
    "Contrato Enviado",
    "Negócio Fechado",
    "Negócio Perdido",
  ];

  useEffect(() => {
    setBoardDeals(dashboardData.deals);
  }, [dashboardData.deals]);

  useEffect(() => {
    setBoardDeals((currentDeals) =>
      currentDeals.map((deal) => {
        if (deal.id === "1") return { ...deal, stage: "Proposta Enviada" };
        if (deal.id === "2") return { ...deal, stage: "Avaliação de DOT" };
        if (deal.id === "3") return { ...deal, stage: "Primeira Reunião" };
        return deal;
      }),
    );
  }, []);

  const formatCurrencyFromLabel = (label) => {
    const numericValue = Number.parseFloat(
      String(label).replace(/[^\d,]/g, "").replace(/\./g, "").replace(",", "."),
    );

    if (Number.isNaN(numericValue)) {
      return label;
    }

    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(numericValue);
  };

  const parseStaleDays = (staleLabel) => {
    const days = Number.parseInt(String(staleLabel), 10);
    return Number.isNaN(days) ? 0 : days;
  };

  const ownerOptions = Array.from(new Set(boardDeals.map((deal) => deal.owner))).sort((a, b) => a.localeCompare(b));
  const maxDays = Number(activityWeeksFilter) * 7;
  const visibleDeals = boardDeals.filter((deal) => {
    const ownerMatch = ownerFilter === "todos" || deal.owner === ownerFilter;
    const activityMatch = parseStaleDays(deal.staleLabel) <= maxDays;
    return ownerMatch && activityMatch;
  });

  const stages = Array.from(new Set([...stageOrder, ...boardDeals.map((deal) => deal.stage)]));
  const boardColumns = stages.map((stage) => {
    const stageDeals = visibleDeals.filter((deal) => deal.stage === stage);
    const totalValue = stageDeals.reduce((sum, deal) => {
      const numericValue = Number.parseFloat(
        String(deal.amountLabel).replace(/[^\d,]/g, "").replace(/\./g, "").replace(",", "."),
      );
      return Number.isNaN(numericValue) ? sum : sum + numericValue;
    }, 0);

    return {
      stage,
      deals: stageDeals,
      count: stageDeals.length,
      totalLabel: new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0,
      }).format(totalValue),
    };
  });

  const handleDropStage = (targetStage) => {
    if (!draggedDealId) return;

    setBoardDeals((currentDeals) =>
      currentDeals.map((deal) =>
        deal.id === draggedDealId
          ? { ...deal, stage: targetStage, staleLabel: "Atualizado agora" }
          : deal,
      ),
    );
    setDraggedDealId("");
  };

  const toggleStageCollapse = (stage) => {
    setCollapsedStages((current) => ({ ...current, [stage]: !current[stage] }));
  };

  return (
    <section className={styles.dashboardSection}>
      <header className={styles.settingsHeader}>
        <h1>Negócios</h1>
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
                      <small>Sincronizado com HubSpot. Arraste para atualizar o estágio.</small>
                    </>
                  )}
                </article>
              )) : (
                <div className={styles.pipelineEmptyState}>
                  <span>Sem negócios neste estágio.</span>
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

export function SellersSectionContent({ dashboardData, sellerToSlug }) {
  const router = useRouter();
  const [sellerFilter, setSellerFilter] = useState("");
  const filteredSellers = dashboardData.sellers.filter((seller) =>
    seller.name.toLowerCase().includes(sellerFilter.trim().toLowerCase()),
  );

  const parseCurrencyLabel = (label) => {
    const numericValue = Number.parseFloat(
      String(label).replace(/[^\d,]/g, "").replace(/\./g, "").replace(",", "."),
    );
    return Number.isNaN(numericValue) ? 0 : numericValue;
  };

  const formatCurrency = (value) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(value);

  const getMotivationStatus = (seller) => {
    if (seller.metaPercent >= 105 && seller.health >= 8) return "Alto";
    if (seller.metaPercent >= 90 && seller.health >= 6) return "Medio";
    return "Baixo";
  };

  return (
    <section className={styles.dashboardSection}>
      <header className={styles.sellerPageHeader}>
        <div className={styles.settingsHeader}>
          <h1>Vendedores</h1>
        </div>
        <label className={styles.sellerFilterBox}>
          <span>Filtrar por nome</span>
          <input
            type="text"
            value={sellerFilter}
            onChange={(event) => setSellerFilter(event.target.value)}
            placeholder="Buscar vendedor"
          />
        </label>
      </header>

      <div className={styles.sellerProfilesGrid}>
        {filteredSellers.map((seller) => {
          const sellerDeals = dashboardData.deals.filter((deal) => deal.owner === seller.name);
          const totalPipeline = sellerDeals.reduce((sum, deal) => sum + parseCurrencyLabel(deal.amountLabel), 0);
          const pendingTasks = sellerDeals.filter((deal) => Number.parseInt(deal.staleLabel, 10) >= 3).length;
          const motivationStatus = getMotivationStatus(seller);

          return (
            <button
              key={seller.name}
              type="button"
              className={styles.sellerProfileContainer}
              onClick={() => router.push(`/vendedores/${sellerToSlug(seller.name)}`)}
            >
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

export function SellerProfileSectionContent({ dashboardData, sellerSlug, sellerToSlug }) {
  const router = useRouter();
  const [selectedStage, setSelectedStage] = useState("");
  const seller = dashboardData.sellers.find((item) => sellerToSlug(item.name) === sellerSlug) || dashboardData.sellers[0];
  const sellerDeals = dashboardData.deals.filter((deal) => deal.owner === seller.name);
  const conversionRate = seller.openDeals + seller.wonDeals > 0
    ? Math.round((seller.wonDeals / (seller.openDeals + seller.wonDeals)) * 100)
    : 0;

  const totalPipelineValue = sellerDeals.reduce((sum, deal) => {
    const numericValue = Number.parseFloat(
      String(deal.amountLabel).replace(/[^\d,]/g, "").replace(/\./g, "").replace(",", "."),
    );
    return Number.isNaN(numericValue) ? sum : sum + numericValue;
  }, 0);

  const pendingTasks = sellerDeals.filter((deal) => Number.parseInt(deal.staleLabel, 10) >= 3).length;
  const motivationStatus = seller.metaPercent >= 105 && seller.health >= 8
    ? "Alto"
    : seller.metaPercent >= 90 && seller.health >= 6
      ? "Medio"
      : "Baixo";

  const activityKpis = [
    ["Chamadas", `${seller.openDeals * 7}`],
    ["Emails", `${seller.openDeals * 12}`],
    ["Reunioes", `${Math.max(2, seller.wonDeals * 2)}`],
  ];

  const kanbanColumns = [
    { title: "Discovery", count: sellerDeals.filter((deal) => deal.stage.toLowerCase().includes("discovery")).length },
    { title: "Proposal", count: sellerDeals.filter((deal) => deal.stage.toLowerCase().includes("proposal")).length },
    { title: "Negotiation", count: sellerDeals.filter((deal) => deal.stage.toLowerCase().includes("negotiation")).length },
    { title: "Commit", count: sellerDeals.filter((deal) => deal.stage.toLowerCase().includes("commit")).length },
  ];

  const maxKanbanCount = Math.max(1, ...kanbanColumns.map((column) => column.count));
  const stageMatches = (dealStage, stageTitle) => dealStage.toLowerCase().includes(stageTitle.toLowerCase());
  const stageDeals = selectedStage
    ? sellerDeals.filter((deal) => stageMatches(deal.stage, selectedStage))
    : [];

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
            <button
              type="button"
              className={styles.primaryActionButton}
              onClick={() => router.push(`/vendedores/${sellerSlug}/reunioes`)}
            >
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
            <Metric
              title="Valor total na pipeline"
              value={new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
                maximumFractionDigits: 0,
              }).format(totalPipelineValue)}
            />
            <Metric title="Tarefas a fazer" value={`${pendingTasks}`} />
            <Metric title="Status motivacao" value={motivationStatus} />
          </div>
          <div className={styles.pipelineStageChart}>
            {kanbanColumns.map((column) => (
              <button
                key={column.title}
                type="button"
                className={styles.pipelineStageBarCard}
                onClick={() => setSelectedStage(column.title)}
              >
                <div className={styles.pipelineStageBarWrap}>
                  <div
                    className={styles.pipelineStageBar}
                    style={{ height: `${Math.max(16, (column.count / maxKanbanCount) * 100)}%` }}
                  />
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
        <div
          className={styles.stageModalBackdrop}
          role="presentation"
          onClick={() => setSelectedStage("")}
        >
          <div
            className={styles.stageModal}
            role="dialog"
            aria-modal="true"
            aria-label={`Negocios em ${selectedStage}`}
            onClick={(event) => event.stopPropagation()}
          >
            <header className={styles.stageModalHeader}>
              <div>
                <span>ETAPA</span>
                <h3>{selectedStage}</h3>
                <p>{seller.name} · {stageDeals.length} negocio(s)</p>
              </div>
              <button
                type="button"
                className={styles.secondaryActionButton}
                onClick={() => setSelectedStage("")}
              >
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
