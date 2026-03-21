"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { SettingsContent } from "../../dashboard-sections";
import { useGlobalState } from "../global-state-provider";
import { useDashboardData } from "../../hooks/useDashboardData";
import styles from "./configuracoes.module.css";
import { configSections } from "../../dashboard-shell-config";
import { PageTitle, getConfigIcon } from "../../dashboard-ui";
import { PageAgentToggleButton } from "../../page-agent-panel";

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const {
    sessionUser,
    personalization,
    updatePersonalization,
    profilePhoto,
    handlePhotoChange,
    handleTwoFactorStatusChange,
  } = useGlobalState();

  const { dashboardData, hubspotMessage } = useDashboardData({ scope: "settings" });
  const [pageAgentOpen, setPageAgentOpen] = useState(false);

  const sectionFromUrl = searchParams.get("section") ?? "";
  const [activeConfig, setActiveConfig] = useState<string>(
    sectionFromUrl && configSections.some((s) => s.id === sectionFromUrl) ? sectionFromUrl : "hubspot",
  );

  const resolvedActiveConfig = sectionFromUrl && configSections.some((s) => s.id === sectionFromUrl)
    ? sectionFromUrl
    : activeConfig;

  const visibleConfigSections = configSections.filter(
    (item) => item.id !== "admin" || sessionUser.isSuperAdmin,
  );

  const currentSection = configSections.find((s) => s.id === resolvedActiveConfig) ?? visibleConfigSections[0] ?? null;

  return (
    <section className={styles.settingsLayout}>
      <aside className={styles.settingsSidebar}>
        <div className={styles.settingsSidebarTitle}>CONFIGURAÇÕES</div>
        <div className={styles.settingsSidebarList}>
          {visibleConfigSections.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveConfig(item.id)}
              className={`${styles.settingsSidebarItem} ${resolvedActiveConfig === item.id ? styles.settingsSidebarItemActive : ""}`.trim()}
            >
              <span className={styles.settingsSidebarIcon}>{getConfigIcon(item.id)}</span>
              <span className={styles.settingsSidebarLabel}>{item.label}</span>
            </button>
          ))}
        </div>
      </aside>
      <div className={styles.settingsContent}>
        <header className={styles.sectionHeaderBar}>
          <div className={styles.settingsHeader}>
            <PageTitle loading={dashboardData.states?.loading === "loading"} loadingLabel="Carregando integracao">
              {currentSection?.label ?? "Configurações"}
            </PageTitle>
            <p>{currentSection?.description}</p>
          </div>
          <PageAgentToggleButton
            agentId={resolvedActiveConfig}
            open={pageAgentOpen}
            onToggle={() => setPageAgentOpen((value) => !value)}
          />
        </header>
        {!dashboardData.configured && resolvedActiveConfig === "hubspot" && dashboardData.states?.loading !== "loading" ? (
          <div className={styles.integrationNotice}>{hubspotMessage}</div>
        ) : null}
        <SettingsContent
          section={resolvedActiveConfig}
          personalization={personalization}
          updatePersonalization={updatePersonalization}
          profilePhoto={profilePhoto}
          onPhotoChange={handlePhotoChange}
          dashboardData={dashboardData}
          sessionUser={sessionUser}
          onTwoFactorStatusChange={handleTwoFactorStatusChange}
          showAgentPanel={pageAgentOpen}
        />
      </div>
    </section>
  );
}
