import { buildDashboardDomainPayload } from "./dashboard-domain";
import { writeSystemEvent } from "./audit-log-store";
import { logSecurityEvent } from "./auth-logging";
import { getAppEnvironment, getHubSpotToken, getHubSpotTokenSource } from "./hubspot-runtime";
import { PRIMARY_CAMPAIGN_CONTACT_VALUE } from "./services/dashboard-campaigns";

const HUBSPOT_BASE_URL = "https://api.hubapi.com";
const HUBSPOT_MAX_ATTEMPTS = 3;
const HUBSPOT_BASE_BACKOFF_MS = 400;
const HUBSPOT_MAX_CONCURRENT_REQUESTS = 4;
const HUBSPOT_CACHE_TTL_MS = 60 * 1000;
let activeHubSpotRequests = 0;
const hubSpotRequestQueue = [];
const hubSpotDashboardCache = new Map();

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

async function acquireHubSpotRequestSlot() {
  if (activeHubSpotRequests < HUBSPOT_MAX_CONCURRENT_REQUESTS) {
    activeHubSpotRequests += 1;
    return;
  }

  await new Promise((resolve) => {
    hubSpotRequestQueue.push(resolve);
  });
  activeHubSpotRequests += 1;
}

function releaseHubSpotRequestSlot() {
  activeHubSpotRequests = Math.max(0, activeHubSpotRequests - 1);
  const next = hubSpotRequestQueue.shift();
  if (next) {
    next();
  }
}

function normalizePipelineId(value) {
  return String(value || "").trim();
}

function normalizeOwnerFilter(value) {
  return String(value || "").trim();
}

function normalizeActivityWeeksFilter(value) {
  const parsed = Number.parseInt(String(value || "1"), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return "";
  }

  return String(parsed);
}

function getHubSpotCacheKey(scope, options = {}) {
  const normalizedPipelineId = normalizePipelineId(options.pipelineId);
  const normalizedOwnerFilter = normalizeOwnerFilter(options.ownerFilter);
  const normalizedActivityWeeks = normalizeActivityWeeksFilter(options.activityWeeksFilter);
  const parts = [getAppEnvironment(), getHubSpotTokenSource(), scope];

  if (normalizedPipelineId) {
    parts.push(`pipeline=${normalizedPipelineId}`);
  }

  if (normalizedOwnerFilter) {
    parts.push(`owner=${normalizedOwnerFilter}`);
  }

  if (normalizedActivityWeeks) {
    parts.push(`activityWeeks=${normalizedActivityWeeks}`);
  }

  return parts.join(":");
}

