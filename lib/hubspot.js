import { createDashboardFallbackData } from "./dashboard-fallback";
import { buildDashboardDomainPayload } from "./dashboard-domain";
import { writeSystemEvent } from "./audit-log-store";
import { logSecurityEvent } from "./auth-logging";
import { getAppEnvironment, getHubSpotToken, getHubSpotTokenSource } from "./hubspot-runtime";
import { extractCampaignLabel, PRIMARY_CAMPAIGN_CONTACT_VALUE } from "./services/dashboard-campaigns";

const HUBSPOT_BASE_URL = "https://api.hubapi.com";
const HUBSPOT_MAX_ATTEMPTS = 3;
const HUBSPOT_BASE_BACKOFF_MS = 400;
const HUBSPOT_MAX_CONCURRENT_REQUESTS = 4;
const HUBSPOT_CACHE_TTL_MS = 60 * 1000;
const HUBSPOT_CAMPAIGNS_CACHE_TTL_MS = 20 * 1000;
const HUBSPOT_SELLERS_PAGE_SIZE = 12;
const HUBSPOT_OWNER_FILTER_GROUP_SIZE = 5;
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

function normalizeSellerPage(value) {
  const parsed = Number.parseInt(String(value || "1").trim(), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return "1";
  }

  return String(parsed);
}

function normalizeSellerSearch(value) {
  return String(value || "").trim();
}

function normalizeCampaignDetailKey(value) {
  return String(value || "").trim();
}

function normalizeCampaignName(value) {
  return String(value || "").trim();
}

function normalizeCampaignOptionsOnly(value) {
  return value === true;
}

function normalizeComparable(value) {
  return String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getHubSpotOwnerDisplayName(owner) {
  return String(
    owner?.firstName || owner?.lastName
      ? `${owner.firstName || ""} ${owner.lastName || ""}`.trim()
      : owner?.email || "",
  ).trim();
}

function sortHubSpotOwnersAlphabetically(owners = []) {
  return [...owners].sort((left, right) =>
    getHubSpotOwnerDisplayName(left).localeCompare(getHubSpotOwnerDisplayName(right), "pt-BR"));
}

function filterSellerOwners(owners = [], sellerSearch = "") {
  const normalizedSearch = normalizeComparable(sellerSearch);
  if (!normalizedSearch) {
    return owners;
  }

  return owners.filter((owner) => {
    const ownerName = normalizeComparable(getHubSpotOwnerDisplayName(owner));
    const ownerEmail = normalizeComparable(owner?.email);
    const ownerTeams = normalizeComparable((owner?.teams || []).map((team) => team?.name).filter(Boolean).join(" "));

    return ownerName.includes(normalizedSearch)
      || ownerEmail.includes(normalizedSearch)
      || ownerTeams.includes(normalizedSearch);
  });
}

function paginateSellerOwners(owners = [], sellerPage = "1") {
  const currentPage = Number.parseInt(normalizeSellerPage(sellerPage), 10);
  const startIndex = currentPage <= 1
    ? 0
    : currentPage === 2
      ? HUBSPOT_SELLERS_PAGE_SIZE
      : HUBSPOT_SELLERS_PAGE_SIZE * 2;
  const endIndex = currentPage <= 2
    ? startIndex + HUBSPOT_SELLERS_PAGE_SIZE
    : owners.length;

  return owners.slice(startIndex, endIndex);
}

function getSellerPaginationTotalPages(totalOwners = 0) {
  if (totalOwners <= HUBSPOT_SELLERS_PAGE_SIZE) {
    return 1;
  }

  if (totalOwners <= HUBSPOT_SELLERS_PAGE_SIZE * 2) {
    return 2;
  }

  return 3;
}

function chunkItems(items = [], chunkSize = 5) {
  const chunks = [];

  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }

  return chunks;
}

function dedupeHubSpotRecords(records = []) {
  const uniqueRecords = new Map();

  for (const record of records) {
    const id = String(record?.id || "").trim();
    if (id && !uniqueRecords.has(id)) {
      uniqueRecords.set(id, record);
    }
  }

  return [...uniqueRecords.values()];
}

