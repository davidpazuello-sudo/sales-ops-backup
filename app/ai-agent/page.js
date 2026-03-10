"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

const navItems = [
  { id: "reports", label: "Relatórios" },
  { id: "sellers", label: "Vendedores" },
  { id: "deals", label: "Negócios" },
];

const topMenuItems = ["Arquivo", "Editar", "Visualizar", "Ajuda"];

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
  return <BaseIcon><path d="M12 8.6A3.4 3.4 0 1 0 12 15.4A3.4 3.4 0 1 0 12 8.6z" /><path d="M19 12a7.2 7.2 0 0 0-.1-1l1.9-1.4-1.8-3.2-2.3 1a7.7 7.7 0 0 0-1.7-1l-.3-2.4H10l-.4 2.4a7.7 7.7 0 0 0-1.7 1l-2.3-1-1.8 3.2L5.7 11a7.2 7.2 0 0 0 0 2l-1.9 1.4 1.8 3.2 2.3-1c.5.4 1.1.7 1.7 1l.4 2.4h4.6l.3-2.4c.6-.2 1.2-.6 1.7-1l2.3 1 1.8-3.2L18.9 13c.1-.3.1-.7.1-1z" /></BaseIcon>;
}

export default function AIAgentPage() {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [inputValue, setInputValue] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sessionUser, setSessionUser] = useState({ name: "Usuario", role: "Cargo" });
  const menuRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);

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
      });
    }

    loadSessionUser();
    return () => {
      cancelled = true;
    };
  }, []);

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

  function submitQuestion(question) {
    const trimmed = question.trim();
    if (!trimmed && attachments.length === 0) return;

    const uploadedItems = attachments.map((file) => ({
      name: file.name,
      type: file.type || "application/octet-stream",
    }));

    setMessages((current) => [
      ...current,
      { id: current.length + 1, role: "user", text: trimmed || "Anexei arquivos para análise.", attachments: uploadedItems },
      {
        id: current.length + 2,
        role: "assistant",
        text: "Análise iniciada. Vou considerar permissões, contexto operacional e sinais do sistema para responder de forma segura.",
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
      settings: "/configuracoes",
      profile: "/perfil",
    };

    router.push(routeMap[view] || "/relatorios");
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
          <button type="button" className={`${styles.topbarButton} ${styles.notificationButton}`.trim()} aria-label="Notificações" title="Notificações">
            <BellIcon />
          </button>
          <button type="button" className={styles.aiButton} title="Agente de IA">
            <SparkIcon />
            <span>Agente de IA</span>
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
            {navItems.map((item) => (
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
        <div className={styles.agentContent}>
          <header className={styles.agentHeader}>
            <span className={styles.eyebrow}>AGENTE DE IA</span>
            <h1>Central de análise inteligente</h1>
            <p>Investigue o sistema com histórico de perguntas, sugestões rápidas e conversa contínua.</p>
          </header>

          <div className={styles.agentPanels}>
            <aside className={styles.historyPanel}>
              <div className={styles.panelHeader}>
                <h2>Histórico</h2>
                <p>Perguntas recentes feitas ao agente.</p>
              </div>
              <button type="button" className={styles.newChatButton} onClick={startNewChat}>
                Novo chat
              </button>
              <div className={styles.historyList}>
                {historyItems.map((item) => (
                  <button key={item} type="button" className={styles.historyItem} onClick={() => submitQuestion(item)}>
                    {item}
                  </button>
                ))}
              </div>
            </aside>

            <section className={styles.chatPanel}>
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
                    <span className={styles.messageRole}>{message.role === "user" ? "Você" : "Agente IA"}</span>
                    <p>{message.text}</p>
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
    </main>
  );
}