function readHubSpotDashboardCache(scope, options = {}) {
  const entry = hubSpotDashboardCache.get(getHubSpotCacheKey(scope, options));
  if (!entry) {
    return null;
  }

  if (entry.data && entry.expiresAt > Date.now()) {
    return entry.data;
  }

  if (!entry.promise) {
    hubSpotDashboardCache.delete(getHubSpotCacheKey(scope, options));
  }

  return null;
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
    await acquireHubSpotRequestSlot();

    let response;
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

async function fetchPagedCollection(path, options = {}) {
  const results = [];
  let after = "";
  let pageCount = 0;
  const maxPages = Number.isFinite(options.maxPages) ? Number(options.maxPages) : 10;
  const maxRecords = Number.isFinite(options.maxRecords) ? Number(options.maxRecords) : 200;

  while (true) {
    const separator = path.includes("?") ? "&" : "?";
    const url = after ? `${path}${separator}after=${after}` : path;
    const payload = await hubspotFetch(url, {
      operation: "fetch-paged-collection",
    });
    pageCount += 1;

    results.push(...(payload.results || []));

    if (results.length >= maxRecords || pageCount >= maxPages) {
      break;
    }

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

async function fetchSearchedCollection(path, body, options = {}) {
  const results = [];
  let after = undefined;
  let pageCount = 0;
  const maxPages = Number.isFinite(options.maxPages) ? Number(options.maxPages) : 10;
  const maxRecords = Number.isFinite(options.maxRecords) ? Number(options.maxRecords) : 200;

  while (true) {
    const payload = await hubspotFetch(path, {
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

async function fetchOptionalPagedCollection(path, options = {}) {
  try {
    return await fetchPagedCollection(path, options);
  } catch {
    return [];
  }
}

const HUBSPOT_DEAL_BASE_PROPERTIES = [
  "dealname",
  "amount",
  "dealstage",
  "pipeline",
  "hubspot_owner_id",
  "closedate",
  "createdate",
  "hs_lastmodifieddate",
];

const HUBSPOT_CAMPAIGN_PROPERTIES = [
  "campanhas",
  "utm_campaign",
  "campaign_name",
  "campanha",
  "campaign_code",
  "hs_campaign",
  "hs_marketing_campaign",
  "hs_analytics_source_data_1",
  "hs_analytics_source_data_2",
];

const HUBSPOT_CONTACT_BASE_PROPERTIES = [
  "firstname",
  "lastname",
  "email",
  "lifecyclestage",
  "hs_lead_status",
  "hubspot_owner_id",
  "createdate",
  "lastmodifieddate",
];

const HUBSPOT_TASK_BASE_PROPERTIES = [
  "hs_task_subject",
  "hs_task_body",
  "hs_task_status",
  "hs_task_priority",
  "hs_task_type",
  "hubspot_owner_id",
  "hs_timestamp",
  "createdate",
  "hs_lastmodifieddate",
];

const HUBSPOT_CALL_BASE_PROPERTIES = [
  "hs_call_title",
  "hs_call_body",
  "hs_call_status",
  "hs_call_direction",
  "hubspot_owner_id",
  "hs_timestamp",
  "createdate",
  "hs_lastmodifieddate",
];

const HUBSPOT_MEETING_BASE_PROPERTIES = [
  "hs_meeting_title",
  "hs_meeting_body",
  "hs_internal_meeting_notes",
  "hs_meeting_start_time",
  "hs_meeting_end_time",
  "hs_meeting_outcome",
  "hubspot_owner_id",
  "hs_timestamp",
  "createdate",
  "hs_lastmodifieddate",
];

const HUBSPOT_SCOPE_PLANS = {
  default: {
    owners: { maxPages: 2, maxRecords: 500 },
    deals: { includeCampaigns: true, includeContacts: true, maxPages: 2, maxRecords: 150 },
    contacts: { includeCampaigns: true, includeDeals: true, maxPages: 1, maxRecords: 80 },
    tasks: { includeCampaigns: true, includeAssociations: true, maxPages: 1, maxRecords: 60 },
    calls: { includeCampaigns: true, includeAssociations: true, maxPages: 1, maxRecords: 60 },
    meetings: { includeCampaigns: true, includeAssociations: true, maxPages: 1, maxRecords: 60 },
  },
  ai: {
    owners: { maxPages: 2, maxRecords: 500 },
    deals: { includeCampaigns: true, includeContacts: true, maxPages: 2, maxRecords: 120 },
    contacts: { includeCampaigns: true, includeDeals: true, maxPages: 1, maxRecords: 60 },
    tasks: { includeCampaigns: true, includeAssociations: true, maxPages: 1, maxRecords: 60 },
    calls: { includeCampaigns: true, includeAssociations: true, maxPages: 1, maxRecords: 60 },
    meetings: { includeCampaigns: true, includeAssociations: true, maxPages: 1, maxRecords: 60 },
  },
  reports: {
    owners: { maxPages: 2, maxRecords: 500 },
    deals: { includeCampaigns: false, includeContacts: false, maxPages: 1, maxRecords: 80 },
  },
  sellers: {
    owners: { maxPages: 2, maxRecords: 500 },
    deals: { includeCampaigns: false, includeContacts: false, maxPages: 2, maxRecords: 150 },
    meetings: { includeCampaigns: false, includeAssociations: false, maxPages: 1, maxRecords: 60 },
  },
  deals: {
    owners: { maxPages: 2, maxRecords: 500 },
    deals: { includeCampaigns: false, includeContacts: false, maxPages: 3, maxRecords: 240 },
    tasks: { includeCampaigns: false, includeAssociations: true, maxPages: 1, maxRecords: 80 },
    calls: { includeCampaigns: false, includeAssociations: true, maxPages: 1, maxRecords: 80 },
    meetings: { includeCampaigns: false, includeAssociations: true, maxPages: 1, maxRecords: 80 },
  },
  campaigns: {
    owners: { maxPages: 2, maxRecords: 500 },
    deals: { includeCampaigns: true, includeContacts: true, maxPages: 2, maxRecords: 120 },
    contacts: { includeCampaigns: true, includeDeals: true, maxPages: 5, maxRecords: 500 },
    tasks: { includeCampaigns: true, includeAssociations: true, maxPages: 1, maxRecords: 60 },
    calls: { includeCampaigns: true, includeAssociations: true, maxPages: 1, maxRecords: 60 },
    meetings: { includeCampaigns: true, includeAssociations: true, maxPages: 1, maxRecords: 60 },
  },
  tasks: {
    owners: { maxPages: 2, maxRecords: 500 },
    tasks: { includeCampaigns: false, includeAssociations: false, maxPages: 1, maxRecords: 80 },
    calls: { includeCampaigns: false, includeAssociations: false, maxPages: 1, maxRecords: 80 },
    meetings: { includeCampaigns: false, includeAssociations: false, maxPages: 1, maxRecords: 80 },
  },
  settings: {
    owners: { maxPages: 2, maxRecords: 500 },
    deals: { includeCampaigns: false, includeContacts: false, maxPages: 1, maxRecords: 40 },
  },
};

function joinProperties(properties = []) {
  return properties.filter(Boolean).join(",");
}

function getCollectionLimit(options = {}) {
  const requestedLimit = Number(options.maxRecords);
  if (Number.isFinite(requestedLimit) && requestedLimit > 0) {
    return Math.max(1, Math.min(100, requestedLimit));
  }

  return 100;
}

function getOwnerCollectionLimit(options = {}) {
  const requestedLimit = Number(options.maxRecords);
  if (Number.isFinite(requestedLimit) && requestedLimit > 0) {
    return Math.max(1, Math.min(500, requestedLimit));
  }

  return 500;
}

function buildOwnersPath(options = {}) {
  const limit = getOwnerCollectionLimit(options);
  return `/crm/v3/owners?limit=${limit}&archived=false`;
}

function buildDealsPath(options = {}) {
  const properties = [
    ...HUBSPOT_DEAL_BASE_PROPERTIES,
    ...(options.includeCampaigns ? HUBSPOT_CAMPAIGN_PROPERTIES : []),
  ];
  const associations = options.includeContacts ? "&associations=contacts" : "";
  const limit = getCollectionLimit(options);
  return `/crm/v3/objects/deals?limit=${limit}&archived=false${associations}&properties=${joinProperties(properties)}`;
}

function buildDealSearchBody({ pipelineId, ownerId, activityWeeksFilter, options = {} }) {
  const properties = [
    ...HUBSPOT_DEAL_BASE_PROPERTIES,
    ...(options.includeCampaigns ? HUBSPOT_CAMPAIGN_PROPERTIES : []),
  ];
  const filters = [];

  if (pipelineId) {
    filters.push({
      propertyName: "pipeline",
      operator: "EQ",
      value: pipelineId,
    });
  }

  if (ownerId) {
    filters.push({
      propertyName: "hubspot_owner_id",
      operator: "EQ",
      value: ownerId,
    });
  }

  const parsedActivityWeeks = Number.parseInt(String(activityWeeksFilter || ""), 10);
  if (Number.isFinite(parsedActivityWeeks) && parsedActivityWeeks > 0) {
    filters.push({
      propertyName: "hs_lastmodifieddate",
      operator: "GTE",
      value: String(Date.now() - (parsedActivityWeeks * 7 * 24 * 60 * 60 * 1000)),
    });
  }

  return {
    limit: getCollectionLimit(options),
    properties,
    filterGroups: filters.length ? [{ filters }] : [],
    sorts: [{
      propertyName: "hs_lastmodifieddate",
      direction: "DESCENDING",
    }],
  };
}

function buildContactsPath(options = {}) {
  const properties = [
    ...HUBSPOT_CONTACT_BASE_PROPERTIES,
    ...(options.includeCampaigns ? HUBSPOT_CAMPAIGN_PROPERTIES : []),
  ];
  const associations = options.includeDeals ? "&associations=deals" : "";
  const limit = getCollectionLimit(options);
  return `/crm/v3/objects/contacts?limit=${limit}&archived=false${associations}&properties=${joinProperties(properties)}`;
}

function buildCampaignContactsSearchBody(options = {}) {
  const properties = [
    ...HUBSPOT_CONTACT_BASE_PROPERTIES,
    ...(options.includeCampaigns ? HUBSPOT_CAMPAIGN_PROPERTIES : []),
  ];

  return {
    limit: getCollectionLimit(options),
    properties,
    filterGroups: [{
      filters: [{
        propertyName: "campanhas",
        operator: "EQ",
        value: PRIMARY_CAMPAIGN_CONTACT_VALUE,
      }],
    }],
    sorts: [{
      propertyName: "lastmodifieddate",
      direction: "DESCENDING",
    }],
  };
}

function buildActivityPath(objectType, baseProperties, options = {}) {
  const properties = [
    ...baseProperties,
    ...(options.includeCampaigns ? HUBSPOT_CAMPAIGN_PROPERTIES : []),
  ];
  const associations = options.includeAssociations ? "&associations=contacts,deals" : "";
  const limit = getCollectionLimit(options);
  return `/crm/v3/objects/${objectType}?limit=${limit}&archived=false${associations}&properties=${joinProperties(properties)}`;
}

function getDashboardScopePlan(scope = "default") {
  return HUBSPOT_SCOPE_PLANS[scope] || HUBSPOT_SCOPE_PLANS.default;
}

function resolveSelectedPipelineId(pipelines = [], requestedPipelineId = "") {
  const normalizedPipelineId = normalizePipelineId(requestedPipelineId);
  if (normalizedPipelineId && pipelines.some((pipeline) => pipeline?.id === normalizedPipelineId)) {
    return normalizedPipelineId;
  }

  const preferredPipeline = pipelines.find((pipeline) => String(pipeline?.label || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim() === "brasil publico");

  return preferredPipeline?.id || String(pipelines[0]?.id || "").trim();
}

async function fetchDealPipelines() {
  const payload = await hubspotFetch("/crm/v3/pipelines/deals", {
    operation: "fetch-deal-pipelines",
  });

  if (Array.isArray(payload?.results)) {
    return payload.results;
  }

  return Array.isArray(payload?.pipelines) ? payload.pipelines : [];
}

export async function getHubSpotDashboardData(options = {}) {
  const scope = String(options.scope || "default").trim().toLowerCase();
  const requestedPipelineId = normalizePipelineId(options.pipelineId);
  const requestedOwnerFilter = normalizeOwnerFilter(options.ownerFilter);
  const requestedActivityWeeksFilter = normalizeActivityWeeksFilter(options.activityWeeksFilter);
  const cachedData = readHubSpotDashboardCache(scope, {
    pipelineId: requestedPipelineId,
    ownerFilter: requestedOwnerFilter,
    activityWeeksFilter: requestedActivityWeeksFilter,
  });
  if (cachedData) {
    return cachedData;
  }

  const cacheKey = getHubSpotCacheKey(scope, {
    pipelineId: requestedPipelineId,
    ownerFilter: requestedOwnerFilter,
    activityWeeksFilter: requestedActivityWeeksFilter,
  });
  const currentCacheEntry = hubSpotDashboardCache.get(cacheKey);
  if (currentCacheEntry?.promise) {
    return currentCacheEntry.promise;
  }

  const plan = getDashboardScopePlan(scope);
  const loadPromise = (async () => {
    const requests = [];

    if (plan.owners) {
      requests.push(fetchPagedCollection(buildOwnersPath(plan.owners), plan.owners));
    } else {
      requests.push(Promise.resolve([]));
    }

    if (plan.deals) {
      requests.push(fetchDealPipelines().catch(() => []));
    } else {
      requests.push(Promise.resolve([]));
    }

    if (plan.deals && scope !== "deals") {
      requests.push(fetchPagedCollection(buildDealsPath(plan.deals), plan.deals));
    } else {
      requests.push(Promise.resolve([]));
    }

    if (plan.contacts) {
      requests.push(
        scope === "campaigns"
          ? fetchSearchedCollection(
            "/crm/v3/objects/contacts/search",
            buildCampaignContactsSearchBody(plan.contacts),
            plan.contacts,
          ).catch(() => [])
          : fetchOptionalPagedCollection(buildContactsPath(plan.contacts), plan.contacts),
      );
    } else {
      requests.push(Promise.resolve([]));
    }

    if (plan.tasks) {
      requests.push(fetchOptionalPagedCollection(buildActivityPath("tasks", HUBSPOT_TASK_BASE_PROPERTIES, plan.tasks), plan.tasks));
    } else {
      requests.push(Promise.resolve([]));
    }

    if (plan.calls) {
      requests.push(fetchOptionalPagedCollection(buildActivityPath("calls", HUBSPOT_CALL_BASE_PROPERTIES, plan.calls), plan.calls));
    } else {
      requests.push(Promise.resolve([]));
    }

    if (plan.meetings) {
      requests.push(fetchOptionalPagedCollection(buildActivityPath("meetings", HUBSPOT_MEETING_BASE_PROPERTIES, plan.meetings), plan.meetings));
    } else {
      requests.push(Promise.resolve([]));
    }

    const [owners, pipelines, initialDeals, contacts, tasks, calls, meetings] = await Promise.all(requests);
    const selectedPipelineId = scope === "deals"
      ? resolveSelectedPipelineId(pipelines, requestedPipelineId)
      : "";
    const selectedOwnerId = scope === "deals" && requestedOwnerFilter && requestedOwnerFilter !== "todos"
      ? String(
        owners.find((owner) =>
          String(owner?.firstName || owner?.lastName
            ? `${owner.firstName || ""} ${owner.lastName || ""}`.trim()
            : owner?.email || "",
          ).trim() === requestedOwnerFilter)?.id || "",
      ).trim()
      : "";
    const deals = scope === "deals" && plan.deals
      ? (selectedPipelineId
        ? await fetchSearchedCollection(
          "/crm/v3/objects/deals/search",
          buildDealSearchBody({
            pipelineId: selectedPipelineId,
            ownerId: selectedOwnerId,
            activityWeeksFilter: requestedActivityWeeksFilter,
            options: plan.deals,
          }),
          plan.deals,
        )
        : [])
      : initialDeals;

    const dashboardData = buildDashboardDomainPayload(owners, deals, {
      contacts,
      tasks,
      calls,
      meetings,
    }, pipelines);

    hubSpotDashboardCache.set(cacheKey, {
      data: dashboardData,
      expiresAt: Date.now() + HUBSPOT_CACHE_TTL_MS,
      promise: null,
    });

    return dashboardData;
  })().catch((error) => {
    hubSpotDashboardCache.delete(cacheKey);
    throw error;
  });

  hubSpotDashboardCache.set(cacheKey, {
    data: null,
    expiresAt: 0,
    promise: loadPromise,
  });

  return loadPromise;
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
