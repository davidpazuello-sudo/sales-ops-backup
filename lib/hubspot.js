import { buildDashboardDomainPayload } from "./dashboard-domain";
import { writeSystemEvent } from "./audit-log-store";
import { logSecurityEvent } from "./auth-logging";
import { getAppEnvironment, getHubSpotToken, getHubSpotTokenSource } from "./hubspot-runtime";

const HUBSPOT_BASE_URL = "https://api.hubapi.com";
const HUBSPOT_MIN_INTERVAL_MS = 180;
const HUBSPOT_MAX_ATTEMPTS = 3;
const HUBSPOT_BASE_BACKOFF_MS = 400;
let lastHubSpotRequestAt = 0;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitizeHubSpotPath(path) {
  return String(path || "").split("?")[0];
}

function shouldRetryHubSpotRequest(status) {
  return status === 429 || status >= 500;
}

function parseRetryAfterMs(response) {
  const retryAfter = response.headers.get("retry-after");
  const retryAfterSeconds = Number(retryAfter || 0);

  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return retryAfterSeconds * 1000;
  }

  return 0;
}

function computeHubSpotBackoffMs(attempt, response) {
  const retryAfterMs = parseRetryAfterMs(response);
  if (retryAfterMs > 0) {
    return retryAfterMs;
  }

  const exponential = HUBSPOT_BASE_BACKOFF_MS * (2 ** Math.max(0, attempt - 1));
  const jitter = Math.floor(Math.random() * 120);
  return exponential + jitter;
}

async function waitForHubSpotBudget() {
  const now = Date.now();
  const elapsed = now - lastHubSpotRequestAt;

  if (elapsed < HUBSPOT_MIN_INTERVAL_MS) {
    await wait(HUBSPOT_MIN_INTERVAL_MS - elapsed);
  }

  lastHubSpotRequestAt = Date.now();
}

function logHubSpotObservation(level, event, meta = {}) {
  return logSecurityEvent(level, `hubspot.${event}`, {
    integration: "hubspot",
    environment: getAppEnvironment(),
    tokenSource: getHubSpotTokenSource(),
    ...meta,
  });
}

