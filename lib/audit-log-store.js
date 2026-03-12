import { createAdminClient } from "./supabase/admin";
import { hasSupabaseAdminEnv } from "./supabase/shared";

const AUDIT_LOGS_TABLE = "audit_logs";
const SYSTEM_EVENTS_TABLE = "system_events";

function normalizeText(value, fallback = "") {
  const normalized = String(value || "").trim();
  return normalized || fallback;
}

function normalizeJson(value) {
  if (value == null) {
    return {};
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeJson(item));
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
    };
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [key, normalizeJson(entryValue)]),
    );
  }

  return value;
}

async function insertRecord(table, payload) {
  if (!hasSupabaseAdminEnv()) {
    return null;
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from(table).insert(payload);
  if (error) {
    throw error;
  }

  return payload;
}

export async function writeAuditLog({
  actorUserId = "",
  actorEmail = "",
  actorRole = "",
  action = "",
  entityType = "",
  entityId = "",
  status = "success",
  route = "",
  details = {},
} = {}) {
  if (!action || !entityType) {
    return null;
  }

  return insertRecord(AUDIT_LOGS_TABLE, {
    actor_user_id: normalizeText(actorUserId) || null,
    actor_email: normalizeText(actorEmail),
    actor_role: normalizeText(actorRole),
    action: normalizeText(action),
    entity_type: normalizeText(entityType),
    entity_id: normalizeText(entityId),
    status: normalizeText(status, "success"),
    route: normalizeText(route),
    details: normalizeJson(details),
  });
}

export async function writeSystemEvent({
  event = "",
  level = "info",
  route = "",
  actorUserId = "",
  actorEmail = "",
  actorRole = "",
  requestId = "",
  clientKey = "",
  message = "",
  meta = {},
} = {}) {
  if (!event) {
    return null;
  }

  return insertRecord(SYSTEM_EVENTS_TABLE, {
    event: normalizeText(event),
    level: normalizeText(level, "info"),
    route: normalizeText(route),
    actor_user_id: normalizeText(actorUserId) || null,
    actor_email: normalizeText(actorEmail),
    actor_role: normalizeText(actorRole),
    request_id: normalizeText(requestId),
    client_key: normalizeText(clientKey),
    message: normalizeText(message),
    meta: normalizeJson(meta),
  });
}
