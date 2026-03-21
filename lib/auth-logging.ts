// @ts-nocheck
import { writeSystemEvent } from "./audit-log-store";

const SENSITIVE_KEY_PATTERN = /(authorization|cookie|password|secret|token|api[-_]?key|service[-_]?role|publishable[-_]?key|anon[-_]?key|code[-_]?verifier|otp|totp)/i;
const TOKEN_LIKE_PATTERN = /\b(gh[pousr]_[A-Za-z0-9_]+|vcp_[A-Za-z0-9_]+|sbp_[A-Za-z0-9_]+|sb_publishable_[A-Za-z0-9_]+|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9._-]+\.[A-Za-z0-9._-]+)\b/g;

function redactTokenLikeString(value) {
  return String(value || "").replace(TOKEN_LIKE_PATTERN, "[REDACTED]");
}

function isSensitiveKey(key) {
  return SENSITIVE_KEY_PATTERN.test(String(key || ""));
}

function sanitizeValue(value, key = "") {
  if (value == null) {
    return value;
  }

  if (isSensitiveKey(key)) {
    return "[REDACTED]";
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactTokenLikeString(value.message || "UNKNOWN_ERROR"),
      stack: redactTokenLikeString(value.stack || ""),
    };
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [entryKey, sanitizeValue(entryValue, entryKey)]),
    );
  }

  if (typeof value === "string") {
    return redactTokenLikeString(value);
  }

  return value;
}

function buildLogPayload(level, event, meta = {}) {
  return {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...sanitizeValue(meta),
  };
}

function writeStructuredLog(level, event, meta = {}) {
  const payload = buildLogPayload(level, event, meta);
  const consoleMethod = level === "error"
    ? console.error
    : level === "warn"
      ? console.warn
      : console.info;

  consoleMethod(JSON.stringify(payload));
  if (typeof window === "undefined") {
    void writeSystemEvent({
      event,
      level,
      route: String(payload.route || meta.route || ""),
      actorUserId: String(payload.actorUserId || meta.actorUserId || ""),
      actorEmail: String(payload.actorEmail || meta.actorEmail || ""),
      actorRole: String(payload.actorRole || meta.actorRole || ""),
      requestId: String(payload.requestId || meta.requestId || ""),
      clientKey: String(payload.clientKey || meta.clientKey || ""),
      message: typeof payload.error === "string"
        ? payload.error
        : String(payload.error?.message || ""),
      meta: payload,
    }).catch(() => null);
  }
  return payload;
}

export function sanitizeLogMeta(meta = {}) {
  return sanitizeValue(meta);
}

export function logSecurityEvent(level, event, meta = {}) {
  return writeStructuredLog(level, event, meta);
}

export function logAuthorizationFailure(route, auth, meta = {}) {
  return logSecurityEvent("warn", "auth.authorization_denied", {
    route,
    status: auth?.status || 403,
    error: auth?.error || "AUTHORIZATION_DENIED",
    actorEmail: auth?.user?.email || meta.actorEmail || "",
    actorRole: auth?.user?.role || meta.actorRole || "",
    ...meta,
  });
}

export function logAuthRouteError(route, stage, error, meta = {}) {
  return logSecurityEvent("error", "auth.route_error", {
    route,
    stage,
    error,
    ...meta,
  });
}

export function logRateLimitEvent(route, scope, meta = {}) {
  return logSecurityEvent("warn", "auth.rate_limited", {
    route,
    scope,
    ...meta,
  });
}
