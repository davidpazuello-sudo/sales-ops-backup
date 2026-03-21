import { writeSystemEvent } from "../audit-log-store";
import { logSecurityEvent } from "../auth-logging";
import { getAppEnvironment, getHubSpotToken, getHubSpotTokenSource } from "../hubspot-runtime";
import type { HubSpotFetchInit, HubSpotCollectionOptions, HubSpotPagedResponse } from "../types/hubspot";

export const HUBSPOT_BASE_URL: string = "https://api.hubapi.com";
const HUBSPOT_MAX_ATTEMPTS: number = 3;
const HUBSPOT_BASE_BACKOFF_MS: number = 400;
const HUBSPOT_MAX_CONCURRENT_REQUESTS: number = 4;

let activeHubSpotRequests: number = 0;
const hubSpotRequestQueue: Array<() => void> = [];

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function sanitizeHubSpotPath(path: string): string {
  return String(path || "").split("?")[0];
}

export function shouldRetryHubSpotRequest(status: number): boolean {
  return status === 429 || status >= 500;
}

export function parseRetryAfterMs(response: Response): number {
  const retryAfter = response.headers.get("retry-after");
  const retryAfterSeconds = Number(retryAfter || 0);
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return retryAfterSeconds * 1000;
  }
  return 0;
}

export function computeHubSpotBackoffMs(attempt: number, response: Response): number {
  const retryAfterMs = parseRetryAfterMs(response);
  if (retryAfterMs > 0) { return retryAfterMs; }
  const exponential = HUBSPOT_BASE_BACKOFF_MS * (2 ** Math.max(0, attempt - 1));
  const jitter = Math.floor(Math.random() * 120);
  return exponential + jitter;
}

export async function acquireHubSpotRequestSlot(): Promise<void> {
  if (activeHubSpotRequests < HUBSPOT_MAX_CONCURRENT_REQUESTS) {
    activeHubSpotRequests += 1;
    return;
  }
  await new Promise<void>((resolve) => { hubSpotRequestQueue.push(resolve); });
  activeHubSpotRequests += 1;
}

export function releaseHubSpotRequestSlot(): void {
  activeHubSpotRequests = Math.max(0, activeHubSpotRequests - 1);
  const next = hubSpotRequestQueue.shift();
  if (next) { next(); }
}

export function logHubSpotObservation(level: string, event: string, meta: Record<string, unknown> = {}): void {
  logSecurityEvent(level, `hubspot.${event}`, {
    integration: "hubspot",
    environment: getAppEnvironment(),
    tokenSource: getHubSpotTokenSource(),
    ...meta,
  });
}


export async function hubspotFetch(path: string, init: HubSpotFetchInit = {}): Promise<any> {
  const token = getHubSpotToken();
  const operation = String(init.operation || "request");
  const sanitizedPath = sanitizeHubSpotPath(path);

  if (!token) {
    logHubSpotObservation("error", "token_missing", { operation, path: sanitizedPath });
    throw new Error("HUBSPOT_TOKEN_MISSING");
  }

  for (let attempt = 1; attempt <= HUBSPOT_MAX_ATTEMPTS; attempt += 1) {
    const startedAt = Date.now();
    await acquireHubSpotRequestSlot();

    let response: Response;
    try {
      response = await fetch(`${HUBSPOT_BASE_URL}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...(init.headers || {}),
        },
        cache: "no-store",
      });
    } finally {
      releaseHubSpotRequestSlot();
    }

    const durationMs = Math.max(0, Date.now() - startedAt);

    if (response.ok) {
      logHubSpotObservation("info", "request_completed", { operation, path: sanitizedPath, status: response.status, durationMs, attempt });
      return response.json();
    }

    const body = await response.text();
    const meta = { operation, path: sanitizedPath, status: response.status, durationMs, attempt, errorBody: body };

    if (shouldRetryHubSpotRequest(response.status) && attempt < HUBSPOT_MAX_ATTEMPTS) {
      const retryAfterMs = computeHubSpotBackoffMs(attempt, response);
      logHubSpotObservation("warn", "request_retry_scheduled", { ...meta, retryAfterMs });
      if (response.status === 429) {
        void writeSystemEvent({
          event: "hubspot.rate_limited",
          level: "warn",
          route: "lib/hubspot",
          message: `HubSpot rate limit em ${operation}. Retry em ${retryAfterMs}ms.`,
          meta: { ...meta, retryAfterMs },
        }).catch(() => null);
      }
      await wait(retryAfterMs);
      continue;
    }

    logHubSpotObservation(response.status >= 500 ? "error" : "warn", "request_failed", meta);
    void writeSystemEvent({
      event: "hubspot.request_failed",
      level: response.status >= 500 ? "error" : "warn",
      route: "lib/hubspot",
      message: `HubSpot falhou em ${operation} (${response.status}).`,
      meta,
    }).catch(() => null);

    throw new Error(`HUBSPOT_API_ERROR:${response.status}:${body}`);
  }
  throw new Error("HUBSPOT_API_ERROR:UNKNOWN");
}


export async function fetchPagedCollection(path: string, options: HubSpotCollectionOptions = {}): Promise<any[]> {
  const results: unknown[] = [];
  let after: string = "";
  let pageCount: number = 0;
  const maxPages = Number.isFinite(options.maxPages) ? Number(options.maxPages) : 10;
  const maxRecords = Number.isFinite(options.maxRecords) ? Number(options.maxRecords) : 200;

  while (true) {
    const separator = path.includes("?") ? "&" : "?";
    const url = after ? `${path}${separator}after=${after}` : path;
    const data: HubSpotPagedResponse = await hubspotFetch(url, { operation: options.operation || "fetch_paged_collection" });

    if (Array.isArray(data?.results)) {
      results.push(...data.results);
    }

    if (!data?.paging?.next?.after) {
      break;
    }

    after = data.paging.next.after;
    pageCount += 1;

    if (pageCount >= maxPages || results.length >= maxRecords) {
      break;
    }
  }

  return results.slice(0, maxRecords);
}


export async function fetchSearchedCollection(path: string, body: Record<string, unknown>, options: HubSpotCollectionOptions = {}): Promise<any[]> {
  const results: unknown[] = [];
  let after: string | undefined = undefined;
  let pageCount: number = 0;
  const maxPages = Number.isFinite(options.maxPages) ? Number(options.maxPages) : 10;
  const maxRecords = Number.isFinite(options.maxRecords) ? Number(options.maxRecords) : 200;

  while (true) {
    const payload: HubSpotPagedResponse = await hubspotFetch(path, {
      method: "POST",
      operation: "fetch-searched-collection",
      body: JSON.stringify({
        ...body,
        ...(after ? { after } : {}),
      }),
    });
    pageCount += 1;

    results.push(...(payload.results || []));

    if (results.length >= maxRecords || pageCount >= maxPages) {
      break;
    }

    after = payload.paging?.next?.after;
    if (!after) {
      break;
    }
  }

  logHubSpotObservation("info", "searched_collection_completed", {
    operation: "fetch-searched-collection",
    path: sanitizeHubSpotPath(path),
    resultCount: results.length,
    pageCount,
  });

  return results;
}


export async function fetchOptionalPagedCollection(path: string, options: HubSpotCollectionOptions = {}): Promise<any[]> {
  try {
    return await fetchPagedCollection(path, options);
  } catch {
    return [];
  }
}
