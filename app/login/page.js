"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FIRST_ACCESS_MODE } from "lib/auth-flows";
import { readMfaState } from "lib/supabase/mfa";
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

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#EA4335" d="M12.2 10.1v4.1h5.7c-.2 1.3-1.5 3.8-5.7 3.8-3.4 0-6.2-2.8-6.2-6.3s2.8-6.3 6.2-6.3c2 0 3.3.8 4.1 1.5l2.8-2.7C17.4 2.6 15 1.5 12.2 1.5 6.4 1.5 1.8 6.2 1.8 12s4.6 10.5 10.4 10.5c6 0 10-4.2 10-10.1 0-.7-.1-1.2-.2-1.8z" />
      <path fill="#FBBC05" d="M1.8 7.1l3.4 2.5c.9-2.6 3.3-4.4 7-4.4 2 0 3.3.8 4.1 1.5l2.8-2.7C17.4 2.6 15 1.5 12.2 1.5c-4.2 0-7.9 2.4-9.7 5.6z" />
      <path fill="#34A853" d="M12.2 22.5c2.7 0 5-.9 6.7-2.5l-3.1-2.5c-.8.6-2 .9-3.6.9-3.9 0-5.4-2.5-5.8-3.8l-3.4 2.6c1.8 3.4 5.4 5.3 9.2 5.3z" />
      <path fill="#4285F4" d="M22.2 12.4c0-.7-.1-1.2-.2-1.8h-9.8v4.1h5.7c-.3 1.4-1.1 2.4-2 3.1l3.1 2.5c1.8-1.7 3.2-4.3 3.2-7.9z" />
    </svg>
  );
}

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
  const [isPreparingRecovery, setIsPreparingRecovery] = useState(false);
  const [isRecoverySessionReady, setIsRecoverySessionReady] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorFactorId, setTwoFactorFactorId] = useState("");
  const [twoFactorFactorLabel, setTwoFactorFactorLabel] = useState("Aplicativo autenticador");
  const [twoFactorMessage, setTwoFactorMessage] = useState("");
  const [isPreparingTwoFactor, setIsPreparingTwoFactor] = useState(false);

  const getSupabaseClientOrNull = useCallback(async () => {
    if (typeof window === "undefined") return null;
    if (!supabaseConfig) return null;

    try {
      const { createClient } = await import("lib/supabase/client");
      return createClient(supabaseConfig);
    } catch {
      return null;
    }
  }, [supabaseConfig]);

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
    } else if (params.get("access") === "request") {
      setView("request");
    } else if (params.get("authError") === "middleware") {
      setLoginError("Nao foi possivel validar a sessao agora. Tente novamente em instantes.");
    } else if (params.get("mfa") === "required") {
      setView("twoFactor");
      setLoginError("");
    }
  }, []);

  const prepareTwoFactorChallenge = useCallback(async () => {
    setIsPreparingTwoFactor(true);
    setLoginError("");
    setTwoFactorMessage("");

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const supabase = await getSupabaseClientOrNull();
      if (!supabase) {
        break;
      }

      const mfa = await readMfaState(supabase);
      if (mfa.hasTotpFactor && mfa.preferredFactorId) {
        setTwoFactorFactorId(mfa.preferredFactorId);
        setTwoFactorFactorLabel(mfa.preferredFactorName || "Aplicativo autenticador");
        setView("twoFactor");
        setIsPreparingTwoFactor(false);
        return true;
      }

      await new Promise((resolve) => {
        window.setTimeout(resolve, 250);
      });
    }

    setIsPreparingTwoFactor(false);
    setLoginError("Nao encontramos um autenticador configurado para esta conta. Ative o 2FA primeiro no perfil.");
    return false;
  }, [getSupabaseClientOrNull]);

  const requestAccessForEmail = useCallback(async (nextEmail) => {
    const normalizedEmail = String(nextEmail || "").trim().toLowerCase();
    if (!normalizedEmail) {
      return "Nao identificamos um email valido para solicitar acesso.";
    }

    const response = await fetch("/api/auth/request-access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: normalizedEmail }),
    }).catch(() => null);

    if (!response) {
      return "Nao foi possivel solicitar acesso agora.";
    }

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      return payload?.error || "Nao foi possivel solicitar acesso agora.";
    }

    return payload?.message || "Solicitacao enviada com sucesso.";
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function prepareRecoverySession() {
      if (typeof window === "undefined" || !supabaseConfig) return;

      const params = new URLSearchParams(window.location.search);
      const hash = window.location.hash.startsWith("#")
        ? new URLSearchParams(window.location.hash.slice(1))
        : new URLSearchParams();
      const hasRecoveryHash = hash.has("access_token") && hash.has("refresh_token");
      const authCode = params.get("code");
      const recoveryType = params.get("type") || hash.get("type");

      if (!hasRecoveryHash && !authCode) {
        return;
      }

      setIsPreparingRecovery(true);
      setLoginError("");

      const supabase = await getSupabaseClientOrNull();
      if (!supabase || cancelled) {
        setIsPreparingRecovery(false);
        return;
      }

      try {
        if (hasRecoveryHash) {
          const { error } = await supabase.auth.setSession({
            access_token: hash.get("access_token"),
            refresh_token: hash.get("refresh_token"),
          });

          if (error) {
            throw error;
          }
        } else if (authCode) {
          const { error } = await supabase.auth.exchangeCodeForSession(authCode);
          if (error) {
            throw error;
          }
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          throw new Error("Auth session missing!");
        }

        if (!cancelled) {
          setIsRecoverySessionReady(true);
          setView("reset");
          setResetFlow(recoveryType === FIRST_ACCESS_MODE ? FIRST_ACCESS_MODE : "password-recovery");

          const cleanUrl = new URL(window.location.href);
          cleanUrl.hash = "";
          cleanUrl.searchParams.delete("code");
          cleanUrl.searchParams.delete("type");
          window.history.replaceState({}, "", cleanUrl.toString());
        }
      } catch (error) {
        if (!cancelled) {
          setIsRecoverySessionReady(false);
          setLoginError(error?.message || "Nao foi possivel validar o link de recuperacao.");
        }
      } finally {
        if (!cancelled) {
          setIsPreparingRecovery(false);
        }
      }
    }

    prepareRecoverySession();

    return () => {
      cancelled = true;
    };
  }, [getSupabaseClientOrNull, supabaseConfig]);

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
      if (payload?.authenticated && payload?.authorizedAccess === false) {
        const nextEmail = payload?.user?.email || "";
        const nextMessage = await requestAccessForEmail(nextEmail);
        await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
        if (cancelled) return;

        setRequestEmail(nextEmail);
        setRequestMessage(nextMessage);
        setLoginError("");
        setView("request");
        return;
      }

      if (payload?.authenticated && payload?.requiresTwoFactor) {
        await prepareTwoFactorChallenge();
        return;
      }

      if (payload?.authenticated) {
        router.replace(redirectPath);
      }
    }

    loadSession();
    return () => {
      cancelled = true;
    };
  }, [prepareTwoFactorChallenge, redirectPath, requestAccessForEmail, router]);

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
          setIsRecoverySessionReady(true);
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
  }, [getSupabaseClientOrNull, supabaseConfig]);

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

    const payload = await response.json().catch(() => null);
    if (payload?.requiresTwoFactor) {
      setPassword("");
      await prepareTwoFactorChallenge();
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    router.replace(redirectPath);
  }

  async function handleTwoFactorSubmit(event) {
    event.preventDefault();
    setLoginError("");
    setTwoFactorMessage("");
    setIsSubmitting(true);

    const supabase = await getSupabaseClientOrNull();
    if (!supabase) {
      setLoginError("Nao foi possivel validar o codigo de 2FA neste ambiente.");
      setIsSubmitting(false);
      return;
    }

    if (!twoFactorFactorId) {
      const ready = await prepareTwoFactorChallenge();
      if (!ready) {
        setIsSubmitting(false);
        return;
      }
    }

    const code = twoFactorCode.trim();
    if (code.length < 6) {
      setLoginError("Digite o codigo de 6 digitos do aplicativo autenticador.");
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: twoFactorFactorId,
      code,
    });

    if (error) {
      setLoginError(error.message || "Nao foi possivel validar o codigo do autenticador.");
      setIsSubmitting(false);
      return;
    }

    setTwoFactorCode("");
    setIsSubmitting(false);
    router.replace(redirectPath);
  }

  async function handleBackToLoginFromTwoFactor() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    setTwoFactorCode("");
    setTwoFactorFactorId("");
    setTwoFactorMessage("");
    setLoginError("");
    setView("login");
  }

  async function handleGoogleAccess() {
    setLoginError("");
    setRequestMessage("");
    setFirstAccessMessage("");
    setForgotMessage("");
    setIsGoogleSubmitting(true);

    const supabase = await getSupabaseClientOrNull();
    if (!supabase) {
      setLoginError("Nao foi possivel iniciar o login com Google neste ambiente.");
      setIsGoogleSubmitting(false);
      return;
    }

    const targetUrl = new URL("/login", window.location.origin);
    if (redirectPath && redirectPath !== "/relatorios") {
      targetUrl.searchParams.set("redirect", redirectPath);
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: targetUrl.toString(),
      },
    });

    if (error) {
      setLoginError(error.message || "Nao foi possivel iniciar o login com Google.");
      setIsGoogleSubmitting(false);
    }
  }

  function handleRequestAccess(event) {
    event.preventDefault();
    setRequestMessage("");
    setLoginError("");
    requestAccessForEmail(requestEmail).then((message) => {
      setRequestMessage(message);
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

    if (!isRecoverySessionReady) {
      setLoginError("Ainda estamos validando o link de recuperacao. Aguarde alguns instantes e tente novamente.");
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
          : view === "twoFactor"
            ? "Confirmar segundo fator"
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
          : view === "twoFactor"
            ? "Digite o codigo de 6 digitos do seu aplicativo autenticador para concluir a entrada."
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
                {isPreparingRecovery ? (
                  <div className={styles.formInfo}>Validando o link seguro para liberar a redefinicao...</div>
                ) : null}
                {resetMessage ? <div className={styles.formInfo}>{resetMessage}</div> : null}

                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={isPreparingRecovery}
                >
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
          ) : view === "twoFactor" ? (
            <>
              <form className={styles.form} onSubmit={handleTwoFactorSubmit}>
                <div className={styles.twoFactorInlineNotice}>
                  <strong>{twoFactorFactorLabel}</strong>
                  <span>
                    {isPreparingTwoFactor
                      ? "Preparando o desafio do segundo fator..."
                      : "Abra o aplicativo autenticador e informe o codigo atual para concluir o login."}
                  </span>
                </div>

                <label className={styles.field}>
                  <span>Codigo de 2FA</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={twoFactorCode}
                    onChange={(event) => setTwoFactorCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    required
                  />
                </label>

                {twoFactorMessage ? <div className={styles.sectionNotice}>{twoFactorMessage}</div> : null}
                {loginError ? <div className={styles.formError}>{loginError}</div> : null}

                <button type="submit" className={styles.primaryButton} disabled={isSubmitting || isPreparingTwoFactor}>
                  Validar e entrar
                </button>
              </form>

              <div className={styles.footerNote}>
                <span>Esta nao era a conta certa?</span>
                <button
                  type="button"
                  className={styles.inlineAction}
                  onClick={handleBackToLoginFromTwoFactor}
                >
                  Voltar para login
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
              Entre com Google para autenticar. Se sua conta ainda nao tiver acesso liberado, o sistema abre a solicitacao automaticamente para analise do admin.
            </p>
          </div>

          <button
            type="button"
            className={styles.googleButton}
            onClick={handleGoogleAccess}
            disabled={isGoogleSubmitting}
          >
            <GoogleIcon />
            <span>{isGoogleSubmitting ? "Conectando com Google..." : "Continuar com Google"}</span>
          </button>
        </section>
      </div>
    </main>
  );
}