function getHubSpotCacheKey(scope, options = {}) {
  const normalizedPipelineId = normalizePipelineId(options.pipelineId);
  const normalizedOwnerFilter = normalizeOwnerFilter(options.ownerFilter);
  const normalizedActivityWeeks = normalizeActivityWeeksFilter(options.activityWeeksFilter);
  const normalizedSellerPage = normalizeSellerPage(options.sellerPage);
  const normalizedSellerSearch = normalizeSellerSearch(options.sellerSearch);
  const normalizedCampaignDetailKey = normalizeCampaignDetailKey(options.campaignDetailKey);
  const normalizedCampaignName = normalizeCampaignName(options.campaignName);
  const campaignOptionsOnly = normalizeCampaignOptionsOnly(options.campaignOptionsOnly);
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

  if (scope === "sellers") {
    parts.push(`sellerPage=${normalizedSellerPage}`);
    if (normalizedSellerSearch) {
      parts.push(`sellerSearch=${normalizedComparable(normalizedSellerSearch)}`);
    }
  }

  if (scope === "campaigns" && normalizedCampaignDetailKey) {
    parts.push(`campaignDetail=${normalizedCampaignDetailKey}`);
  }

  if (scope === "campaigns" && normalizedCampaignName) {
    parts.push(`campaign=${normalizeComparable(normalizedCampaignName)}`);
  }

  if (scope === "campaigns" && campaignOptionsOnly) {
    parts.push("campaignOptions=1");
  }

  return parts.join(":");
}

