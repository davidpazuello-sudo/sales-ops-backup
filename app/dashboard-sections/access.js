"use client";

import { useEffect, useState } from "react";
import { Card, Table } from "../dashboard-ui";
import PageAgentPanel, { PageAgentToggleButton } from "../page-agent-panel";
import {
  SectionEmptyState,
  SectionLoadingState,
  SectionNotice,
} from "../dashboard-section-feedback";
import { permissionRows } from "../dashboard-shell-config";
import styles from "../page.module.css";

const fallbackRoleOptions = ["Admin", "Gerente", "Supervisor", "Vendedor"];

function formatLastInteraction(value) {
  if (!value) {
    return "Sem registro";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Sem registro";
  }

  return date.toLocaleString("pt-BR");
}

export function AccessPermissionsContent({ sessionUser, onNotificationsRefresh }) {
  const [requests, setRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [requestsError, setRequestsError] = useState("");
  const [usersError, setUsersError] = useState("");
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [busyRequestId, setBusyRequestId] = useState("");
  const [busyUserId, setBusyUserId] = useState("");
  const [agentOpen, setAgentOpen] = useState(false);
  const [roleOptions, setRoleOptions] = useState(fallbackRoleOptions);
  const [roleDrafts, setRoleDrafts] = useState({});
  const requestsCardClassName = !loading && !requestsError && !requests.length
    ? styles.compactCard
    : "";

  async function loadRequests() {
    setLoading(true);
    const response = await fetch("/api/admin/access-requests", { cache: "no-store" }).catch(() => null);
    const payload = await response?.json().catch(() => null);

    if (!response?.ok) {
      setRequests([]);
      setRequestsError(payload?.error || "Nao foi possivel carregar as solicitacoes pendentes.");
      setLoading(false);
      return;
    }

    setRequests(payload?.requests || []);
    setRequestsError("");
    setLoading(false);
  }

  async function loadUsers() {
    setUsersLoading(true);
    const response = await fetch("/api/admin/system-users", { cache: "no-store" }).catch(() => null);
    const payload = await response?.json().catch(() => null);

    if (!response?.ok) {
      setUsers([]);
      setRoleDrafts({});
      setUsersError(payload?.error || "Nao foi possivel carregar os usuarios do sistema.");
      setUsersLoading(false);
      return;
    }

    const nextUsers = payload?.users || [];

    setUsers(nextUsers);
    setRoleOptions(payload?.roleOptions || fallbackRoleOptions);
    setRoleDrafts(Object.fromEntries(nextUsers.map((item) => [item.id, item.role])));
    setUsersError("");
    setUsersLoading(false);
  }

  useEffect(() => {
    if (!sessionUser?.isSuperAdmin) {
      setLoading(false);
      setUsersLoading(false);
      return;
    }

    loadRequests();
    loadUsers();
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
      setFeedback({ type: "error", message: payload?.error || "Nao foi possivel concluir a solicitacao." });
      return;
    }

    setFeedback({ type: "success", message: payload?.message || "Solicitacao atualizada com sucesso." });
    await loadRequests();
    await onNotificationsRefresh?.();
  }

  function getRoleDraft(user) {
    return roleDrafts[user.id] || user.role;
  }

  function hasPendingRoleChange(user) {
    return getRoleDraft(user) !== user.role;
  }

  function handleRoleCancel(user) {
    setRoleDrafts((current) => ({
      ...current,
      [user.id]: user.role,
    }));
  }

  async function handleRoleSave(user) {
    const nextRole = getRoleDraft(user);
    if (!nextRole || nextRole === user.role) {
      return;
    }

    setBusyUserId(user.id);
    const response = await fetch("/api/admin/system-users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.id,
        email: user.email,
        role: nextRole,
      }),
    }).catch(() => null);

    const payload = await response?.json().catch(() => null);
    setBusyUserId("");

    if (!response?.ok) {
      setFeedback({ type: "error", message: payload?.error || "Nao foi possivel atualizar o cargo do usuario." });
      return;
    }

    const savedRole = payload?.user?.role || nextRole;

    setUsers((current) => current.map((item) => (
      item.id === user.id
        ? { ...item, role: savedRole }
        : item
    )));
    setRoleDrafts((current) => ({
      ...current,
      [user.id]: savedRole,
    }));
    setFeedback({ type: "success", message: payload?.message || "Cargo atualizado com sucesso." });
  }

  async function handleUserDelete(user) {
    if (!user?.id || !user?.email) {
      return;
    }

    const shouldDelete = window.confirm(`Deseja excluir o usuario ${user.email}? Essa acao remove o acesso dele do sistema.`);
    if (!shouldDelete) {
      return;
    }

    setBusyUserId(user.id);
    const response = await fetch("/api/admin/system-users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.id,
        email: user.email,
      }),
    }).catch(() => null);

    const payload = await response?.json().catch(() => null);
    setBusyUserId("");

    if (!response?.ok) {
      setFeedback({ type: "error", message: payload?.error || "Nao foi possivel excluir o usuario." });
      return;
    }

    setUsers((current) => current.filter((item) => item.id !== user.id));
    setRoleDrafts((current) => {
      const next = { ...current };
      delete next[user.id];
      return next;
    });
    setFeedback({ type: "success", message: payload?.message || "Usuario excluido com sucesso." });
  }

  if (!sessionUser?.isSuperAdmin) {
    return (
      <section className={styles.dashboardSection}>
        <header className={styles.settingsHeader}>
          <h1>Permissoes e Acessos</h1>
          <p>Esta area e restrita aos super admins do sistema.</p>
        </header>
        <SectionEmptyState
          title="Acesso restrito"
          description="Entre com uma conta de super admin para revisar solicitacoes pendentes."
        />
      </section>
    );
  }

  return (
    <section className={styles.dashboardSection}>
      <header className={styles.sectionHeaderBar}>
        <div className={styles.settingsHeader}>
          <h1>Permissoes e Acessos</h1>
          <p>Revise as solicitacoes pendentes, ajuste cargos e acompanhe a base de usuarios do sistema.</p>
        </div>
        <PageAgentToggleButton agentId="access" open={agentOpen} onToggle={() => setAgentOpen((value) => !value)} />
      </header>

      {agentOpen ? (
        <div className={styles.grid}>
          <PageAgentPanel
            agentId="access"
            dashboardData={null}
            context={{ requests, users, sessionUser }}
          />
        </div>
      ) : null}

      {feedback.message ? <SectionNotice variant={feedback.type || "success"}>{feedback.message}</SectionNotice> : null}

      <div className={styles.grid}>
        <Card eyebrow="PENDENTES" title="Solicitacoes em aberto" wide className={requestsCardClassName}>
          {requestsError ? <SectionNotice variant="error">{requestsError}</SectionNotice> : null}
          {loading ? (
            <SectionLoadingState
              title="Carregando solicitacoes"
              description="Buscando pedidos abertos para aprovacao."
            />
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
            <SectionEmptyState
              title="Nenhuma solicitacao pendente"
              description="Quando um usuario solicitar acesso ou primeiro acesso, ele aparecera aqui."
            />
          )}
        </Card>

        <Card eyebrow="USUARIOS" title="Usuarios do sistema" wide>
          {usersError ? <SectionNotice variant="error">{usersError}</SectionNotice> : null}
          {usersLoading ? (
            <SectionLoadingState
              title="Carregando usuarios"
              description="Buscando usuarios cadastrados para revisar cargo e ultimo acesso."
            />
          ) : users.length ? (
            <div className={styles.systemUsersList}>
              <div className={styles.systemUsersHead}>
                <span>Usuario</span>
                <span>Status</span>
                <span>Cargo</span>
                <span>Ultima interacao</span>
                <span>Acoes</span>
              </div>

              {users.map((item) => {
                const draftRole = getRoleDraft(item);
                const pendingChange = hasPendingRoleChange(item);
                const canDeleteUser = !item.roleLocked && item.email !== sessionUser?.email;

                return (
                  <article key={item.id} className={styles.systemUserRow}>
                    <div className={styles.systemUserMeta}>
                      <strong>{item.name}</strong>
                      <span>{item.email}</span>
                    </div>

                    <div className={styles.systemUserStatus}>
                      <span className={`${styles.systemUserStatusBadge} ${item.status === "active" ? styles.systemUserStatusBadgeActive : ""}`.trim()}>
                        {item.statusLabel}
                      </span>
                    </div>

                    <label className={styles.systemUserRoleField}>
                      <select
                        className={styles.systemUserRoleSelect}
                        value={draftRole}
                        onChange={(event) => setRoleDrafts((current) => ({
                          ...current,
                          [item.id]: event.target.value,
                        }))}
                        disabled={item.roleLocked || busyUserId === item.id}
                      >
                        {roleOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                      {item.roleLocked ? <small>Admin fixo</small> : null}
                    </label>

                    <div className={styles.systemUserInteraction}>
                      <strong>{formatLastInteraction(item.lastInteractionAt)}</strong>
                      <span>{item.lastInteractionAt ? "Ultimo acesso" : "Sem interacao registrada"}</span>
                    </div>

                    <div className={styles.systemUserActions}>
                      {pendingChange ? (
                        <>
                          <button
                            type="button"
                            className={styles.dangerActionButton}
                            onClick={() => handleRoleCancel(item)}
                            disabled={busyUserId === item.id}
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            className={styles.primaryActionButton}
                            onClick={() => handleRoleSave(item)}
                            disabled={busyUserId === item.id}
                          >
                            {busyUserId === item.id ? "Salvando..." : "Salvar"}
                          </button>
                        </>
                      ) : canDeleteUser ? (
                        <button
                          type="button"
                          className={styles.dangerActionButton}
                          onClick={() => handleUserDelete(item)}
                          disabled={busyUserId === item.id}
                        >
                          {busyUserId === item.id ? "Excluindo..." : "Excluir"}
                        </button>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <SectionEmptyState
              title="Nenhum usuario encontrado"
              description="Quando houver usuarios cadastrados no sistema, eles aparecerao aqui para gestao de cargo."
            />
          )}
        </Card>

        <Card eyebrow="PERMISSOES" title="Permissoes por cargo" wide>
          <Table head={["Cargo", "Acesso"]} rows={permissionRows} />
        </Card>
      </div>
    </section>
  );
}
