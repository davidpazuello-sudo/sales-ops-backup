import {
  buildLoginRedirectUrl,
  FIRST_ACCESS_MODE,
  isAlreadyRegisteredError,
  normalizeEmail,
} from "lib/auth-flows";
import { getSuperAdminEmails, hasSupabaseAdminEnv, normalizeAccessRole } from "lib/supabase/shared";
import { createAdminClient } from "lib/supabase/admin";
import { upsertUserRole } from "lib/user-roles";

const REQUESTS_TABLE = "access_requests";
const NOTIFICATIONS_TABLE = "admin_notifications";

function describeRequestType(type) {
  return type === "request-access" ? "solicitou acesso ao sistema" : "solicitou o primeiro acesso";
}

function mapRequestRecord(record) {
  if (!record) {
    return null;
  }

  return {
    id: record.id,
    email: record.email,
    type: record.type,
    status: record.status,
    requestedAt: record.requested_at,
    resolvedAt: record.resolved_at,
    resolvedByEmail: record.resolved_by_email || "",
    resolvedByName: record.resolved_by_name || "",
    lastError: record.last_error || "",
    requestedRole: normalizeAccessRole(record.requested_role, "Vendedor"),
  };
}

function mapNotificationRecord(record) {
  if (!record) {
    return null;
  }

  return {
    id: record.id,
    recipientEmail: record.recipient_email,
    requestId: record.request_id,
    read: Boolean(record.read),
    trash: Boolean(record.trash),
    resolvedAt: record.resolved_at,
    createdAt: record.created_at,
    title: record.title,
    tag: record.tag,
    body: record.body,
  };
}

function normalizeDatabaseError(error) {
  const message = String(error?.message || error || "Erro desconhecido.");

  if (
    message.includes(`relation "${REQUESTS_TABLE}" does not exist`)
    || message.includes(`relation "${NOTIFICATIONS_TABLE}" does not exist`)
  ) {
    return "As tabelas de Permissões e Acessos ainda nao foram criadas no Supabase.";
  }

  if (message.includes("row-level security")) {
    return "As politicas do Supabase para Permissões e Acessos ainda nao foram aplicadas.";
  }

  return message;
}

function assertAdminEnv() {
  if (!hasSupabaseAdminEnv()) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY nao configurada para Permissoes e Acessos.");
  }
}

function createAdminNotifications(requestRecord) {
  return getSuperAdminEmails().map((recipientEmail) => ({
    recipient_email: recipientEmail,
    request_id: requestRecord.id,
    read: false,
    trash: false,
    resolved_at: null,
    title: `${requestRecord.email} ${describeRequestType(requestRecord.type)}.`,
    tag: requestRecord.type === "request-access" ? "Solicitacao de acesso" : "Primeiro acesso",
    body: `A solicitacao de ${requestRecord.email} aguarda aprovacao de um admin.`,
  }));
}

async function updateRequestError(supabase, requestId, error) {
  await supabase
    .from(REQUESTS_TABLE)
    .update({ last_error: normalizeDatabaseError(error) })
    .eq("id", requestId)
    .eq("status", "pending");
}

async function resolveRequest(supabase, {
  requestId,
  decision,
  actorEmail,
  actorName,
  lastError = "",
}) {
  const resolvedAt = new Date().toISOString();
  const { data: requestRecord, error } = await supabase
    .from(REQUESTS_TABLE)
    .update({
      status: decision,
      resolved_at: resolvedAt,
      resolved_by_email: normalizeEmail(actorEmail),
      resolved_by_name: actorName || "",
      last_error: lastError,
    })
    .eq("id", requestId)
    .eq("status", "pending")
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(normalizeDatabaseError(error));
  }

  if (!requestRecord) {
    return null;
  }

  const { error: notificationError } = await supabase
    .from(NOTIFICATIONS_TABLE)
    .update({
      resolved_at: resolvedAt,
      read: true,
    })
    .eq("request_id", requestId)
    .is("resolved_at", null);

  if (notificationError) {
    throw new Error(normalizeDatabaseError(notificationError));
  }

  return mapRequestRecord(requestRecord);
}

