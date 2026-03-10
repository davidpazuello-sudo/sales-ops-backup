"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FIRST_ACCESS_MODE } from "lib/auth-flows";
import styles from "./page.module.css";

const qrCells = [
  "111111100011111",
  "100000100010001",
  "101110100111101",
  "101110100100101",
  "101110100111101",
  "100000100010001",
  "111111101011111",
  "000000001000000",
  "111011111110111",
  "001010001010100",
  "111110111011111",
  "100010100010001",
  "101110111110101",
  "100000100010001",
  "111111101111111",
];

export default function LoginPage() {
  const router = useRouter();
  const [view, setView] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstAccessEmail, setFirstAccessEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [requestEmail, setRequestEmail] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [firstAccessMessage, setFirstAccessMessage] = useState("");
  const [requestMessage, setRequestMessage] = useState("");
  const [forgotMessage, setForgotMessage] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [redirectPath, setRedirectPath] = useState("/relatorios");
  const [resetFlow, setResetFlow] = useState("password-recovery");
  const [supabaseConfig, setSupabaseConfig] = useState(null);

  async function getSupabaseClientOrNull() {
    if (typeof window === "undefined") return null;
    if (!supabaseConfig) return null;

    try {
      const { createClient } = await import("lib/supabase/client");
      return createClient(supabaseConfig);
    } catch {
      return null;
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const nextRedirect = params.get("redirect") || "/relatorios";
    const nextResetFlow =
      params.get("mode") === FIRST_ACCESS_MODE ? FIRST_ACCESS_MODE : "password-recovery";
    const hasRecoveryToken = window.location.hash.includes("access_token");

    setRedirectPath(nextRedirect);
    setResetFlow(nextResetFlow);

    if (hasRecoveryToken) {
      setView("reset");
    } else if (nextResetFlow === FIRST_ACCESS_MODE) {
      setView("firstAccess");
    }

    if (params.get("config") === "supabase") {
      setLoginError("Supabase ainda nao esta configurado no ambiente publicado.");
    } else if (params.get("authError") === "middleware") {
      setLoginError("Nao foi possivel validar a sessao agora. Tente novamente em instantes.");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadSupabaseConfig() {
      const response = await fetch("/api/auth/config", { cache: "no-store" }).catch(() => null);
      if (cancelled || !response?.ok) return;

      const payload = await response.json().catch(() => null);
      if (cancelled || !payload?.supabase) return;

      setSupabaseConfig(payload.supabase);
    }

    loadSupabaseConfig();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      const response = await fetch("/api/auth/session", { cache: "no-store" }).catch(() => null);
      if (cancelled || !response?.ok) return;

      const payload = await response.json().catch(() => null);
      if (payload?.authenticated) {
        router.replace(redirectPath);
      }
    }

    loadSession();
    return () => {
      cancelled = true;
    };
  }, [redirectPath, router]);

  useEffect(() => {
    let subscription;
    let cancelled = false;

    async function bindRecoveryListener() {
      const supabase = await getSupabaseClientOrNull();
      if (!supabase || cancelled) return;

      const {
        data: { subscription: nextSubscription },
      } = supabase.auth.onAuthStateChange((event) => {
        if (event === "PASSWORD_RECOVERY") {
          setView("reset");
          setLoginError("");
          setForgotMessage("");
          setFirstAccessMessage("");
        }
      });

      subscription = nextSubscription;
    }

    bindRecoveryListener();

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, [supabaseConfig]);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoginError("");
    setIsSubmitting(true);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }).catch(() => null);

    if (!response) {
      setLoginError("Nao foi possivel conectar ao servidor.");
      setIsSubmitting(false);
      return;
    }

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setLoginError(payload?.error || "Falha ao entrar.");
      setIsSubmitting(false);
      return;
    }

    router.replace(redirectPath);
  }

  function handleRequestAccess(event) {
    event.preventDefault();
    setRequestMessage("");
    setLoginError("");

    fetch("/api/auth/request-access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: requestEmail }),
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          setRequestMessage(payload?.error || "Nao foi possivel solicitar acesso.");
          return;
        }
        setRequestMessage(payload?.message || "Solicitacao enviada com sucesso.");
      })
      .catch(() => {
        setRequestMessage("Nao foi possivel solicitar acesso.");
      });
  }

  function handleFirstAccess(event) {
    event.preventDefault();
    setFirstAccessMessage("");
    setLoginError("");

    fetch("/api/auth/first-access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: firstAccessEmail }),
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          setFirstAccessMessage(payload?.error || "Nao foi possivel iniciar o primeiro acesso.");
          return;
        }
        setFirstAccessMessage(
          payload?.message || "Enviamos o link para definir sua senha de primeiro acesso.",
        );
      })
      .catch(() => {
        setFirstAccessMessage("Nao foi possivel iniciar o primeiro acesso.");
      });
  }

  function handleForgotPassword(event) {
    event.preventDefault();
    setForgotMessage("");
    setLoginError("");

    fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: forgotEmail }),
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          setForgotMessage(payload?.error || "Nao foi possivel enviar o link de recuperacao.");
          return;
        }
        setForgotMessage(payload?.message || "Link de recuperacao enviado.");
      })
      .catch(() => {
        setForgotMessage("Nao foi possivel enviar o link de recuperacao.");
      });
  }

  async function handleResetPassword(event) {
    event.preventDefault();
    setResetMessage("");
    setLoginError("");

    const supabase = await getSupabaseClientOrNull();
    if (!supabase) {
      setLoginError("A autenticacao Supabase nao esta configurada corretamente neste ambiente publicado.");
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setLoginError("A nova senha precisa ter pelo menos 8 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setLoginError("As senhas nao conferem.");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setLoginError(error.message || "Nao foi possivel redefinir a senha.");
      return;
    }

    setResetMessage("Senha redefinida com sucesso. Voce ja pode entrar.");
    setNewPassword("");
    setConfirmPassword("");
    setView("login");
  }

  const pageTitle =
    view === "request"
      ? "Solicitar acesso"
      : view === "forgot"
        ? "Recuperar senha"
        : view === "firstAccess"
          ? "Primeiro acesso"
          : view === "reset"
            ? resetFlow === FIRST_ACCESS_MODE
              ? "Defina sua senha"
              : "Redefinir senha"
            : "Boas-vindas de volta!";

  const pageDescription =
    view === "request"
      ? "Informe seu email corporativo para pedir acesso ao workspace autenticado via Supabase."
      : view === "forgot"
        ? "Digite seu email corporativo para receber as instrucoes de redefinicao de senha."
        : view === "firstAccess"
          ? "Se sua conta ja foi habilitada, enviamos um link seguro para voce criar a senha do primeiro acesso."
          : view === "reset" && resetFlow === FIRST_ACCESS_MODE
            ? "Conclua o primeiro acesso definindo a senha que sera usada nas proximas entradas."
            : view === "reset"
              ? "Defina sua nova senha para concluir a recuperacao da conta."
              : "Estamos muito animados em te ver novamente!";

  return (
    <main className={styles.loginShell}>
      <div className={styles.brandMark}>
        <span className={styles.logoDark}>SALES</span>
        <span className={styles.logoAccent}>OPS</span>
      </div>

      <div className={styles.loginCard}>
        <section className={styles.formSide}>
          <div className={styles.welcomeBlock}>
            <h1>{pageTitle}</h1>
            <p>{pageDescription}</p>
          </div>

          {view === "request" ? (
            <>
              <form className={styles.form} onSubmit={handleRequestAccess}>
                <label className={styles.field}>
                  <span>Email corporativo</span>
                  <input
                    type="email"
                    value={requestEmail}
                    onChange={(event) => setRequestEmail(event.target.value)}
                    placeholder="voce@empresa.com"
                    autoComplete="email"
                    required
                  />
                </label>

                {requestMessage ? <div className={styles.formInfo}>{requestMessage}</div> : null}

                <button type="submit" className={styles.primaryButton}>
                  Enviar solicitacao
                </button>
              </form>

              <div className={styles.footerNote}>
                <span>Ja tem uma conta?</span>
                <button
                  type="button"
                  className={styles.inlineAction}
                  onClick={() => setView("login")}
                >
                  Voltar para login
                </button>
              </div>
            </>
          ) : view === "firstAccess" ? (
            <>
              <form className={styles.form} onSubmit={handleFirstAccess}>
                <label className={styles.field}>
                  <span>Email corporativo</span>
                  <input
                    type="email"
                    value={firstAccessEmail}
                    onChange={(event) => setFirstAccessEmail(event.target.value)}
                    placeholder="voce@empresa.com"
                    autoComplete="email"
                    required
                  />
                </label>

                {firstAccessMessage ? <div className={styles.formInfo}>{firstAccessMessage}</div> : null}

                <button type="submit" className={styles.primaryButton}>
                  Enviar link de primeiro acesso
                </button>
              </form>

              <div className={styles.footerNote}>
                <span>Ja recebeu a liberacao?</span>
                <button
                  type="button"
                  className={styles.inlineAction}
                  onClick={() => setView("login")}
                >
                  Voltar para login
                </button>
              </div>
            </>
          ) : view === "forgot" ? (
            <>
              <form className={styles.form} onSubmit={handleForgotPassword}>
                <label className={styles.field}>
                  <span>Email corporativo</span>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(event) => setForgotEmail(event.target.value)}
                    placeholder="voce@empresa.com"
                    autoComplete="email"
                    required
                  />
                </label>

                {forgotMessage ? <div className={styles.formInfo}>{forgotMessage}</div> : null}

                <button type="submit" className={styles.primaryButton}>
                  Enviar link de recuperacao
                </button>
              </form>

              <div className={styles.footerNote}>
                <span>Lembrou sua senha?</span>
                <button
                  type="button"
                  className={styles.inlineAction}
                  onClick={() => setView("login")}
                >
                  Voltar para login
                </button>
              </div>
            </>
          ) : view === "reset" ? (
            <>
              <form className={styles.form} onSubmit={handleResetPassword}>
                <label className={styles.field}>
                  <span>Nova senha</span>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="Digite a nova senha"
                    autoComplete="new-password"
                    required
                  />
                </label>

                <label className={styles.field}>
                  <span>Confirmar senha</span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Repita a nova senha"
                    autoComplete="new-password"
                    required
                  />
                </label>

                {loginError ? <div className={styles.formError}>{loginError}</div> : null}
                {resetMessage ? <div className={styles.formInfo}>{resetMessage}</div> : null}

                <button type="submit" className={styles.primaryButton}>
                  {resetFlow === FIRST_ACCESS_MODE ? "Definir senha de acesso" : "Redefinir senha"}
                </button>
              </form>

              <div className={styles.footerNote}>
                <span>Voltar para o acesso normal?</span>
                <button
                  type="button"
                  className={styles.inlineAction}
                  onClick={() => {
                    setResetFlow("password-recovery");
                    setView("login");
                  }}
                >
                  Ir para login
                </button>
              </div>
            </>
          ) : (
            <>
              <form className={styles.form} onSubmit={handleSubmit}>
                <label className={styles.field}>
                  <span>Email corporativo</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="voce@empresa.com"
                    autoComplete="email"
                    required
                  />
                </label>

                <label className={styles.field}>
                  <span>Senha</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Digite sua senha"
                    autoComplete="current-password"
                    required
                  />
                </label>

                {loginError ? <div className={styles.formError}>{loginError}</div> : null}

                <button
                  type="button"
                  className={styles.inlineAction}
                  onClick={() => setView("forgot")}
                >
                  Esqueceu sua senha?
                </button>

                <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
                  {isSubmitting ? "Entrando..." : "Entrar"}
                </button>
              </form>

              <div className={styles.footerNote}>
                <span>Primeiro acesso ou sem conta?</span>
                <button
                  type="button"
                  className={styles.inlineAction}
                  onClick={() => setView("firstAccess")}
                >
                  Primeiro acesso
                </button>
                <button
                  type="button"
                  className={styles.inlineAction}
                  onClick={() => setView("request")}
                >
                  Solicitar acesso
                </button>
              </div>
            </>
          )}
        </section>

        <section className={styles.qrSide}>
          <div className={styles.qrFrame} aria-hidden="true">
            <div className={styles.qrGrid}>
              {qrCells.join("").split("").map((cell, index) => (
                <span
                  key={index}
                  className={cell === "1" ? styles.qrCellDark : styles.qrCellLight}
                />
              ))}
            </div>
            <div className={styles.qrCenterBadge}>SO</div>
          </div>

          <div className={styles.qrCopy}>
            <h2>Acesso protegido</h2>
            <p>
              O login do sistema agora e autenticado pelo Supabase com sessao real.
            </p>
          </div>

          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => window.open("https://supabase.com/dashboard", "_blank", "noopener,noreferrer")}
          >
            Painel Supabase
          </button>
        </section>
      </div>
    </main>
  );
}
