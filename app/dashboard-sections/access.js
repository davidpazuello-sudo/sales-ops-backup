"use client";

import { useEffect, useState } from "react";
import { Card } from "../dashboard-ui";
import styles from "../page.module.css";

export function AccessPermissionsContent({ sessionUser, onNotificationsRefresh }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [busyRequestId, setBusyRequestId] = useState("");

  async function loadRequests() {
    setLoading(true);
    const response = await fetch("/api/admin/access-requests", { cache: "no-store" }).catch(() => null);
    const payload = await response?.json().catch(() => null);

    if (!response?.ok) {
      setRequests([]);
      setMessage(payload?.error || "Nao foi possivel carregar as solicitacoes pendentes.");
      setLoading(false);
      return;
    }

    setRequests(payload?.requests || []);
    setMessage("");
    setLoading(false);
  }

  useEffect(() => {
    if (!sessionUser?.isSuperAdmin) {
      setLoading(false);
      return;
    }

    loadRequests();
  }, [sessionUser?.isSuperAdmin]);

  async function handleDecision(requestId, decision) {
    setBusyRequestId(requestId);
    const response = await fetch("/api/admin/access-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, decision }),
    }).catch(() => null);

    const payload = await response?.json().catch(() => null);
    setBusyRequestId("");

    if (!response?.ok) {
      setMessage(payload?.error || "Nao foi possivel concluir a solicitacao.");
      return;
    }

    setMessage(payload?.message || "Solicitacao atualizada com sucesso.");
    await loadRequests();
    await onNotificationsRefresh?.();
  }

  if (!sessionUser?.isSuperAdmin) {
    return (
      <section className={styles.dashboardSection}>
        <header className={styles.settingsHeader}>
          <h1>Permissoes e Acessos</h1>
          <p>Esta area e restrita aos super admins do sistema.</p>
        </header>
        <div className={styles.sectionEmptyPanel}>
          <strong>Acesso restrito</strong>
          <p>Entre com uma conta de super admin para revisar solicitacoes pendentes.</p>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.dashboardSection}>
      <header className={styles.settingsHeader}>
        <h1>Permissoes e Acessos</h1>
        <p>Revise as solicitacoes pendentes e aprove ou recuse o envio do primeiro acesso.</p>
      </header>

      {message ? <div className={styles.sectionNotice}>{message}</div> : null}

      <div className={styles.grid}>
        <Card eyebrow="PENDENTES" title="Solicitacoes em aberto" wide>
          {loading ? (
            <div className={styles.sectionEmptyPanel}>
              <strong>Carregando solicitacoes</strong>
              <p>Buscando pedidos abertos para aprovacao.</p>
            </div>
          ) : requests.length ? (
            <div className={styles.accessRequestList}>
              {requests.map((item) => (
                <article key={item.id} className={styles.accessRequestCard}>
                  <div className={styles.accessRequestMeta}>
                    <strong>{item.email}</strong>
                    <span>{item.type === "request-access" ? "Solicitacao de acesso" : "Pedido de primeiro acesso"}</span>
                    <small>{new Date(item.requestedAt).toLocaleString("pt-BR")}</small>
                  </div>
                  <div className={styles.accessRequestActions}>
                    <button
                      type="button"
                      className={styles.secondaryActionButton}
                      onClick={() => handleDecision(item.id, "rejected")}
                      disabled={busyRequestId === item.id}
                    >
                      Recusar
                    </button>
                    <button
                      type="button"
                      className={styles.primaryActionButton}
                      onClick={() => handleDecision(item.id, "approved")}
                      disabled={busyRequestId === item.id}
                    >
                      Aprovar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.sectionEmptyPanel}>
              <strong>Nenhuma solicitacao pendente</strong>
              <p>Quando um usuario solicitar acesso ou primeiro acesso, ele aparecera aqui.</p>
            </div>
          )}
        </Card>
      </div>
    </section>
  );
}
