// @ts-nocheck
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./ai-agent.module.css";
import {
  navItems as dashboardNavItems,
  topMenuItems,
} from "../../dashboard-shell-config";
import { buildNoraResponse } from "lib/ai-agent-orchestration";
import {
  getNotificationAction,
  getNotificationDisplayTitle,
  getVisibleNotifications,
} from "lib/dashboard-shell-helpers";

const navItems = [
  { id: "reports", label: "Relatórios" },
  { id: "sellers", label: "Vendedores" },
  { id: "deals", label: "Negócios" },
  { id: "tasks", label: "Tarefas" },
];

const suggestedPrompts = [
  "Quais negócios estão com maior risco de estagnação?",
  "Resuma as falhas recentes na integração com HubSpot.",
  "Mostre alertas que exigem ação do gestor hoje.",
  "Quais vendedores precisam de coaching imediato?",
];

const historyItems = [
  "Quais indicadores saíram da meta esta semana?",
  "Resuma os gargalos do pipeline por squad.",
  "Existe risco de perda em contas enterprise?",
];

const initialMessages = [];

function MenuIcon() {
  return <div className={styles.hamburger} aria-hidden="true"><span /><span /><span /></div>;
}

function PanelsIcon() {
  return <span className={styles.panelsIcon} aria-hidden="true" />;
}

function SimpleArrow({ right = false }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={right ? "M9.5 6.5L15 12l-5.5 5.5" : "M14.5 6.5L9 12l5.5 5.5"} />
    </svg>
  );
}

function ChevronSmallIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14 7V5.8A1.8 1.8 0 0 0 12.2 4H6.8A1.8 1.8 0 0 0 5 5.8v12.4A1.8 1.8 0 0 0 6.8 20h5.4a1.8 1.8 0 0 0 1.8-1.8V17" />
      <path d="M10 12h9" />
      <path d="M16 8l4 4-4 4" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3l1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7z" />
      <path d="M18.5 3.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" />
      <path d="M5.5 15.5l.9 2.2 2.2.9-2.2.9-.9 2.2-.9-2.2-2.2-.9 2.2-.9z" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 10a5 5 0 1 1 10 0c0 4.5 2 6 2 6H5s2-1.5 2-6" />
      <path d="M10 18a2 2 0 0 0 4 0" />
    </svg>
  );
}

function PaperclipIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8.5 12.5l6.4-6.4a3 3 0 1 1 4.2 4.2l-8.5 8.5a5 5 0 0 1-7.1-7.1l8.5-8.5" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="9" y="4" width="6" height="10" rx="3" />
      <path d="M6.5 11.5a5.5 5.5 0 0 0 11 0" />
      <path d="M12 17v3" />
      <path d="M9 20h6" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M21 3L10 14" />
      <path d="M21 3l-7 18-4-7-7-4z" />
    </svg>
  );
}

function BaseIcon({ children }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true">{children}</svg>;
}

function getNavIcon(id) {
  if (id === "reports") return <BaseIcon><path d="M6 18V11" /><path d="M11 18V7" /><path d="M16 18V13" /></BaseIcon>;
  if (id === "sellers") return <BaseIcon><circle cx="9" cy="8" r="3" /><path d="M4 17c0-2.4 2.2-4.3 5-4.3s5 1.9 5 4.3" /><circle cx="17" cy="9" r="2.3" /><path d="M14.6 16.2c.6-1.5 2-2.5 3.7-2.5.8 0 1.5.2 2.1.5" /></BaseIcon>;
  if (id === "deals") return <BaseIcon><rect x="4" y="6" width="16" height="12" rx="1.5" /><path d="M12 6v12" /><path d="M4 10h16" /></BaseIcon>;
  if (id === "tasks") return <BaseIcon><rect x="5" y="4.5" width="14" height="15" rx="2" /><path d="M8 9h7" /><path d="M8 13h4" /><path d="M8 17h5" /><path d="M15.5 13.5l1.3 1.3 2.7-3" /></BaseIcon>;
  return <BaseIcon><path d="M12 8.6A3.4 3.4 0 1 0 12 15.4A3.4 3.4 0 1 0 12 8.6z" /><path d="M19 12a7.2 7.2 0 0 0-.1-1l1.9-1.4-1.8-3.2-2.3 1a7.7 7.7 0 0 0-1.7-1l-.3-2.4H10l-.4 2.4a7.7 7.7 0 0 0-1.7 1l-2.3-1-1.8 3.2L5.7 11a7.2 7.2 0 0 0 0 2l-1.9 1.4 1.8 3.2 2.3-1c.5.4 1.1.7 1.7 1l.4 2.4h4.6l.3-2.4c.6-.2 1.2-.6 1.7-1l2.3 1 1.8-3.2L18.9 13c.1-.3.1-.7.1-1z" /></BaseIcon>;
}

