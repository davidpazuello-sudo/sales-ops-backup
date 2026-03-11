"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { readMfaState } from "lib/supabase/mfa";
import styles from "./page.module.css";

function buildQrCodeDataUri(svg) {
  if (!svg) {
    return "";
  }

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export default function TwoFactorSettings({ sessionUser, onStatusChange }) {
  const [supabaseConfig, setSupabaseConfig] = useState(null);
  const [mfaState, setMfaState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [enrollment, setEnrollment] = useState(null);

  const getSupabaseClientOrNull = useCallback(async () => {
    if (typeof window === "undefined" || !supabaseConfig) {
      return null;
    }

    try {
      const { createClient } = await import("lib/supabase/client");
      return createClient(supabaseConfig);
    } catch {
      return null;
    }
  }, [supabaseConfig]);

  const refreshState = useCallback(async () => {
    setLoading(true);
    setError("");

    const supabase = await getSupabaseClientOrNull();
    if (!supabase) {
      setLoading(false);
      setError("Nao foi possivel carregar o status do 2FA neste ambiente.");
      return;
    }

    const nextState = await readMfaState(supabase);
    setMfaState(nextState);
    onStatusChange?.(nextState);
    setLoading(false);
  }, [getSupabaseClientOrNull, onStatusChange]);

  useEffect(() => {
    let cancelled = false;

    async function loadConfig() {
      const response = await fetch("/api/auth/config", { cache: "no-store" }).catch(() => null);
      if (!response?.ok || cancelled) {
        setLoading(false);
        setError("Nao foi possivel conectar o autenticador com o ambiente atual.");
        return;
      }

      const payload = await response.json().catch(() => null);
      if (!payload?.supabase || cancelled) {
        setLoading(false);
        setError("Nao foi possivel identificar a configuracao publica do Supabase.");
        return;
      }

      setSupabaseConfig(payload.supabase);
    }

    loadConfig();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!supabaseConfig) {
      return;
    }

    refreshState();
  }, [supabaseConfig, refreshState]);

  const qrCodeDataUri = useMemo(
    () => buildQrCodeDataUri(enrollment?.qrCode || ""),
    [enrollment],
  );

  async function handleStartEnrollment() {
    setBusy(true);
    setError("");
    setMessage("");

    const supabase = await getSupabaseClientOrNull();
    if (!supabase) {
      setBusy(false);
      setError("Nao foi possivel iniciar o cadastro do autenticador.");
      return;
    }

    const { data, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "SalesOps Authenticator",
    });

    if (enrollError || !data?.id || !data?.totp?.qr_code) {
      setBusy(false);
      setError(enrollError?.message || "Nao foi possivel gerar o QR code do autenticador.");
      return;
    }

    setEnrollment({
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
      friendlyName: data.friendly_name || "SalesOps Authenticator",
    });
    setVerificationCode("");
    setBusy(false);
  }

  async function handleVerifyEnrollment(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");

    const code = verificationCode.trim();
    if (!enrollment?.factorId || code.length < 6) {
      setBusy(false);
      setError("Digite o codigo de 6 digitos exibido no aplicativo autenticador.");
      return;
    }

    const supabase = await getSupabaseClientOrNull();
    if (!supabase) {
      setBusy(false);
      setError("Nao foi possivel validar o autenticador.");
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId: enrollment.factorId,
      code,
    });

    if (verifyError) {
      setBusy(false);
      setError(verifyError.message || "Nao foi possivel confirmar o 2FA.");
      return;
    }

    setEnrollment(null);
    setVerificationCode("");
    setMessage("Autenticador configurado com sucesso. O codigo sera exigido no proximo login.");
    await refreshState();
    setBusy(false);
  }

  async function handleDisableFactor() {
    if (!mfaState?.preferredFactorId) {
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");

    const supabase = await getSupabaseClientOrNull();
    if (!supabase) {
      setBusy(false);
      setError("Nao foi possivel desativar o autenticador.");
      return;
    }

    if (mfaState.currentLevel !== "aal2") {
      setBusy(false);
      setError("Para remover o 2FA, entre novamente e conclua a validacao do codigo atual.");
      return;
    }

    const { error: unenrollError } = await supabase.auth.mfa.unenroll({
      factorId: mfaState.preferredFactorId,
    });

    if (unenrollError) {
      setBusy(false);
      setError(unenrollError.message || "Nao foi possivel desativar o autenticador.");
      return;
    }

    setEnrollment(null);
    setVerificationCode("");
    setMessage("Autenticador removido. O proximo login voltara a usar apenas senha.");
    await refreshState();
    setBusy(false);
  }

  return (
    <div className={styles.twoFactorPanel}>
      <div className={styles.twoFactorStatusRow}>
        <div>
          <span className={styles.twoFactorEyebrow}>ACESSO PROTEGIDO</span>
          <strong>
            {loading
              ? "Carregando status do 2FA"
              : mfaState?.hasTotpFactor
                ? "Autenticador ativo"
                : "Autenticador ainda nao configurado"}
          </strong>
          <p>
            {loading
              ? "Validando fatores da sua conta no Supabase."
              : mfaState?.hasTotpFactor
                ? `Conta protegida por ${mfaState.preferredFactorName || "aplicativo autenticador"}`
                : "Ative o 2FA com um aplicativo autenticador para reforcar o login."}
          </p>
        </div>
        <span className={`${styles.twoFactorBadge} ${mfaState?.hasTotpFactor ? styles.twoFactorBadgeActive : ""}`.trim()}>
          {mfaState?.hasTotpFactor ? "Ativo" : "Pendente"}
        </span>
      </div>

      {error ? <div className={styles.twoFactorFormInfo}>{error}</div> : null}
      {message ? <div className={styles.sectionNotice}>{message}</div> : null}

      {enrollment ? (
        <div className={styles.twoFactorEnrollment}>
          <div className={styles.twoFactorQrBox}>
            {qrCodeDataUri ? (
              <Image
                src={qrCodeDataUri}
                alt="QR code para ativar autenticador"
                className={styles.twoFactorQrImage}
                width={200}
                height={200}
                unoptimized
              />
            ) : null}
            <div className={styles.twoFactorSecretBox}>
              <span>Chave manual</span>
              <strong>{enrollment.secret}</strong>
            </div>
          </div>

          <form className={styles.twoFactorCodeForm} onSubmit={handleVerifyEnrollment}>
            <label className={styles.twoFactorField}>
              <span>Codigo do aplicativo autenticador</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={verificationCode}
                onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                required
              />
            </label>
            <div className={styles.twoFactorHint}>
              Escaneie o QR code no Google Authenticator, Microsoft Authenticator ou app equivalente e confirme o primeiro codigo.
            </div>
            <div className={styles.accessRequestActions}>
              <button
                type="button"
                className={styles.secondaryActionButton}
                onClick={() => {
                  setEnrollment(null);
                  setVerificationCode("");
                  setError("");
                }}
                disabled={busy}
              >
                Cancelar
              </button>
              <button type="submit" className={styles.primaryActionButton} disabled={busy}>
                Confirmar 2FA
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className={styles.twoFactorActions}>
          <div className={styles.twoFactorSummary}>
            <span>Email protegido</span>
            <strong>{sessionUser?.email || "Conta autenticada"}</strong>
            <small>
              {mfaState?.hasTotpFactor
                ? "O proximo login exigira senha e codigo do autenticador."
                : "Ao ativar, seus proximos logins vao pedir senha e codigo temporario."}
            </small>
          </div>

          <div className={styles.accessRequestActions}>
            {mfaState?.hasTotpFactor ? (
              <button type="button" className={styles.secondaryActionButton} onClick={handleDisableFactor} disabled={busy}>
                Desativar 2FA
              </button>
            ) : (
              <button type="button" className={styles.primaryActionButton} onClick={handleStartEnrollment} disabled={busy || loading}>
                Ativar aplicativo autenticador
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