export async function queueAccessRequest({ email, type }) {
  assertAdminEnv();

  const normalizedEmail = normalizeEmail(email);
  const normalizedType = type === "request-access" ? "request-access" : "first-access";
  const supabase = createAdminClient();

  const { data: existingPending, error: existingError } = await supabase
    .from(REQUESTS_TABLE)
    .select("*")
    .eq("email", normalizedEmail)
    .eq("type", normalizedType)
    .eq("status", "pending")
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) {
    throw new Error(normalizeDatabaseError(existingError));
  }

  if (existingPending) {
    return {
      request: mapRequestRecord(existingPending),
      created: false,
    };
  }

  const { data: requestRecord, error: insertError } = await supabase
    .from(REQUESTS_TABLE)
    .insert({
      email: normalizedEmail,
      type: normalizedType,
      status: "pending",
      requested_role: "Vendedor",
    })
    .select()
    .single();

  if (insertError) {
    throw new Error(normalizeDatabaseError(insertError));
  }

  const notifications = createAdminNotifications(requestRecord);
  if (notifications.length) {
    const { error: notificationError } = await supabase
      .from(NOTIFICATIONS_TABLE)
      .insert(notifications);

    if (notificationError) {
      throw new Error(normalizeDatabaseError(notificationError));
    }
  }

  return {
    request: mapRequestRecord(requestRecord),
    created: true,
  };
}

export async function listPendingAccessRequests() {
  assertAdminEnv();

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from(REQUESTS_TABLE)
    .select("*")
    .eq("status", "pending")
    .order("requested_at", { ascending: false });

  if (error) {
    throw new Error(normalizeDatabaseError(error));
  }

  return Array.isArray(data) ? data.map(mapRequestRecord) : [];
}

export async function listNotificationsForUser(email) {
  assertAdminEnv();

  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return [];
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from(NOTIFICATIONS_TABLE)
    .select("*")
    .eq("recipient_email", normalizedEmail)
    .is("resolved_at", null)
    .eq("trash", false)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(normalizeDatabaseError(error));
  }

  return Array.isArray(data) ? data.map(mapNotificationRecord) : [];
}

export async function rejectAccessRequest({ requestId, actorEmail, actorName }) {
  assertAdminEnv();
  const supabase = createAdminClient();
  return resolveRequest(supabase, {
    requestId,
    decision: "rejected",
    actorEmail,
    actorName,
  });
}

export async function approveAccessRequest({
  requestId,
  actorEmail,
  actorName,
  request,
}) {
  assertAdminEnv();

  const supabase = createAdminClient();
  const { data: requestRecord, error: fetchError } = await supabase
    .from(REQUESTS_TABLE)
    .select("*")
    .eq("id", requestId)
    .eq("status", "pending")
    .maybeSingle();

  if (fetchError) {
    return {
      ok: false,
      error: normalizeDatabaseError(fetchError),
    };
  }

  if (!requestRecord) {
    return {
      ok: false,
      error: "Solicitacao nao encontrada ou ja resolvida.",
    };
  }

  try {
    const tempPassword = `SalesOps!${Math.random().toString(36).slice(2, 10)}A1`;
    const requestedRole = normalizeAccessRole(requestRecord.requested_role, "Vendedor");
    const { data: createdUser, error: createUserError } = await supabase.auth.admin.createUser({
      email: requestRecord.email,
      password: tempPassword,
      email_confirm: true,
      app_metadata: {
        role: requestedRole,
      },
      user_metadata: {
        role: requestedRole,
      },
    });

    if (createUserError && !isAlreadyRegisteredError(createUserError)) {
      throw createUserError;
    }

    const ensuredUserId = createdUser?.user?.id;
    if (ensuredUserId) {
      await upsertUserRole({
        userId: ensuredUserId,
        email: requestRecord.email,
        role: requestedRole,
      });
    }

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(requestRecord.email, {
      redirectTo: buildLoginRedirectUrl(request, FIRST_ACCESS_MODE),
    });

    if (resetError) {
      throw resetError;
    }

    const resolved = await resolveRequest(supabase, {
      requestId,
      decision: "approved",
      actorEmail,
      actorName,
    });

    return {
      ok: true,
      request: resolved,
    };
  } catch (error) {
    await updateRequestError(supabase, requestId, error);
    return {
      ok: false,
      error: normalizeDatabaseError(error),
    };
  }
}