export default function AIAgentPage() {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [inputValue, setInputValue] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [historyCollapsed, setHistoryCollapsed] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationTab, setNotificationTab] = useState("unread");
  const [sessionUser, setSessionUser] = useState({ name: "Usuario", role: "Cargo", isSuperAdmin: false });
  const [dashboardData, setDashboardData] = useState(null);
  const [accessRequests, setAccessRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const menuRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const chatEndRef = useRef(null);
  const notificationBadge = notificationCount > 99 ? "99+" : String(notificationCount);
  const visibleNavItems = (dashboardNavItems.length ? dashboardNavItems : navItems)
    .filter((item) => item.id !== "settings")
    .filter((item) => item.id !== "access" || ["Admin"].includes(String(sessionUser.role || "")) || sessionUser.isSuperAdmin);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    router.replace("/login");
  }

  useEffect(() => {
    function closeOnOutside(event) {
      if (!menuRef.current?.contains(event.target)) setMenuOpen(false);
    }
    function closeOnEscape(event) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadSessionUser() {
      const response = await fetch("/api/auth/session", { cache: "no-store" }).catch(() => null);
      if (!response?.ok || cancelled) return;

      const payload = await response.json().catch(() => null);
      if (!payload?.user || cancelled) return;

      setSessionUser({
        name: payload.user.name || "Usuario",
        role: payload.user.role || "Cargo",
        isSuperAdmin: Boolean(payload.user.isSuperAdmin),
      });
    }

    loadSessionUser();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboardData() {
      const response = await fetch("/api/hubspot/dashboard?scope=ai", { cache: "no-store" }).catch(() => null);
      if (!response || cancelled) return;

      const payload = await response.json().catch(() => null);
      if (!payload || cancelled) return;

      setDashboardData(payload);
    }

    loadDashboardData();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadAccessRequests() {
      if (!sessionUser.isSuperAdmin) {
        setAccessRequests([]);
        return;
      }

      const response = await fetch("/api/admin/access-requests", { cache: "no-store" }).catch(() => null);
      if (!response?.ok || cancelled) return;

      const payload = await response.json().catch(() => null);
      if (!payload || cancelled) return;

      setAccessRequests(Array.isArray(payload.requests) ? payload.requests : []);
    }

    loadAccessRequests();
    return () => {
      cancelled = true;
    };
  }, [sessionUser.isSuperAdmin]);

  useEffect(() => {
    let cancelled = false;

    async function loadNotifications() {
      const response = await fetch("/api/notifications", { cache: "no-store" }).catch(() => null);
      const payload = await response?.json().catch(() => null);
      if (cancelled) return;

      const nextNotifications = Array.isArray(payload?.notifications) ? payload.notifications : [];
      const unreadCount = nextNotifications.filter((item) => !item?.read && !item?.trash).length;
      setNotifications(nextNotifications);
      setNotificationCount(unreadCount);
    }

    loadNotifications();
    return () => {
      cancelled = true;
    };
  }, [sessionUser.isSuperAdmin]);

  const allNotifications = sessionUser.isSuperAdmin
    ? notifications.map((item) => ({
      ...item,
      title: getNotificationDisplayTitle(item),
      age: item?.createdAt ? new Date(item.createdAt).toLocaleDateString("pt-BR") : "",
      ...getNotificationAction(item),
    }))
    : [];
  const visibleNotifications = getVisibleNotifications(allNotifications, notificationTab);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript || "")
        .join(" ");
      setInputValue(transcript.trim());
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: messages.length > 1 ? "smooth" : "auto", block: "end" });
  }, [messages]);

  function submitQuestion(question) {
    const trimmed = question.trim();
    if (!trimmed && attachments.length === 0) return;

    const uploadedItems = attachments.map((file) => ({
      name: file.name,
      type: file.type || "application/octet-stream",
    }));
    const noraResponse = buildNoraResponse(trimmed, dashboardData, {
      requests: accessRequests,
      sessionUser,
    });

    setMessages((current) => [
      ...current,
      { id: current.length + 1, role: "user", text: trimmed || "Anexei arquivos para análise.", attachments: uploadedItems },
      {
        id: current.length + 2,
        role: "assistant",
        text: noraResponse.text,
        consultedAgents: noraResponse.consultedAgents,
      },
    ]);
    setInputValue("");
    setAttachments([]);
  }

  function handleSubmit(event) {
    event.preventDefault();
    submitQuestion(inputValue);
  }

  function handleFilesSelected(event) {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length === 0) return;
    setAttachments((current) => [...current, ...selectedFiles]);
    event.target.value = "";
  }

  function removeAttachment(fileName, indexToRemove) {
    setAttachments((current) => current.filter((file, index) => !(file.name === fileName && index === indexToRemove)));
  }

  function toggleListening() {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    setIsListening(true);
    recognitionRef.current.start();
  }

  function startNewChat() {
    setMessages([]);
    setInputValue("");
    setAttachments([]);
    setIsListening(false);
    recognitionRef.current?.stop?.();
  }

  function openMainView(view) {
    const routeMap = {
      reports: "/relatorios",
      sellers: "/vendedores",
      deals: "/negocios",
      campaigns: "/campanhas",
      tasks: "/tarefas",
      access: "/permissoes-e-acessos",
      settings: "/configuracoes",
      profile: "/perfil",
    };

    router.push(routeMap[view] || "/relatorios");
  }

  function openNotificationAction(item) {
    if (!item?.route) return;
    setNotificationsOpen(false);
    router.push(item.route);
  }

  return (
    <main className={`${styles.appShell} ${collapsed ? styles.appShellCollapsed : ""}`.trim()}>
      <header className={styles.topbar}>
        <div className={styles.topbarGroup}>
          <div className={styles.menuWrap} ref={menuRef}>
            <button type="button" className={`${styles.topbarButton} ${menuOpen ? styles.topbarButtonActive : ""}`.trim()} onClick={() => setMenuOpen((value) => !value)} aria-expanded={menuOpen} aria-label="Menu"><MenuIcon /></button>
            {menuOpen ? <div className={styles.dropdownMenu} role="menu">{topMenuItems.map((item) => <button key={item} type="button" className={styles.dropdownItem} role="menuitem" onClick={() => setMenuOpen(false)}><span>{item}</span><ChevronSmallIcon /></button>)}</div> : null}
          </div>
          <button type="button" className={styles.topbarButton} aria-label="Recolher barra lateral" onClick={() => setCollapsed((value) => !value)}><PanelsIcon /></button>
          <button type="button" className={styles.topbarButton} aria-label="Voltar" onClick={() => window.history.back()}><SimpleArrow /></button>
          <button type="button" className={styles.topbarButton} aria-label="Avançar" onClick={() => window.history.forward()}><SimpleArrow right /></button>
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
          <button type="button" className={`${styles.aiButton} ${styles.aiButtonActive}`.trim()} title="NORA">
            <SparkIcon />
            <span>NORA</span>
          </button>
          <button type="button" className={styles.logoutButton} onClick={handleLogout}>
            <LogoutIcon />
            <span>Sair</span>
          </button>
        </div>
      </header>

      <aside className={styles.sidebar}>
        <div>
          <div className={styles.logoRow}><span className={styles.logoDark}>SALES</span><span className={styles.logoAccent}>OPS</span></div>
          <nav className={styles.navigation} aria-label="Principal">
            {visibleNavItems.map((item) => (
              <button key={item.id} type="button" onClick={() => openMainView(item.id)} className={styles.navItem} title={collapsed ? item.label : undefined}>
                <span className={styles.navIcon}>{getNavIcon(item.id)}</span>
                <span className={styles.navLabel}>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
        <div>
          <button type="button" onClick={() => openMainView("settings")} className={`${styles.navItem} ${styles.settingsItem}`.trim()} title={collapsed ? "Configurações" : undefined}>
            <span className={styles.navIcon}>{getNavIcon("settings")}</span>
            <span className={styles.navLabel}>Configurações</span>
          </button>
          <button type="button" className={styles.profileBox} onClick={() => openMainView("profile")}>
            <div className={styles.profileAvatar}>?</div>
            <div className={styles.profileText}><div className={styles.profileName}>{sessionUser.name}</div><div className={styles.profileRole}>{sessionUser.role}</div></div>
          </button>
        </div>
      </aside>

      <section className={styles.content}>
        <div className={`${styles.agentContent} ${historyCollapsed ? styles.agentContentHistoryCollapsed : ""}`.trim()}>
          <header className={styles.agentHeader}>
            <span className={styles.eyebrow}>NORA</span>
            <h1>NORA analisa todo o sistema</h1>
            <p>Investigue o sistema inteiro com contexto operacional, histórico de perguntas, sugestões rápidas e conversa contínua. A NORA sempre consulta o especialista da página certa antes de responder.</p>
          </header>

          {false ? (
            <section className={styles.agentDirectory}>
            <div className={styles.agentDirectoryHeader}>
              <span className={styles.eyebrow}>REDE DE ESPECIALISTAS</span>
              <h2>NORA conversa com agentes por domínio</h2>
              <p>Quando a pergunta cruza mais de um assunto, a NORA consulta mais de um especialista para montar a resposta final.</p>
            </div>
            <div className={styles.agentDirectoryGrid}>
              {specialistDirectory.map((agent) => (
                <article key={agent.id} className={styles.agentDirectoryCard}>
                  <strong>{agent.name}</strong>
                  <span>{agent.pageLabel}</span>
                  <p>{agent.scope}</p>
                </article>
              ))}
            </div>
            </section>
          ) : null}

          <div className={styles.agentPanels}>
            <aside className={`${styles.historySidebar} ${historyCollapsed ? styles.historySidebarCollapsed : ""}`.trim()} aria-label={"Hist\u00F3rico de perguntas"}>
              <div className={styles.historySidebarToggleRow}>
                <button
                  type="button"
                  className={`${styles.historySidebarToggle} ${historyCollapsed ? styles.historySidebarToggleCollapsed : ""}`.trim()}
                  onClick={() => setHistoryCollapsed((value) => !value)}
                  aria-expanded={!historyCollapsed}
                  aria-label={historyCollapsed ? "Expandir historico" : "Recolher historico"}
                  title={historyCollapsed ? "Expandir historico" : "Recolher historico"}
                >
                  <PanelsIcon />
                </button>
              </div>
              {historyCollapsed ? (
                <div className={styles.historySidebarRail}>
                  <span className={styles.historySidebarRailLabel}>{"Hist\u00F3rico"}</span>
                </div>
              ) : (
                <div className={styles.historySidebarContent}>
                  <div className={styles.historySidebarTitle}>{"HIST\u00D3RICO"}</div>
                  <div className={styles.historySidebarList}>
                    <button type="button" className={`${styles.historySidebarItem} ${styles.historySidebarItemActive}`.trim()} onClick={startNewChat}>
                      Novo chat
                    </button>
                    {historyItems.map((item) => (
                      <button key={item} type="button" className={styles.historySidebarItem} onClick={() => submitQuestion(item)}>
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </aside>

            <section className={styles.chatPanel}>
              <div className={styles.chatWorkspace}>
              {messages.length === 0 ? (
                <div className={styles.promptRow}>
                  {suggestedPrompts.map((prompt) => (
                    <button key={prompt} type="button" className={styles.promptChip} onClick={() => submitQuestion(prompt)}>
                      {prompt}
                    </button>
                  ))}
                </div>
              ) : null}

              <div className={styles.chatStream}>
                {messages.map((message) => (
                  <article
                    key={message.id}
                    className={`${styles.messageBubble} ${message.role === "user" ? styles.messageUser : styles.messageAssistant}`.trim()}
                  >
                    <span className={styles.messageRole}>{message.role === "user" ? "Você" : "NORA"}</span>
                    <p>{message.text}</p>
                    {message.consultedAgents?.length ? (
                      <div className={styles.consultedAgentsRow}>
                        <small>Agentes consultados</small>
                        <div className={styles.consultedAgentsList}>
                          {message.consultedAgents.map((agentName) => (
                            <span key={`${message.id}-${agentName}`} className={styles.consultedAgentChip}>
                              {agentName}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {message.attachments?.length ? (
                      <div className={styles.messageAttachments}>
                        {message.attachments.map((file) => (
                          <span key={`${message.id}-${file.name}`} className={styles.attachmentChip}>
                            {file.name}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </article>
                ))}
                <div ref={chatEndRef} />
              </div>
              </div>

              <form className={styles.chatComposer} onSubmit={handleSubmit}>
                {attachments.length ? (
                  <div className={styles.attachmentTray}>
                    {attachments.map((file, index) => (
                      <button key={`${file.name}-${index}`} type="button" className={styles.attachmentItem} onClick={() => removeAttachment(file.name, index)}>
                        <span>{file.name}</span>
                        <strong>Remover</strong>
                      </button>
                    ))}
                  </div>
                ) : null}

                <div className={styles.composerRow}>
                  <button type="button" className={styles.iconButton} onClick={() => fileInputRef.current?.click()} aria-label="Anexar arquivos" title="Anexar arquivos">
                    <PaperclipIcon />
                  </button>
                  <button type="button" className={`${styles.iconButton} ${isListening ? styles.utilityButtonActive : ""}`.trim()} onClick={toggleListening} disabled={!recognitionRef.current} aria-label="Falar com microfone" title={isListening ? "Ouvindo..." : "Falar com microfone"}>
                    <MicIcon />
                  </button>
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(event) => setInputValue(event.target.value)}
                    placeholder="Pergunte sobre riscos, desempenho, falhas ou oportunidades..."
                  />
                  <button type="submit" className={styles.sendButton}>
                    <SendIcon />
                    <span>Enviar</span>
                  </button>
                </div>
                <input ref={fileInputRef} type="file" className={styles.hiddenInput} multiple onChange={handleFilesSelected} accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.webp,.txt,.ppt,.pptx" />
              </form>
            </section>
          </div>
        </div>
      </section>

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
              <button
                type="button"
                className={styles.notificationsClose}
                onClick={() => setNotificationsOpen(false)}
                aria-label="Fechar notificações"
              >
                &times;
              </button>
            </div>

            <div className={styles.notificationsTabs}>
              <button type="button" className={`${styles.notificationsTab} ${notificationTab === "unread" ? styles.notificationsTabActive : ""}`.trim()} onClick={() => setNotificationTab("unread")}>
                Não lidas ({notificationCount})
              </button>
              <button type="button" className={`${styles.notificationsTab} ${notificationTab === "all" ? styles.notificationsTabActive : ""}`.trim()} onClick={() => setNotificationTab("all")}>
                Todos
              </button>
            </div>

            <div className={styles.notificationsList}>
              {visibleNotifications.length ? visibleNotifications.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`${styles.notificationRow} ${item.route ? styles.notificationRowButton : ""}`.trim()}
                  onClick={() => openNotificationAction(item)}
                  disabled={!item.route}
                  title={item.label || undefined}
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
    </main>
  );
}