function getHubSpotCacheTtlMs(scope = "default") {
  return scope === "campaigns" ? HUBSPOT_CAMPAIGNS_CACHE_TTL_MS : HUBSPOT_CACHE_TTL_MS;
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

async function fetchCampaignScopedActivities({
  objectType,
  baseProperties,
  requestedCampaignName,
  options = {},
  propertyNames = [],
} = {}) {
  const directMatches = requestedCampaignName
    ? await fetchSearchedCollection(
      `/crm/v3/objects/${objectType}/search`,
      buildSelectedCampaignActivitySearchBody(baseProperties, requestedCampaignName, options, propertyNames),
      options,
    ).catch(() => [])
    : await fetchSearchedCollection(
      `/crm/v3/objects/${objectType}/search`,
      buildCampaignActivitySearchBody(baseProperties, options, propertyNames),
      options,
    ).catch(() => []);

  const associatedMatches = await fetchOptionalPagedCollection(
    buildActivityPath(objectType, baseProperties, options),
    options,
  );

  return dedupeHubSpotRecords([...directMatches, ...associatedMatches]);
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
  "phone",
  "mobilephone",
  "lifecyclestage",
  "hs_lead_status",
  "hubspot_owner_id",
  "alunos_a_bordo_contatos",
  "lap_campaign_name",
  "first_utm_data",
  "latest_utm",
  "hs_analytics_first_touch_converting_campaign",
  "hs_analytics_last_touch_converting_campaign",
  "createdate",
  "lastmodifieddate",
];

const HUBSPOT_TASK_BASE_PROPERTIES = [
  "hs_task_subject",
  "hs_task_body",
  "hs_task_status",
  "hs_task_priority",
  "hs_task_type",
  "hs_task_campaign_guid",
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
  "hs_campaign_guid",
  "hs_campaign_guids",
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
  "hs_campaign_guid",
  "hs_campaign_guids",
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
    deals: { includeCampaigns: false, includeContacts: false, maxPages: 6, maxRecords: 600 },
    tasks: { includeCampaigns: false, includeAssociations: false, maxPages: 4, maxRecords: 300 },
    calls: { includeCampaigns: false, includeAssociations: false, maxPages: 4, maxRecords: 300 },
    meetings: { includeCampaigns: false, includeAssociations: false, maxPages: 4, maxRecords: 300 },
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
    deals: { includeCampaigns: true, includeContacts: true, maxPages: 4, maxRecords: 400 },
    contacts: { includeCampaigns: true, includeDeals: true, maxPages: 10, maxRecords: 1000 },
    tasks: { includeCampaigns: true, includeAssociations: true, maxPages: 3, maxRecords: 180 },
    calls: { includeCampaigns: true, includeAssociations: true, maxPages: 3, maxRecords: 180 },
    meetings: { includeCampaigns: true, includeAssociations: true, maxPages: 3, maxRecords: 180 },
  },
  tasks: {
    owners: { maxPages: 2, maxRecords: 500 },
    tasks: { includeCampaigns: false, includeAssociations: true, maxPages: 4, maxRecords: 320 },
    calls: { includeCampaigns: false, includeAssociations: true, maxPages: 4, maxRecords: 320 },
    meetings: { includeCampaigns: false, includeAssociations: true, maxPages: 4, maxRecords: 320 },
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

function getCampaignLabelTokens(label) {
  return normalizeComparable(label)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
}

function buildCampaignPropertyFilterGroups(propertyNames = [], campaignName = "") {
  const normalizedCampaignName = normalizeCampaignName(campaignName);
  if (!normalizedCampaignName) {
    return [];
  }

  return propertyNames.map((propertyName) => ({
    filters: [{
      propertyName,
      operator: "EQ",
      value: normalizedCampaignName,
    }],
  }));
}

function buildContainsAllTokensFilterGroup(propertyName, campaignName = "") {
  const tokens = getCampaignLabelTokens(campaignName);
  if (!tokens.length) {
    return null;
  }

  return {
    filters: tokens.map((token) => ({
      propertyName,
      operator: "CONTAINS_TOKEN",
      value: token,
    })),
  };
}

function buildSelectedCampaignContactsSearchBody(campaignName, options = {}) {
  const properties = [
    ...HUBSPOT_CONTACT_BASE_PROPERTIES,
    ...(options.includeCampaigns ? HUBSPOT_CAMPAIGN_PROPERTIES : []),
  ];
  const filterGroups = [
    ...buildCampaignPropertyFilterGroups([
      "campanhas",
      "lap_campaign_name",
      "utm_campaign",
    ], campaignName),
  ];

  const tokenGroups = [
    buildContainsAllTokensFilterGroup("campanhas", campaignName),
    buildContainsAllTokensFilterGroup("lap_campaign_name", campaignName),
    buildContainsAllTokensFilterGroup("utm_campaign", campaignName),
  ].filter(Boolean);

  return {
    limit: getCollectionLimit(options),
    properties,
    filterGroups: [...filterGroups, ...tokenGroups],
    sorts: [{
      propertyName: "lastmodifieddate",
      direction: "DESCENDING",
    }],
  };
}

function buildContainsBothTokensFilterGroup(propertyName, firstToken = "Aluno", secondToken = "Bordo") {
  return {
    filters: [
      {
        propertyName,
        operator: "CONTAINS_TOKEN",
        value: firstToken,
      },
      {
        propertyName,
        operator: "CONTAINS_TOKEN",
        value: secondToken,
      },
    ],
  };
}

function buildCampaignDealsSearchBody(options = {}) {
  const properties = [
    ...HUBSPOT_DEAL_BASE_PROPERTIES,
    ...(options.includeCampaigns ? HUBSPOT_CAMPAIGN_PROPERTIES : []),
  ];

  return {
    limit: getCollectionLimit(options),
    properties,
    filterGroups: [buildContainsBothTokensFilterGroup("dealname")],
    sorts: [{
      propertyName: "hs_lastmodifieddate",
      direction: "DESCENDING",
    }],
  };
}

function buildSelectedCampaignDealsSearchBody(campaignName, options = {}) {
  const properties = [
    ...HUBSPOT_DEAL_BASE_PROPERTIES,
    ...(options.includeCampaigns ? HUBSPOT_CAMPAIGN_PROPERTIES : []),
  ];
  const filterGroups = [
    ...buildCampaignPropertyFilterGroups([
      "campanhas",
      "utm_campaign",
    ], campaignName),
  ];
  const dealNameTokenGroup = buildContainsAllTokensFilterGroup("dealname", campaignName);
  if (dealNameTokenGroup) {
    filterGroups.push(dealNameTokenGroup);
  }

  return {
    limit: getCollectionLimit(options),
    properties,
    filterGroups,
    sorts: [{
      propertyName: "hs_lastmodifieddate",
      direction: "DESCENDING",
    }],
  };
}

function buildCampaignActivitySearchBody(baseProperties, options = {}, propertyNames = []) {
  const properties = [
    ...baseProperties,
    ...(options.includeCampaigns ? HUBSPOT_CAMPAIGN_PROPERTIES : []),
  ];

  return {
    limit: getCollectionLimit(options),
    properties,
    filterGroups: propertyNames.slice(0, 5).map((propertyName) => buildContainsBothTokensFilterGroup(propertyName)),
    sorts: [{
      propertyName: "hs_lastmodifieddate",
      direction: "DESCENDING",
    }],
  };
}

function buildSelectedCampaignActivitySearchBody(baseProperties, campaignName, options = {}, propertyNames = []) {
  const properties = [
    ...baseProperties,
    ...(options.includeCampaigns ? HUBSPOT_CAMPAIGN_PROPERTIES : []),
  ];
  const filterGroups = propertyNames
    .map((propertyName) => buildContainsAllTokensFilterGroup(propertyName, campaignName))
    .filter(Boolean);

  return {
    limit: getCollectionLimit(options),
    properties,
    filterGroups,
    sorts: [{
      propertyName: "hs_lastmodifieddate",
      direction: "DESCENDING",
    }],
  };
}

function extractCampaignOptionsFromRecords(rawDeals = [], rawContacts = []) {
  const options = new Map();

  [...rawDeals, ...rawContacts].forEach((record) => {
    const properties = record?.properties || {};
    const label = normalizeCampaignName(extractCampaignLabel(properties));
    if (!label) {
      return;
    }

    const key = normalizeComparable(label);
    if (!options.has(key)) {
      options.set(key, {
        id: key,
        label,
      });
    }
  });

  return [...options.values()].sort((left, right) => left.label.localeCompare(right.label, "pt-BR"));
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

function buildOwnerScopedSearchBody({ properties, ownerIds, sortProperty = "hs_lastmodifieddate" }) {
  return {
    limit: 100,
    properties,
    filterGroups: ownerIds.map((ownerId) => ({
      filters: [{
        propertyName: "hubspot_owner_id",
        operator: "EQ",
        value: ownerId,
      }],
    })),
    sorts: [{
      propertyName: sortProperty,
      direction: "DESCENDING",
    }],
  };
}

async function fetchOwnerScopedCollection(path, bodyOptions, options = {}) {
  const ownerIds = Array.isArray(bodyOptions?.ownerIds)
    ? bodyOptions.ownerIds.filter(Boolean).map((ownerId) => String(ownerId).trim())
    : [];

  if (!ownerIds.length) {
    return [];
  }

  const ownerChunks = chunkItems(ownerIds, HUBSPOT_OWNER_FILTER_GROUP_SIZE);
  const results = await Promise.all(
    ownerChunks.map((ownerChunk) =>
      fetchSearchedCollection(
        path,
        buildOwnerScopedSearchBody({
          ...bodyOptions,
          ownerIds: ownerChunk,
        }),
        {
          ...options,
          maxPages: Math.max(Number(options.maxPages || 1), 4),
          maxRecords: Math.max(Number(options.maxRecords || 100), ownerChunk.length * 120),
        },
      ).catch(() => [])),
  );

  return dedupeHubSpotRecords(results.flat());
}

function getDashboardScopePlan(scope = "default") {
  return HUBSPOT_SCOPE_PLANS[scope] || HUBSPOT_SCOPE_PLANS.default;
}

function isCampaignScope(scope = "default") {
  return String(scope || "").trim().toLowerCase() === "campaigns";
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
  const requestedSellerPage = normalizeSellerPage(options.sellerPage);
  const requestedSellerSearch = normalizeSellerSearch(options.sellerSearch);
  const requestedCampaignDetailKey = normalizeCampaignDetailKey(options.campaignDetailKey);
  const requestedCampaignName = normalizeCampaignName(options.campaignName);
  const campaignOptionsOnly = normalizeCampaignOptionsOnly(options.campaignOptionsOnly);
  const cachedData = readHubSpotDashboardCache(scope, {
    pipelineId: requestedPipelineId,
    ownerFilter: requestedOwnerFilter,
    activityWeeksFilter: requestedActivityWeeksFilter,
    sellerPage: requestedSellerPage,
    sellerSearch: requestedSellerSearch,
    campaignDetailKey: requestedCampaignDetailKey,
    campaignName: requestedCampaignName,
    campaignOptionsOnly,
  });
  if (cachedData) {
    return cachedData;
  }

  const cacheKey = getHubSpotCacheKey(scope, {
    pipelineId: requestedPipelineId,
    ownerFilter: requestedOwnerFilter,
    activityWeeksFilter: requestedActivityWeeksFilter,
    sellerPage: requestedSellerPage,
    sellerSearch: requestedSellerSearch,
    campaignDetailKey: requestedCampaignDetailKey,
    campaignName: requestedCampaignName,
    campaignOptionsOnly,
  });
  const currentCacheEntry = hubSpotDashboardCache.get(cacheKey);
  if (currentCacheEntry?.promise) {
    return currentCacheEntry.promise;
  }

  const plan = getDashboardScopePlan(scope);
  const loadPromise = (async () => {
    const requests = [];
    const sellersScope = scope === "sellers";
    const campaignScope = isCampaignScope(scope);
    const filteredCampaignScope = campaignScope && !campaignOptionsOnly;

    if (plan.owners && !campaignOptionsOnly) {
      requests.push(fetchPagedCollection(buildOwnersPath(plan.owners), plan.owners));
    } else if (plan.owners && campaignOptionsOnly) {
      requests.push(Promise.resolve([]));
    } else {
      requests.push(Promise.resolve([]));
    }

    if (plan.deals) {
      requests.push(fetchDealPipelines().catch(() => []));
    } else {
      requests.push(Promise.resolve([]));
    }

    if (plan.deals && scope !== "deals" && !sellersScope) {
      requests.push(
        filteredCampaignScope
          ? fetchSearchedCollection(
            "/crm/v3/objects/deals/search",
            requestedCampaignName
              ? buildSelectedCampaignDealsSearchBody(requestedCampaignName, plan.deals)
              : buildCampaignDealsSearchBody(plan.deals),
            plan.deals,
          ).catch(() => [])
          : fetchPagedCollection(buildDealsPath(plan.deals), plan.deals),
      );
    } else {
      requests.push(Promise.resolve([]));
    }

    if (plan.contacts) {
      requests.push(
        filteredCampaignScope
          ? fetchSearchedCollection(
            "/crm/v3/objects/contacts/search",
            requestedCampaignName
              ? buildSelectedCampaignContactsSearchBody(requestedCampaignName, plan.contacts)
              : buildCampaignContactsSearchBody(plan.contacts),
            plan.contacts,
          ).catch(() => [])
          : fetchOptionalPagedCollection(buildContactsPath(plan.contacts), plan.contacts),
      );
    } else {
      requests.push(Promise.resolve([]));
    }

    if (plan.tasks && !sellersScope && !campaignOptionsOnly) {
      requests.push(
        filteredCampaignScope
          ? fetchCampaignScopedActivities({
            objectType: "tasks",
            baseProperties: HUBSPOT_TASK_BASE_PROPERTIES,
            requestedCampaignName,
            options: plan.tasks,
            propertyNames: ["hs_task_subject", "hs_task_body", "hs_task_campaign_guid", "hs_campaign", "campanhas", "utm_campaign"],
          })
          : fetchOptionalPagedCollection(buildActivityPath("tasks", HUBSPOT_TASK_BASE_PROPERTIES, plan.tasks), plan.tasks),
      );
    } else {
      requests.push(Promise.resolve([]));
    }

    if (plan.calls && !sellersScope && !campaignOptionsOnly) {
      requests.push(
        filteredCampaignScope
          ? fetchCampaignScopedActivities({
            objectType: "calls",
            baseProperties: HUBSPOT_CALL_BASE_PROPERTIES,
            requestedCampaignName,
            options: plan.calls,
            propertyNames: ["hs_call_title", "hs_call_body", "hs_campaign_guid", "hs_campaign", "campanhas", "utm_campaign"],
          })
          : fetchOptionalPagedCollection(buildActivityPath("calls", HUBSPOT_CALL_BASE_PROPERTIES, plan.calls), plan.calls),
      );
    } else {
      requests.push(Promise.resolve([]));
    }

    if (plan.meetings && !sellersScope && !campaignOptionsOnly) {
      requests.push(
        filteredCampaignScope
          ? fetchCampaignScopedActivities({
            objectType: "meetings",
            baseProperties: HUBSPOT_MEETING_BASE_PROPERTIES,
            requestedCampaignName,
            options: plan.meetings,
            propertyNames: ["hs_meeting_title", "hs_meeting_body", "hs_internal_meeting_notes", "hs_campaign_guid", "hs_campaign", "campanhas"],
          })
          : fetchOptionalPagedCollection(buildActivityPath("meetings", HUBSPOT_MEETING_BASE_PROPERTIES, plan.meetings), plan.meetings),
      );
    } else {
      requests.push(Promise.resolve([]));
    }

    const [owners, pipelines, initialDeals, contacts, tasks, calls, meetings] = await Promise.all(
      requests.map((requestPromise, index) => (
        campaignScope && index === 0
          ? Promise.resolve(requestPromise).catch(() => [])
          : Promise.resolve(requestPromise)
      )),
    );
    const sortedOwners = sellersScope ? sortHubSpotOwnersAlphabetically(owners) : owners;
    const visibleSellerOwners = sellersScope ? filterSellerOwners(sortedOwners, requestedSellerSearch) : sortedOwners;
    const sellerTotalPages = sellersScope ? getSellerPaginationTotalPages(visibleSellerOwners.length) : 1;
    const resolvedSellerPage = sellersScope
      ? String(Math.min(Math.max(1, Number.parseInt(requestedSellerPage, 10) || 1), sellerTotalPages))
      : requestedSellerPage;
    const selectedOwners = sellersScope ? paginateSellerOwners(visibleSellerOwners, resolvedSellerPage) : owners;
    const selectedOwnerIds = selectedOwners
      .map((owner) => String(owner?.id || "").trim())
      .filter(Boolean);
    const selectedPipelineId = scope === "deals"
      ? resolveSelectedPipelineId(pipelines, requestedPipelineId)
      : "";
    const selectedOwnerId = scope === "deals" && requestedOwnerFilter && requestedOwnerFilter !== "todos"
      ? String(
        sortedOwners.find((owner) => getHubSpotOwnerDisplayName(owner) === requestedOwnerFilter)?.id || "",
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
      : (sellersScope
        ? await fetchOwnerScopedCollection(
          "/crm/v3/objects/deals/search",
          {
            properties: HUBSPOT_DEAL_BASE_PROPERTIES,
            ownerIds: selectedOwnerIds,
          },
          plan.deals,
        )
        : initialDeals);
    const sellerTasks = sellersScope
      ? await fetchOwnerScopedCollection(
        "/crm/v3/objects/tasks/search",
        {
          properties: HUBSPOT_TASK_BASE_PROPERTIES,
          ownerIds: selectedOwnerIds,
        },
        plan.tasks,
      )
      : tasks;
    const sellerCalls = sellersScope
      ? await fetchOwnerScopedCollection(
        "/crm/v3/objects/calls/search",
        {
          properties: HUBSPOT_CALL_BASE_PROPERTIES,
          ownerIds: selectedOwnerIds,
        },
        plan.calls,
      )
      : calls;
    const sellerMeetings = sellersScope
      ? await fetchOwnerScopedCollection(
        "/crm/v3/objects/meetings/search",
        {
          properties: HUBSPOT_MEETING_BASE_PROPERTIES,
          ownerIds: selectedOwnerIds,
          sortProperty: "hs_meeting_start_time",
        },
        plan.meetings,
      )
      : meetings;

    const campaignOptions = scope === "campaigns"
      ? extractCampaignOptionsFromRecords(initialDeals, contacts)
      : [];

    if (scope === "campaigns" && campaignOptionsOnly) {
      const fallbackData = createDashboardFallbackData({
        source: "hubspot",
        loading: "ready",
        status: "Ativa",
      });

      fallbackData.configured = true;
      fallbackData.integration.status = "Ativa";
      fallbackData.integration.source = "hubspot";
      fallbackData.campaignOptions = campaignOptions;
      fallbackData.syncedAt = new Date().toISOString();
      return fallbackData;
    }

    const dashboardData = buildDashboardDomainPayload(selectedOwners, deals, {
      contacts,
      tasks: sellerTasks,
      calls: sellerCalls,
      meetings: sellerMeetings,
    }, pipelines, {
      includeCampaignDetails: !(scope === "campaigns" && !requestedCampaignDetailKey),
      campaignDetailKey: requestedCampaignDetailKey,
      selectedCampaignName: requestedCampaignName,
    });

    if (scope === "campaigns") {
      dashboardData.campaignOptions = campaignOptions;
    }

    if (sellersScope) {
      dashboardData.integration.owners = sortedOwners.length;
      dashboardData.integration.ownerDirectory = sortedOwners.map((owner) => ({
        id: String(owner?.id || "").trim(),
        name: getHubSpotOwnerDisplayName(owner) || "Sem nome",
        email: String(owner?.email || "").trim(),
        team: String(owner?.teams?.find((team) => team?.primary)?.name || owner?.teams?.[0]?.name || "Time comercial").trim(),
      }));
      dashboardData.sellerPagination = {
        currentPage: Number(resolvedSellerPage),
        totalPages: sellerTotalPages,
        totalOwners: visibleSellerOwners.length,
        pageSize: selectedOwners.length,
        searchQuery: requestedSellerSearch,
      };
    }

    hubSpotDashboardCache.set(cacheKey, {
      data: dashboardData,
      expiresAt: Date.now() + getHubSpotCacheTtlMs(scope),
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
