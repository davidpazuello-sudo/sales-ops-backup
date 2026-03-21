// @ts-nocheck
import { createAdminClient } from "lib/supabase/admin";
import { hasSupabaseAdminEnv } from "lib/supabase/shared";

const IDEMPOTENCY_TABLE = "idempotency_keys";
const inMemoryKeys = new Map();

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeJson(value) {
  if (value == null) {
    return {};
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeJson(item));
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [key, normalizeJson(entryValue)]),
    );
  }

  return value;
}

function nowMs() {
  return Date.now();
}

function buildMemoryKey(scope, key) {
  return `${scope}:${key}`;
}

function mapRecord(record) {
  if (!record) {
    return null;
  }

  return {
    scope: normalizeText(record.scope),
    key: normalizeText(record.idempotency_key || record.key),
    status: normalizeText(record.status || "pending"),
    responseStatus: Number(record.response_status || record.responseStatus || 0) || null,
    responseBody: record.response_body || record.responseBody || null,
    route: normalizeText(record.route),
    actorUserId: normalizeText(record.actor_user_id || record.actorUserId),
    actorEmail: normalizeText(record.actor_email || record.actorEmail),
    requestId: normalizeText(record.request_id || record.requestId),
    meta: normalizeJson(record.meta),
    expiresAt: normalizeText(record.expires_at || record.expiresAt),
  };
}

function reserveInMemoryKey({ scope, key, ttlSeconds, route = "", actorUserId = "", actorEmail = "", requestId = "", meta = {} }) {
  const storeKey = buildMemoryKey(scope, key);
  const existing = inMemoryKeys.get(storeKey);

  if (existing && existing.expiresAtMs > nowMs()) {
    return { ok: false, record: mapRecord(existing) };
  }

  const nextRecord = {
    scope,
    key,
    status: "pending",
    route,
    actorUserId,
    actorEmail,
    requestId,
    meta: normalizeJson(meta),
    expiresAtMs: nowMs() + (ttlSeconds * 1000),
    expiresAt: new Date(nowMs() + (ttlSeconds * 1000)).toISOString(),
    responseStatus: null,
    responseBody: null,
  };

  inMemoryKeys.set(storeKey, nextRecord);
  return { ok: true, record: mapRecord(nextRecord) };
}

function finalizeInMemoryKey({ scope, key, status, responseStatus = 200, responseBody = null, meta = {}, ttlSeconds = 600 }) {
  const storeKey = buildMemoryKey(scope, key);
  const existing = inMemoryKeys.get(storeKey) || {};
  const nextRecord = {
    ...existing,
    scope,
    key,
    status,
    responseStatus,
    responseBody: normalizeJson(responseBody),
    meta: normalizeJson(meta),
    expiresAtMs: nowMs() + (ttlSeconds * 1000),
    expiresAt: new Date(nowMs() + (ttlSeconds * 1000)).toISOString(),
  };

  inMemoryKeys.set(storeKey, nextRecord);
  return mapRecord(nextRecord);
}

async function reserveSupabaseKey({ scope, key, ttlSeconds, route = "", actorUserId = "", actorEmail = "", requestId = "", meta = {} }) {
  const supabase = createAdminClient();
  const nowIso = new Date().toISOString();
  const expiresAt = new Date(nowMs() + (ttlSeconds * 1000)).toISOString();

  const { data: existing, error: readError } = await supabase
    .from(IDEMPOTENCY_TABLE)
    .select("scope, idempotency_key, status, response_status, response_body, route, actor_user_id, actor_email, request_id, meta, expires_at")
    .eq("scope", scope)
    .eq("idempotency_key", key)
    .gt("expires_at", nowIso)
    .maybeSingle();

  if (readError) {
    throw readError;
  }

  if (existing) {
    return { ok: false, record: mapRecord(existing) };
  }

  const { data, error } = await supabase
    .from(IDEMPOTENCY_TABLE)
    .insert({
      scope,
      idempotency_key: key,
      status: "pending",
      route,
      actor_user_id: normalizeText(actorUserId) || null,
      actor_email: normalizeText(actorEmail),
      request_id: normalizeText(requestId),
      meta: normalizeJson(meta),
      expires_at: expiresAt,
    })
    .select("scope, idempotency_key, status, response_status, response_body, route, actor_user_id, actor_email, request_id, meta, expires_at")
    .single();

  if (error && error.code !== "23505") {
    throw error;
  }

  if (data) {
    return { ok: true, record: mapRecord(data) };
  }

  const { data: afterConflict, error: conflictError } = await supabase
    .from(IDEMPOTENCY_TABLE)
    .select("scope, idempotency_key, status, response_status, response_body, route, actor_user_id, actor_email, request_id, meta, expires_at")
    .eq("scope", scope)
    .eq("idempotency_key", key)
    .gt("expires_at", nowIso)
    .maybeSingle();

  if (conflictError) {
    throw conflictError;
  }

  return { ok: false, record: mapRecord(afterConflict) };
}

async function finalizeSupabaseKey({ scope, key, status, responseStatus = 200, responseBody = null, meta = {}, ttlSeconds = 600 }) {
  const supabase = createAdminClient();
  const expiresAt = new Date(nowMs() + (ttlSeconds * 1000)).toISOString();
  const { data, error } = await supabase
    .from(IDEMPOTENCY_TABLE)
    .update({
      status,
      response_status: responseStatus,
      response_body: normalizeJson(responseBody),
      meta: normalizeJson(meta),
      expires_at: expiresAt,
    })
    .eq("scope", scope)
    .eq("idempotency_key", key)
    .select("scope, idempotency_key, status, response_status, response_body, route, actor_user_id, actor_email, request_id, meta, expires_at")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return mapRecord(data);
}

export async function reserveIdempotencyKey(options = {}) {
  const scope = normalizeText(options.scope);
  const key = normalizeText(options.key);

  if (!scope || !key) {
    return { ok: true, record: null };
  }

  const normalizedOptions = {
    ...options,
    scope,
    key,
    ttlSeconds: Number(options.ttlSeconds || 600),
  };

  if (!hasSupabaseAdminEnv()) {
    return reserveInMemoryKey(normalizedOptions);
  }

  try {
    return await reserveSupabaseKey(normalizedOptions);
  } catch {
    return reserveInMemoryKey(normalizedOptions);
  }
}

export async function finalizeIdempotencyKey(options = {}) {
  const scope = normalizeText(options.scope);
  const key = normalizeText(options.key);

  if (!scope || !key) {
    return null;
  }

  const normalizedOptions = {
    ...options,
    scope,
    key,
    ttlSeconds: Number(options.ttlSeconds || 600),
  };

  if (!hasSupabaseAdminEnv()) {
    return finalizeInMemoryKey(normalizedOptions);
  }

  try {
    return await finalizeSupabaseKey(normalizedOptions);
  } catch {
    return finalizeInMemoryKey(normalizedOptions);
  }
}
