"use client";

import { usePathname } from "next/navigation";
import {
  BellIcon,
  getNavIcon,
  LogoutIcon,
  MenuIcon,
  PanelsIcon,
  SearchIcon,
  SimpleArrow,
  SparkIcon,
} from "../dashboard-ui";
import { navItems, topMenuItems } from "../dashboard-shell-config";
import styles from "./layout.module.css";
import { GlobalStateProvider, useGlobalState } from "./global-state-provider";

/** Maps nav item id → its route prefix for active detection */
const NAV_ROUTE_MAP: Record<string, string> = {
  reports: "/relatorios",
  sellers: "/vendedores",
  presales: "/pre-vendedores",
  deals: "/negocios",
  campaigns: "/campanhas",
  tasks: "/tarefas",
  access: "/permissoes-e-acessos",
  settings: "/configuracoes",
};

function isNavItemActive(id: string, pathname: string): boolean {
  const route = NAV_ROUTE_MAP[id];
  if (!route) return false;
  return pathname === route || pathname.startsWith(`${route}/`);
}

function isProfileActive(pathname: string): boolean {
  return pathname === "/perfil" || pathname.startsWith("/perfil/");
}

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const {
    menuRef,
    profilePhoto,
    collapsed,
    menuOpen,
    logoutPromptOpen,
    notificationsOpen,
    notificationTab,
    globalSearchOpen,
    globalSearchQuery,
    sessionUser,
    visibleNotifications,
    unreadNotificationsCount,
    browserNotificationPermission,
    browserNotificationSupported,
    globalSearchResults,
    globalSearchHint,
    setCollapsed,
    setMenuOpen,
    setLogoutPromptOpen,
    setNotificationsOpen,
    setNotificationTab,
    setGlobalSearchOpen,
    setGlobalSearchQuery,
    navigateToMainSection,
    navigateToPath,
    requestBrowserNotificationPermission,
    openGlobalSearchResult,
    handleLogout,
    openNotificationAction,
  } = useGlobalState();

  const notificationBadge = unreadNotificationsCount > 99 ? "99+" : String(unreadNotificationsCount);
  const activeInDeals = isNavItemActive("deals", pathname);
  const contentClassName = `${styles.content} ${activeInDeals ? styles.contentNoScroll : ""}`.trim();

  return (
    <main className={`${styles.appShell} ${collapsed ? styles.appShellCollapsed : ""}`.trim()}>
      <header className={styles.topbar}>
        <div className={styles.topbarGroup}>
          <div className={styles.menuWrap} ref={menuRef}>
            <button
              type="button"
              className={`${styles.topbarButton} ${menuOpen ? styles.topbarButtonActive : ""}`.trim()}
              onClick={() => setMenuOpen((value) => !value)}
              aria-expanded={menuOpen}
              aria-label="Menu"
            >
              <MenuIcon />
            </button>
            {menuOpen ? (
              <div className={styles.dropdownMenu} role="menu">
                {topMenuItems.map((item) => (
                  <button key={item} type="button" className={styles.dropdownItem} role="menuitem" onClick={() => setMenuOpen(false)}>
                    <span>{item}</span>
                    <kbd className={styles.shortcutHint}>{item.charAt(0)}</kbd>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <button type="button" className={styles.topbarButton} aria-label="Recolher barra lateral" onClick={() => setCollapsed((value) => !value)}>
            <PanelsIcon />
          </button>
          <button type="button" className={styles.topbarButton} aria-label="Voltar" onClick={() => window.history.back()}>
            <SimpleArrow />
          </button>
          <button type="button" className={styles.topbarButton} aria-label="Avançar" onClick={() => window.history.forward()}>
            <SimpleArrow right />
          </button>
        </div>
        <div className={styles.topbarActions}>
          <button
            type="button"
            className={`${styles.topbarButton} ${styles.notificationButton} ${notificationsOpen ? styles.topbarButtonActive : ""}`.trim()}
            aria-label="Notificações"
            title="Notificações"
            onClick={() => setNotificationsOpen(true)}
          >
            <BellIcon />
            <span className={styles.notificationBadge} aria-hidden="true">{notificationBadge}</span>
          </button>
          <button
            type="button"
            className={styles.topbarButton}
            aria-label="Pesquisa geral com IA"
            title="Pesquisa geral com IA"
            onClick={() => setGlobalSearchOpen(true)}
          >
            <SearchIcon />
          </button>
          <button type="button" className={styles.aiButton} onClick={() => navigateToPath("/ai-agent")} title="NORA para análise completa de todo o sistema respeitando perfil e acesso">
            <SparkIcon />
            <span>NORA</span>
          </button>
          <button type="button" className={styles.logoutButton} onClick={() => setLogoutPromptOpen(true)}>
            <LogoutIcon />
            <span>Sair</span>
          </button>
        </div>
      </header>

      <aside className={styles.sidebar}>
        <div>
          <button type="button" className={styles.logoRow} onClick={() => navigateToPath("/")}>
            <span className={styles.logoDark}>SALES</span>
            <span className={styles.logoAccent}>OPS</span>
          </button>
          <nav className={styles.navigation} aria-label="Principal">
            {navItems
              .filter((item) => item.id !== "settings")
              .filter((item) => item.id !== "access" || sessionUser.isSuperAdmin)
              .map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigateToMainSection(item.id)}
                  className={`${styles.navItem} ${isNavItemActive(item.id, pathname) ? styles.navItemActive : ""}`.trim()}
                  title={collapsed ? item.label : undefined}
                >
                  <span className={styles.navIcon}>{getNavIcon(item.id)}</span>
                  <span className={styles.navLabel}>{item.label}</span>
                </button>
              ))}
          </nav>
        </div>
        <div>
          <button
            type="button"
            onClick={() => navigateToMainSection("settings")}
            className={`${styles.navItem} ${styles.settingsItem} ${isNavItemActive("settings", pathname) ? styles.navItemActive : ""}`.trim()}
            title={collapsed ? "Configurações" : undefined}
          >
            <span className={styles.navIcon}>{getNavIcon("settings")}</span>
            <span className={styles.navLabel}>Configurações</span>
          </button>
          <button
            type="button"
            className={`${styles.profileBox} ${isProfileActive(pathname) ? styles.profileBoxActive : ""}`.trim()}
            onClick={() => navigateToMainSection("profile")}
          >
            <div
              className={styles.profileAvatar}
              style={profilePhoto ? { backgroundImage: `url(${profilePhoto})` } : undefined}
            >
              {profilePhoto ? null : "?"}
            </div>
            <div className={styles.profileText}>
              <div className={styles.profileName}>{sessionUser.name}</div>
              <div className={styles.profileRole}>{sessionUser.role}</div>
            </div>
          </button>
        </div>
      </aside>

      <section className={contentClassName}>
        {children}
      </section>

      {logoutPromptOpen ? (
        <div className={styles.logoutModalBackdrop} role="presentation" onClick={() => setLogoutPromptOpen(false)}>
          <div className={styles.logoutModal} role="dialog" aria-modal="true" aria-labelledby="logout-title" onClick={(event) => event.stopPropagation()}>
            <span className={styles.logoutEyebrow}>ENCERRAR SESSAO</span>
            <h2 id="logout-title">Deseja sair mesmo?</h2>
            <p>Ao continuar, você será redirecionado para a tela de login do SalesOps.</p>
            <div className={styles.logoutActions}>
              <button type="button" className={styles.logoutSecondaryButton} onClick={() => setLogoutPromptOpen(false)}>Cancelar</button>
              <button type="button" className={styles.logoutPrimaryButton} onClick={handleLogout}>Sair agora</button>
            </div>
          </div>
        </div>
      ) : null}

      {notificationsOpen ? (
        <div className={styles.notificationsBackdrop} role="presentation" onClick={() => setNotificationsOpen(false)}>
          <aside
            className={styles.notificationsPanel}
            role="dialog"
            aria-modal="true"
            aria-label="Notificações"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.notificationsTopBar}>
              <h2>Notificações</h2>
              <button type="button" className={styles.notificationsClose} onClick={() => setNotificationsOpen(false)} aria-label="Fechar notificações">
                &times;
              </button>
            </div>

            <div className={styles.notificationsTabs}>
              <button type="button" className={`${styles.notificationsTab} ${notificationTab === "unread" ? styles.notificationsTabActive : ""}`.trim()} onClick={() => setNotificationTab("unread")}>
                Não lidas ({unreadNotificationsCount})
              </button>
              <button type="button" className={`${styles.notificationsTab} ${notificationTab === "all" ? styles.notificationsTabActive : ""}`.trim()} onClick={() => setNotificationTab("all")}>
                Todos
              </button>
            </div>

            {browserNotificationSupported ? (
              <div className={styles.notificationsPermissionCard}>
                <div className={styles.notificationsPermissionCopy}>
                  <strong>Notificacoes no computador</strong>
                  <p>
                    {browserNotificationPermission === "granted"
                      ? "Ativas no navegador. Novos alertas do SalesOps tambem aparecem no Windows e no Chrome."
                      : browserNotificationPermission === "denied"
                        ? "A permissao foi bloqueada no navegador. Libere o SalesOps nas configuracoes do Chrome para receber alertas no computador."
                        : "Ative para receber alertas do SalesOps tambem como notificacao no navegador do seu computador."}
                  </p>
                </div>
                {browserNotificationPermission === "default" ? (
                  <button type="button" className={styles.notificationsPermissionButton} onClick={requestBrowserNotificationPermission}>
                    Permitir
                  </button>
                ) : (
                  <span className={`${styles.notificationsPermissionBadge} ${browserNotificationPermission === "granted" ? styles.notificationsPermissionBadgeActive : ""}`.trim()}>
                    {browserNotificationPermission === "granted" ? "Ativas" : "Bloqueadas"}
                  </span>
                )}
              </div>
            ) : null}

            <div className={styles.notificationsList}>
              {visibleNotifications.length ? visibleNotifications.map((item: { id: string; title: string; body?: string; tag?: string; route?: string; label?: string; age?: string; read?: boolean }) => (
                <button
                  key={item.id}
                  type="button"
                  className={`${styles.notificationRow} ${item.route ? styles.notificationRowButton : ""}`.trim()}
                  onClick={() => openNotificationAction(item)}
                  disabled={!item.route}
                  title={item.label ?? undefined}
                >
                  <div className={styles.notificationContent}>
                    <strong>{item.title}</strong>
                    {item.body ? <span className={styles.notificationBody}>{item.body}</span> : null}
                    {item.tag ? <span className={styles.notificationTag}>{item.tag}</span> : null}
                  </div>
                  <div className={styles.notificationSide}>
                    <small>{item.age}</small>
                    {item.route ? <span className={styles.notificationArrow}>Abrir</span> : null}
                  </div>
                </button>
              )) : (
                <div className={styles.notificationsEmptyState}>
                  <strong>Nenhuma notificação real por aqui.</strong>
                  <p>Quando houver uma ação pendente de verdade, ela vai aparecer nesta central.</p>
                </div>
              )}
            </div>
          </aside>
        </div>
      ) : null}

      {globalSearchOpen ? (
        <div className={styles.globalSearchBackdrop} role="presentation" onClick={() => setGlobalSearchOpen(false)}>
          <section
            className={styles.globalSearchPanel}
            role="dialog"
            aria-modal="true"
            aria-label="Pesquisa geral do sistema"
            onClick={(event) => event.stopPropagation()}
          >
            <header className={styles.globalSearchHeader}>
              <div>
                <h2>Pesquisa geral</h2>
                <p>Busque no sistema e use sugestões de IA para chegar mais rápido.</p>
              </div>
              <button type="button" className={styles.globalSearchClose} onClick={() => setGlobalSearchOpen(false)}>
                Fechar
              </button>
            </header>

            <input
              type="text"
              autoFocus
              className={styles.globalSearchInput}
              value={globalSearchQuery}
              onChange={(event) => setGlobalSearchQuery(event.target.value)}
              placeholder="Ex.: pipeline parado, vendedor com risco, métricas do mês..."
            />

            <div className={styles.globalSearchAiHint}>
              <span>IA</span>
              <p>{globalSearchHint}</p>
            </div>

            <div className={styles.globalSearchResults}>
              {globalSearchResults.length ? globalSearchResults.map((item: { id: string; label: string; description: string; route?: string }) => (
                <button key={item.id} type="button" className={styles.globalSearchResultItem} onClick={() => openGlobalSearchResult(item)}>
                  <strong>{item.label}</strong>
                  <span>{item.description}</span>
                </button>
              )) : (
                <p className={styles.globalSearchEmpty}>Sem resultado direto para esse termo.</p>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <GlobalStateProvider>
      <DashboardLayoutInner>
        {children}
      </DashboardLayoutInner>
    </GlobalStateProvider>
  );
}