async function hubspotFetch(path, init = {}) {
  const token = getHubSpotToken();
  const operation = String(init.operation || "request");
  const sanitizedPath = sanitizeHubSpotPath(path);

  if (!token) {
    logHubSpotObservation("error", "token_missing", {
      operation,
      path: sanitizedPath,
    });
    throw new Error("HUBSPOT_TOKEN_MISSING");
  }

  for (let attempt = 1; attempt <= HUBSPOT_MAX_ATTEMPTS; attempt += 1) {
    const startedAt = Date.now();
    await waitForHubSpotBudget();

    const response = await fetch(`${HUBSPOT_BASE_URL}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(init.headers || {}),
      },
      cache: "no-store",
    });

    const durationMs = Math.max(0, Date.now() - startedAt);

    if (response.ok) {
      logHubSpotObservation("info", "request_completed", {
        operation,
        path: sanitizedPath,
        status: response.status,
        durationMs,
        attempt,
      });
      return response.json();
    }

    const body = await response.text();
    const meta = {
      operation,
      path: sanitizedPath,
      status: response.status,
      durationMs,
      attempt,
      errorBody: body,
    };

    if (shouldRetryHubSpotRequest(response.status) && attempt < HUBSPOT_MAX_ATTEMPTS) {
      const retryAfterMs = computeHubSpotBackoffMs(attempt, response);
      logHubSpotObservation("warn", "request_retry_scheduled", {
        ...meta,
        retryAfterMs,
      });

      if (response.status === 429) {
        void writeSystemEvent({
          event: "hubspot.rate_limited",
          level: "warn",
          route: "lib/hubspot",
          message: `HubSpot rate limit em ${operation}. Retry em ${retryAfterMs}ms.`,
          meta: {
            ...meta,
            retryAfterMs,
          },
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

async function fetchPagedCollection(path) {
  const results = [];
  let after = "";
  let pageCount = 0;

  while (true) {
    const separator = path.includes("?") ? "&" : "?";
    const url = after ? `${path}${separator}after=${after}` : path;
    const payload = await hubspotFetch(url, {
      operation: "fetch-paged-collection",
    });
    pageCount += 1;

    results.push(...(payload.results || []));

    after = payload.paging?.next?.after || "";
    if (!after) break;
  }

  logHubSpotObservation("info", "paged_collection_completed", {
    operation: "fetch-paged-collection",
    path: sanitizeHubSpotPath(path),
    resultCount: results.length,
    pageCount,
  });

  return results;
}

async function fetchOptionalPagedCollection(path) {
  try {
    return await fetchPagedCollection(path);
  } catch {
    return [];
  }
}

export async function getHubSpotDashboardData() {
  const [owners, deals, contacts, tasks, calls, meetings] = await Promise.all([
    fetchPagedCollection("/crm/v3/owners?limit=100&archived=false"),
    fetchPagedCollection("/crm/v3/objects/deals?limit=100&archived=false&associations=contacts&properties=dealname,amount,dealstage,pipeline,hubspot_owner_id,closedate,createdate,hs_lastmodifieddate,utm_campaign,campaign_name,campanha,campaign_code,hs_campaign,hs_marketing_campaign,hs_analytics_source_data_1,hs_analytics_source_data_2"),
    fetchOptionalPagedCollection("/crm/v3/objects/contacts?limit=100&archived=false&associations=deals&properties=firstname,lastname,email,lifecyclestage,hs_lead_status,hubspot_owner_id,createdate,lastmodifieddate,utm_campaign,campaign_name,campanha,campaign_code,hs_campaign,hs_marketing_campaign,hs_analytics_source_data_1,hs_analytics_source_data_2"),
    fetchOptionalPagedCollection("/crm/v3/objects/tasks?limit=100&archived=false&associations=contacts,deals&properties=hs_task_subject,hs_task_body,hs_task_status,hs_task_priority,hs_task_type,hubspot_owner_id,hs_timestamp,createdate,hs_lastmodifieddate,utm_campaign,campaign_name,campanha,campaign_code,hs_campaign,hs_marketing_campaign,hs_analytics_source_data_1,hs_analytics_source_data_2"),
    fetchOptionalPagedCollection("/crm/v3/objects/calls?limit=100&archived=false&associations=contacts,deals&properties=hs_call_title,hs_call_body,hs_call_status,hs_call_direction,hubspot_owner_id,hs_timestamp,createdate,hs_lastmodifieddate,utm_campaign,campaign_name,campanha,campaign_code,hs_campaign,hs_marketing_campaign,hs_analytics_source_data_1,hs_analytics_source_data_2"),
    fetchOptionalPagedCollection("/crm/v3/objects/meetings?limit=100&archived=false&associations=contacts,deals&properties=hs_meeting_title,hs_meeting_body,hs_internal_meeting_notes,hs_meeting_start_time,hs_meeting_end_time,hs_meeting_outcome,hubspot_owner_id,hs_timestamp,createdate,hs_lastmodifieddate,utm_campaign,campaign_name,campanha,campaign_code,hs_campaign,hs_marketing_campaign,hs_analytics_source_data_1,hs_analytics_source_data_2"),
  ]);

  return buildDashboardDomainPayload(owners, deals, {
    contacts,
    tasks,
    calls,
    meetings,
  });
}

export async function updateHubSpotDealStage({ dealId, stageId }) {
  const normalizedDealId = String(dealId || "").trim();
  const normalizedStageId = String(stageId || "").trim();

  if (!normalizedDealId || !normalizedStageId) {
    throw new Error("HUBSPOT_DEAL_STAGE_INVALID");
  }

  return hubspotFetch(`/crm/v3/objects/deals/${encodeURIComponent(normalizedDealId)}`, {
    method: "PATCH",
    operation: "update-deal-stage",
    body: JSON.stringify({
      properties: {
        dealstage: normalizedStageId,
      },
    }),
  });
}
