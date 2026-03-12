import { NextResponse } from "next/server";
import { logSecurityEvent } from "./auth-logging";

function buildFallbackRequestId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function getPathFromRequest(request) {
  try {
    return new URL(request.url).pathname;
  } catch {
    return "";
  }
}

export function startApiObservation(request, route, meta = {}) {
  const requestId = globalThis.crypto?.randomUUID?.() || buildFallbackRequestId();
  const context = {
    route,
    path: getPathFromRequest(request),
    method: String(request?.method || "GET").toUpperCase(),
    requestId,
    startedAt: Date.now(),
  };

  logSecurityEvent("info", "api.request_started", {
    route: context.route,
    path: context.path,
    method: context.method,
    requestId: context.requestId,
    ...meta,
  });

  return context;
}

export function finishApiObservation(observation, status, meta = {}) {
  const durationMs = Math.max(0, Date.now() - Number(observation?.startedAt || Date.now()));
  const numericStatus = Number(status || 200);
  const level = numericStatus >= 500 ? "error" : numericStatus >= 400 ? "warn" : "info";

  return logSecurityEvent(level, "api.request_completed", {
    route: observation?.route || "",
    path: observation?.path || "",
    method: observation?.method || "GET",
    requestId: observation?.requestId || "",
    status: numericStatus,
    durationMs,
    ...meta,
  });
}

export function jsonWithApiObservation(observation, body, init = {}, meta = {}) {
  const response = NextResponse.json(body, init);
  finishApiObservation(observation, response.status, meta);
  return response;
}
