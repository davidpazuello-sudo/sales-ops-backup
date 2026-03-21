// @ts-nocheck
import { createAdminClient } from "lib/supabase/admin";
import { hasSupabaseAdminEnv } from "lib/supabase/shared";

const RATE_LIMITS_TABLE = "auth_rate_limits";
const inMemoryBuckets = new Map();

function nowIso() {
  return new Date().toISOString();
}

function computeRetryAfter(windowStartedAt, windowMs) {
  const windowStart = new Date(windowStartedAt).getTime();
  const retryAfterMs = Math.max(0, windowStart + windowMs - Date.now());
  return Math.ceil(retryAfterMs / 1000);
}

function getMemoryRateLimit({ scope, bucket, limit, windowMs }) {
  const key = `${scope}:${bucket}`;
  const existing = inMemoryBuckets.get(key);
  const now = Date.now();

  if (!existing || now - existing.windowStartedAt >= windowMs) {
    inMemoryBuckets.set(key, { count: 1, windowStartedAt: now });
    return { ok: true, remaining: limit - 1, retryAfter: 0 };
  }

  if (existing.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfter: Math.ceil((existing.windowStartedAt + windowMs - now) / 1000),
    };
  }

  existing.count += 1;
  inMemoryBuckets.set(key, existing);
  return { ok: true, remaining: Math.max(0, limit - existing.count), retryAfter: 0 };
}

async function getSupabaseRateLimit({ scope, bucket, limit, windowMs }) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from(RATE_LIMITS_TABLE)
    .select("scope, bucket, attempt_count, window_started_at")
    .eq("scope", scope)
    .eq("bucket", bucket)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const currentWindowStartedAt = data?.window_started_at || nowIso();
  const currentWindowAge = Date.now() - new Date(currentWindowStartedAt).getTime();

  if (!data || currentWindowAge >= windowMs) {
    const { error: upsertError } = await supabase
      .from(RATE_LIMITS_TABLE)
      .upsert({
        scope,
        bucket,
        attempt_count: 1,
        window_started_at: nowIso(),
      }, {
        onConflict: "scope,bucket",
      });

    if (upsertError) {
      throw upsertError;
    }

    return { ok: true, remaining: limit - 1, retryAfter: 0 };
  }

  if ((data.attempt_count || 0) >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfter: computeRetryAfter(currentWindowStartedAt, windowMs),
    };
  }

  const nextCount = (data.attempt_count || 0) + 1;
  const { error: updateError } = await supabase
    .from(RATE_LIMITS_TABLE)
    .update({
      attempt_count: nextCount,
    })
    .eq("scope", scope)
    .eq("bucket", bucket);

  if (updateError) {
    throw updateError;
  }

  return { ok: true, remaining: Math.max(0, limit - nextCount), retryAfter: 0 };
}

export async function consumeRateLimit({ scope, bucket, limit, windowMs }) {
  if (!scope || !bucket) {
    return { ok: true, remaining: limit, retryAfter: 0 };
  }

  if (!hasSupabaseAdminEnv()) {
    return getMemoryRateLimit({ scope, bucket, limit, windowMs });
  }

  try {
    return await getSupabaseRateLimit({ scope, bucket, limit, windowMs });
  } catch {
    return getMemoryRateLimit({ scope, bucket, limit, windowMs });
  }
}

export function getRequestClientKey(request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ip = forwardedFor?.split(",")[0]?.trim() || realIp || "unknown";
  return ip;
}
