"use client";

import { useState } from "react";
import { SettingsContent } from "../../dashboard-sections";
import { useGlobalState } from "../global-state-provider";
import { useDashboardData } from "../../hooks/useDashboardData";
import styles from "./perfil.module.css";
import { PageTitle } from "../../dashboard-ui";
import { PageAgentToggleButton } from "../../page-agent-panel";
import { accountSection } from "../../dashboard-shell-config";

export default function ProfilePage() {
  const {
    sessionUser,
    personalization,
    updatePersonalization,
    profilePhoto,
    handlePhotoChange,
    handleTwoFactorStatusChange,
  } = useGlobalState();
  const { dashboardData } = useDashboardData({ scope: "none" });
  const [pageAgentOpen, setPageAgentOpen] = useState(false);

  return (
    <section className={styles.profileLayout}>
      <div className={`${styles.settingsContent} ${styles.settingsContentFull}`.trim()}>
        <header className={styles.sectionHeaderBar}>
          <div className={styles.settingsHeader}>
            <PageTitle>
              {accountSection.label}
            </PageTitle>
            <p>{accountSection.description}</p>
          </div>
          <PageAgentToggleButton
            agentId="account"
            open={pageAgentOpen}
            onToggle={() => setPageAgentOpen((value) => !value)}
          />
        </header>
        <div className={styles.profileStandalone}>
          <SettingsContent
            section="account"
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
      </div>
    </section>
  );
}
