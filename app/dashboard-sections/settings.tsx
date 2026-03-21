// @ts-nocheck
"use client";

import {
  Card,
  Metric,
  OptionGroup,
  PhotoOption,
  PreferenceTable,
  Row,
  Table,
} from "../dashboard-ui";
import PageAgentPanel from "../page-agent-panel";
import {
  SectionEmptyState,
  SectionNotice,
} from "../dashboard-section-feedback";
import {
  densityOptions,
  fontOptions,
  fontSizeOptions,
  mappingRows,
  maskingRows,
  queueRows,
  reportRows,
  themeOptions,
} from "../dashboard-shell-config";
import styles from "./settings.module.css";
import TwoFactorSettings from "../two-factor-settings";
import { personalizationToggles } from "lib/dashboard-shell-helpers";

export function SettingsContent({
  section,
  personalization,
  updatePersonalization,
  profilePhoto,
  onPhotoChange,
  dashboardData,
  sessionUser,
  onTwoFactorStatusChange,
  showAgentPanel = false,
}) {
  const profileEmail = dashboardData.integration?.profileEmail || "";
  const profileRole = dashboardData.integration?.profileRole || "";
  const profileHelper = profileEmail || "Email vindo da HubSpot aparecera aqui";
  const userRole = profileRole || sessionUser?.role || "Cargo aguardando sincronizacao";
  const twoFactorValue = sessionUser?.twoFactorEnabled ? "Ativo no autenticador" : "Nao configurado";
  const twoFactorHelper = sessionUser?.twoFactorEnabled
    ? (
      sessionUser?.twoFactorLevel === "aal2"
        ? "Sessao atual validada com segundo fator"
        : "Sera solicitado um codigo do autenticador no proximo login"
    )
    : "Ative com Google Authenticator, Microsoft Authenticator ou app equivalente";
  const sectionAgentId = section === "account" ? "profile" : "settings";
  const sectionAgentPanel = (
    <PageAgentPanel
      agentId={sectionAgentId}
      dashboardData={dashboardData}
      context={{ section, sessionUser }}
    />
  );
  const syncLogs = Array.isArray(dashboardData.syncLogs) ? dashboardData.syncLogs : [];
  const auditLogs = Array.isArray(dashboardData.auditLogs) ? dashboardData.auditLogs : [];
  const notifications = Array.isArray(dashboardData.notifications) ? dashboardData.notifications : [];
  const unreadNotifications = notifications.filter((item) => !item.read && !item.trash);
  const hubspotLogRows = syncLogs.length
    ? syncLogs.slice(0, 6).map((item) => [item.when, item.message, item.severity])
    : (dashboardData.configured ? [["Agora", "Sincronizacao via API operando", "info"]] : [["Sem registro", "Nenhum log operacional ainda.", "info"]]);
  const auditLogRows = auditLogs.length
    ? auditLogs.slice(0, 8).map((item) => [item.actor, item.action, item.when])
    : [["Sistema", "Sem eventos recentes para este perfil", "Agora"]];
  const notificationMetrics = [
    ["Nao lidas", `${unreadNotifications.length}`, "Pendencias reais na central"],
    ["Total", `${notifications.length}`, "Itens disponiveis para o usuario"],
    ["Origem", sessionUser?.isSuperAdmin ? "Admin" : "Workspace", "Escopo atual de alertas"],
  ];

  if (section === "account") {
    return (
      <div className={styles.grid}>
        {showAgentPanel ? sectionAgentPanel : null}

        <Card eyebrow="PERFIL">
          <PhotoOption profilePhoto={profilePhoto} onPhotoChange={onPhotoChange} />
          <Row label="Nome" value={sessionUser?.name || "Usuario SalesOps"} helper={profileHelper} />
          <Row label="Cargo do usuario" value={userRole} />
          <Row label="Senha" value="Ultima troca ha 14 dias" />
          <Row label="2FA" value={twoFactorValue} helper={twoFactorHelper} />
          <Row label="Sessoes ativas" value="5 dispositivos" helper="2 navegadores e 3 mobile" />
        </Card>
        <Card eyebrow="SEGURANCA" title="Autenticacao em dois fatores">
          <TwoFactorSettings sessionUser={sessionUser} onStatusChange={onTwoFactorStatusChange} />
        </Card>
      </div>
    );
  }

  if (section === "hubspot") {
    return (
      <div className={styles.grid}>
        {showAgentPanel ? sectionAgentPanel : null}

        <Card eyebrow="STATUS" title="Integracao HubSpot">
          <Row
            label="Conexao"
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
          <Table head={["Hora", "Erro", "Gravidade"]} rows={hubspotLogRows} />
        </Card>
      </div>
    );
  }

  if (section === "notifications") {
    return (
      <div className={styles.grid}>
        {showAgentPanel ? sectionAgentPanel : null}

        <Card eyebrow="CANAIS" title="Notificacoes & Alertas">
          <Row label="Email do usuario" value={sessionUser?.email || "Nao identificado"} helper="Base autenticada do workspace" />
          <Row label="Centro de notificacoes" value={notifications.length ? "Ativo" : "Sem itens"} helper={`${unreadNotifications.length} nao lidas neste momento`} />
          <Row label="Escopo" value={sessionUser?.isSuperAdmin ? "Admin" : "Operacional"} helper={sessionUser?.isSuperAdmin ? "Inclui fila de aprovacoes" : "Mostra alertas ligados ao perfil"} />
        </Card>
        <Card eyebrow="THRESHOLDS" title="Metas e thresholds" wide>
          <div className={styles.metrics}>
            {notificationMetrics.map((item) => <Metric key={item[0]} title={item[0]} value={item[1]} note={item[2]} />)}
          </div>
        </Card>
        <Card eyebrow="ATUAL" title="Ultimos alertas" wide>
          {notifications.length ? (
            <Table
              head={["Titulo", "Tag", "Quando"]}
              rows={notifications.slice(0, 6).map((item) => [
                item.title,
                item.tag || "Sem tag",
                item.createdAt ? new Date(item.createdAt).toLocaleString("pt-BR") : "Agora",
              ])}
            />
          ) : (
            <SectionEmptyState
              title="Sem alertas reais neste momento"
              description="Assim que algo operacional exigir sua atencao, a central de notificacoes vai refletir aqui."
            />
          )}
        </Card>
      </div>
    );
  }

  if (section === "ai") {
    return (
      <div className={styles.grid}>
        {showAgentPanel ? sectionAgentPanel : null}

        <Card eyebrow="MODELO" title="IA & Diagnosticos">
          <Row label="Modelo ativo" value="GPT SalesOps Analyst" />
          <Row label="Assistente de voz" value="Habilitado" />
          <Row label="Sensibilidade" value="Moderada" helper="menos ruido, mais sinais de risco" />
        </Card>
        <Card eyebrow="DADOS" title="Dados que alimentam a IA" wide>
          <div className={styles.tags}>
            <span>Negocios</span>
            <span>Atividades</span>
            <span>Calls gravadas</span>
            <span>Sentimento do vendedor</span>
            <span>Proximas tarefas</span>
          </div>
        </Card>
      </div>
    );
  }

  if (section === "personalize") {
    return (
      <div className={styles.grid}>
        {showAgentPanel ? sectionAgentPanel : null}

        <Card eyebrow="APARENCIA" title="Tema e tipografia">
          <OptionGroup title="Tema" options={themeOptions} value={personalization.theme} onChange={(value) => updatePersonalization("theme", value)} />
          <OptionGroup title="Fonte principal" options={fontOptions} value={personalization.font} onChange={(value) => updatePersonalization("font", value)} />
          <OptionGroup title="Tamanho das letras" options={fontSizeOptions} value={personalization.fontSize} onChange={(value) => updatePersonalization("fontSize", value)} />
        </Card>
        <Card eyebrow="INTERFACE" title="Densidade e leitura">
          <OptionGroup title="Densidade" options={densityOptions} value={personalization.density} onChange={(value) => updatePersonalization("density", value)} />
          <PreferenceTable rows={personalizationToggles} values={personalization} onToggle={(id) => updatePersonalization(id, !personalization[id])} />
        </Card>
        <Card eyebrow="VISUAL" title="Previa das personalizacoes" wide>
          <div className={styles.previewPanel}>
            <div className={styles.previewCard}>
              <span>Cards</span>
              <strong>{personalization.reinforcedCards ? "Borda reforcada" : "Borda padrao"}</strong>
              <small>{personalization.reinforcedCards ? "Superficies com mais destaque visual." : "Superficies leves e discretas."}</small>
            </div>
            <div className={styles.previewCard}>
              <span>Texto</span>
              <strong>{personalization.fontSize}</strong>
              <small>{personalization.font} com escala {personalization.fontSize.toLowerCase()}.</small>
            </div>
            <div className={styles.previewCard}>
              <span>Navegacao</span>
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
        {showAgentPanel ? sectionAgentPanel : null}

        <Card eyebrow="AGENDAMENTO" title="Relatorios & Exportacao">
          <Row label="Envio semanal" value="Segunda, 07:30" />
          <Row label="Formato" value="PDF + XLSX" />
          <Row label="Marca d'agua" value="Confidencial" />
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
        {showAgentPanel ? sectionAgentPanel : null}

        <Card eyebrow="USO" title="Gestao de Midia & Storage">
          <div className={styles.usage}>
            <div className={styles.usageTop}>
              <strong>38.4 / 100 GB</strong>
              <span>38%</span>
            </div>
            <div className={styles.usageBar}><span style={{ width: "38.4%" }} /></div>
            <p>Gravacoes semanais, audios e anexos operacionais.</p>
          </div>
          <Row label="Hot storage" value="45 dias" />
          <Row label="Cold storage" value="365 dias" helper="arquivamento automatico" />
        </Card>
        <Card eyebrow="STT" title="Fila de transcricao em tempo real" wide>
          <Table head={["Arquivo", "Status", "Progresso"]} rows={queueRows} />
        </Card>
        <Card eyebrow="PROVEDOR" title="Indexacao e provedor">
          <Row label="Provedor" value="Azure Blob Storage" />
          <Row label="Regiao" value="Brazil South" helper="aderencia LGPD" />
          <Row label="Indexacao IA" value="Ativa" />
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.grid}>
      {showAgentPanel ? sectionAgentPanel : null}

      <Card eyebrow="AUDITORIA" title="Eventos recentes" wide>
        <Table head={["Quem", "O que", "Quando"]} rows={auditLogRows} />
      </Card>
      <Card eyebrow="MASKING" title="Matriz visual por campo e cargo">
        <Table head={["Campo", "Admin", "Gestor", "Vendedor"]} rows={maskingRows} matrix />
      </Card>
      <Card eyebrow="LGPD" title="Consentimento e conformidade">
        <Row label="Consentimento" value="Registrado por contato" />
        <Row label="Esquecimento" value="Fluxo habilitado" helper="remocao em ate 7 dias" />
        <Row label="Relatorio" value="Atualizado hoje" />
        {!auditLogs.length ? <SectionNotice variant="info">Os eventos de auditoria aparecerao aqui assim que o workspace registrar novas acoes administrativas.</SectionNotice> : null}
      </Card>
    </div>
  );
}
