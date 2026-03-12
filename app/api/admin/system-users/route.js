import { NextResponse } from "next/server";
import { jsonWithApiObservation, startApiObservation } from "lib/api-observability.js";
import { requireSuperAdmin } from "lib/admin-access";
import { writeAuditLog, writeSystemEvent } from "lib/audit-log-store";
import { consumeRateLimit, getRequestClientKey } from "lib/auth-rate-limit";
import { logAuthRouteError, logRateLimitEvent } from "lib/auth-logging";
import {
  listSystemUsers,
  MANAGED_ROLE_OPTIONS,
  saveSystemUserRole,
} from "lib/system-users";

export async function GET(request) {
  const observation = startApiObservation(request, "api/admin/system-users");
  const auth = await requireSuperAdmin({
    route: "api/admin/system-users",
    action: "list-system-users",
  });
  if (!auth.ok) {
    return jsonWithApiObservation(observation, { ok: false, error: auth.error }, { status: auth.status });
  }

  const clientKey = getRequestClientKey(request);
  const rateLimit = await consumeRateLimit({
    scope: "admin-system-users-list",
    bucket: `${clientKey}:${auth.user.email}`,
    limit: 20,
    windowMs: 60 * 1000,
  });

  if (!rateLimit.ok) {
    logRateLimitEvent("api/admin/system-users", "admin-system-users-list", {
      actorEmail: auth.user.email,
      clientKey,
      retryAfter: rateLimit.retryAfter,
    });
    return jsonWithApiObservation(
      observation,
      { ok: false, error: "Muitas consultas de usuarios. Aguarde alguns instantes." },
      { status: 429 },
      { actorEmail: auth.user.email, clientKey, actorUserId: auth.user.id, actorRole: auth.user.role },
    );
  }

  try {
    const users = await listSystemUsers();
    return jsonWithApiObservation(
      observation,
      {
        ok: true,
        users,
        roleOptions: MANAGED_ROLE_OPTIONS,
      },
      undefined,
      { actorEmail: auth.user.email, clientKey, actorUserId: auth.user.id, actorRole: auth.user.role },
    );
  } catch (error) {
    logAuthRouteError("api/admin/system-users", "list-users", error, {
      actorEmail: auth.user.email,
    });

    const message = error instanceof Error ? error.message : "";

    return jsonWithApiObservation(
      observation,
      {
        ok: false,
        error: message === "SUPABASE_ADMIN_UNAVAILABLE"
          ? "O modo admin do Supabase nao esta configurado para listar usuarios."
          : "Nao foi possivel carregar os usuarios do sistema.",
      },
      { status: 503 },
      { actorEmail: auth.user.email, clientKey, actorUserId: auth.user.id, actorRole: auth.user.role },
    );
  }
}

export async function POST(request) {
  const observation = startApiObservation(request, "api/admin/system-users");
  const auth = await requireSuperAdmin({
    route: "api/admin/system-users",
    action: "save-system-user-role",
  });
  if (!auth.ok) {
    return jsonWithApiObservation(observation, { ok: false, error: auth.error }, { status: auth.status });
  }

  const clientKey = getRequestClientKey(request);
  const rateLimit = await consumeRateLimit({
    scope: "admin-system-users-save",
    bucket: `${clientKey}:${auth.user.email}`,
    limit: 12,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.ok) {
    logRateLimitEvent("api/admin/system-users", "admin-system-users-save", {
      actorEmail: auth.user.email,
      clientKey,
      retryAfter: rateLimit.retryAfter,
    });
    return jsonWithApiObservation(
      observation,
      { ok: false, error: "Muitas alteracoes de cargo em pouco tempo. Aguarde alguns minutos." },
      { status: 429 },
      { actorEmail: auth.user.email, clientKey, actorUserId: auth.user.id, actorRole: auth.user.role },
    );
  }

  const body = await request.json().catch(() => null);
  const userId = String(body?.userId || "");
  const email = String(body?.email || "");
  const role = String(body?.role || "");

  if (!userId || !email || !role) {
    return jsonWithApiObservation(
      observation,
      { ok: false, error: "Informe o usuario, email e cargo desejado." },
      { status: 400 },
      { actorEmail: auth.user.email, clientKey, actorUserId: auth.user.id, actorRole: auth.user.role },
    );
  }

  try {
    const savedRole = await saveSystemUserRole({
      userId,
      email,
      role,
    });
    await writeAuditLog({
      actorUserId: auth.user.id,
      actorEmail: auth.user.email,
      actorRole: auth.user.role,
      action: "system_user.role_updated",
      entityType: "user_role",
      entityId: userId,
      route: "api/admin/system-users",
      details: {
        targetEmail: email,
        role,
      },
    }).catch(() => null);

    await writeSystemEvent({
      event: "system_user.role_updated",
      level: "info",
      route: "api/admin/system-users",
      actorUserId: auth.user.id,
      actorEmail: auth.user.email,
      actorRole: auth.user.role,
      message: `Cargo de ${email} atualizado para ${role}.`,
      meta: {
        targetUserId: userId,
        targetEmail: email,
        role,
      },
    }).catch(() => null);

    return jsonWithApiObservation(
      observation,
      {
        ok: true,
        message: "Cargo atualizado com sucesso.",
        user: savedRole,
      },
      undefined,
      { actorEmail: auth.user.email, clientKey, actorUserId: auth.user.id, actorRole: auth.user.role },
    );
  } catch (error) {
    logAuthRouteError("api/admin/system-users", "save-role", error, {
      actorEmail: auth.user.email,
      targetEmail: email,
      userId,
      role,
    });

    const message = error instanceof Error ? error.message : "Nao foi possivel atualizar o cargo.";
    const status = message === "SYSTEM_USER_ROLE_LOCKED" || message === "SYSTEM_USER_ROLE_INVALID" || message === "SYSTEM_USER_INVALID"
      ? 400
      : 503;

    const errorMessage = message === "SUPABASE_ADMIN_UNAVAILABLE"
      ? "O modo admin do Supabase nao esta configurado para atualizar cargos."
      : message === "SYSTEM_USER_ROLE_LOCKED"
      ? "Esse usuario tem cargo Admin fixo e nao pode ser alterado por aqui."
      : message === "SYSTEM_USER_ROLE_INVALID"
        ? "Selecione um cargo valido para continuar."
        : message === "SYSTEM_USER_INVALID"
          ? "Nao foi possivel identificar esse usuario."
          : "Nao foi possivel atualizar o cargo do usuario.";

    return jsonWithApiObservation(
      observation,
      { ok: false, error: errorMessage },
      { status },
      { actorEmail: auth.user.email, clientKey, actorUserId: auth.user.id, actorRole: auth.user.role },
    );
  }
}
