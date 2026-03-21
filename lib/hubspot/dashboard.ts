// @ts-nocheck
import { fetchListByName, resolveHubSpotListId, fetchListMembershipIds, fetchContactsByIds, mergeHubSpotContactRecords, fetchContactsFromCampaignSegmentLists, HUBSPOT_CONTACT_BASE_PROPERTIES } from "./contacts";
import { getOwnerCollectionLimit, buildOwnersPath } from "./owners";
import { HUBSPOT_DEAL_BASE_PROPERTIES, updateHubSpotDealStage, buildDealsPath, buildDealSearchBody, joinProperties, getCollectionLimit } from "./deals";
export { updateHubSpotDealStage };

import { hubSpotDashboardCache, getHubSpotCacheTtlMs } from "./cache";
import { hubspotFetch, fetchPagedCollection, fetchSearchedCollection, fetchOptionalPagedCollection, wait } from "./client";
import { createDashboardFallbackData } from "../dashboard-fallback";
import { buildDashboardDomainPayload } from "../dashboard-domain";
import { writeSystemEvent } from "../audit-log-store";
import { logSecurityEvent } from "../auth-logging";
import { getAppEnvironment, getHubSpotToken, getHubSpotTokenSource } from "../hubspot-runtime";
import { extractCampaignLabel, getConfiguredCampaignSegmentListNames, isPrimaryCampaignName, PRIMARY_CAMPAIGN_CONTACT_VALUE } from "../services/dashboard-campaigns";
async function fetchCampaignScopedActivities({
  objectType,
  baseProperties,
  requestedCampaignName,
  options = {},
  propertyNames = []
} = {}) {
  const directMatches = requestedCampaignName ? await fetchSearchedCollection(`/crm/v3/objects/${objectType}/search`, buildSelectedCampaignActivitySearchBody(baseProperties, requestedCampaignName, options, propertyNames), options).catch(() => []) : await fetchSearchedCollection(`/crm/v3/objects/${objectType}/search`, buildCampaignActivitySearchBody(baseProperties, options, propertyNames), options).catch(() => []);
  const associatedMatches = await fetchOptionalPagedCollection(buildActivityPath(objectType, baseProperties, options), options);
  return dedupeHubSpotRecords([...directMatches, ...associatedMatches]);
}
const HUBSPOT_CAMPAIGN_PROPERTIES = ["campanhas", "utm_campaign", "campaign_name", "campanha", "campaign_code", "hs_campaign", "hs_marketing_campaign", "hs_analytics_source_data_1", "hs_analytics_source_data_2"];
const HUBSPOT_TASK_BASE_PROPERTIES = ["hs_task_subject", "hs_task_body", "hs_task_status", "hs_task_priority", "hs_task_type", "hs_task_campaign_guid", "hubspot_owner_id", "hs_timestamp", "createdate", "hs_lastmodifieddate"];
const HUBSPOT_CALL_BASE_PROPERTIES = ["hs_call_title", "hs_call_body", "hs_call_status", "hs_call_direction", "hs_campaign_guid", "hs_campaign_guids", "hubspot_owner_id", "hs_timestamp", "createdate", "hs_lastmodifieddate"];
const HUBSPOT_MEETING_BASE_PROPERTIES = ["hs_meeting_title", "hs_meeting_body", "hs_internal_meeting_notes", "hs_meeting_start_time", "hs_meeting_end_time", "hs_meeting_outcome", "hs_campaign_guid", "hs_campaign_guids", "hubspot_owner_id", "hs_timestamp", "createdate", "hs_lastmodifieddate"];
const HUBSPOT_SCOPE_PLANS = {
  default: {
    owners: {
      maxPages: 2,
      maxRecords: 500
    },
    deals: {
      includeCampaigns: true,
      includeContacts: true,
      maxPages: 2,
      maxRecords: 150
    },
    contacts: {
      includeCampaigns: true,
      includeDeals: true,
      maxPages: 1,
      maxRecords: 80
    },
    tasks: {
      includeCampaigns: true,
      includeAssociations: true,
      maxPages: 1,
      maxRecords: 60
    },
    calls: {
      includeCampaigns: true,
      includeAssociations: true,
      maxPages: 1,
      maxRecords: 60
    },
    meetings: {
      includeCampaigns: true,
      includeAssociations: true,
      maxPages: 1,
      maxRecords: 60
    }
  },
  ai: {
    owners: {
      maxPages: 2,
      maxRecords: 500
    },
    deals: {
      includeCampaigns: true,
      includeContacts: true,
      maxPages: 2,
      maxRecords: 120
    },
    contacts: {
      includeCampaigns: true,
      includeDeals: true,
      maxPages: 1,
      maxRecords: 60
    },
    tasks: {
      includeCampaigns: true,
      includeAssociations: true,
      maxPages: 1,
      maxRecords: 60
    },
    calls: {
      includeCampaigns: true,
      includeAssociations: true,
      maxPages: 1,
      maxRecords: 60
    },
    meetings: {
      includeCampaigns: true,
      includeAssociations: true,
      maxPages: 1,
      maxRecords: 60
    }
  },
  reports: {
    owners: {
      maxPages: 2,
      maxRecords: 500
    },
    deals: {
      includeCampaigns: false,
      includeContacts: false,
      maxPages: 1,
      maxRecords: 80
    }
  },
  sellers: {
    owners: {
      maxPages: 2,
      maxRecords: 500
    },
    deals: {
      includeCampaigns: false,
      includeContacts: false,
      maxPages: 6,
      maxRecords: 600
    },
    tasks: {
      includeCampaigns: false,
      includeAssociations: false,
      maxPages: 4,
      maxRecords: 300
    },
    calls: {
      includeCampaigns: false,
      includeAssociations: false,
      maxPages: 4,
      maxRecords: 300
    },
    meetings: {
      includeCampaigns: false,
      includeAssociations: false,
      maxPages: 4,
      maxRecords: 300
    }
  },
  presales: {
    owners: {
      maxPages: 2,
      maxRecords: 500
    },
    deals: {
      includeCampaigns: false,
      includeContacts: true,
      maxPages: 4,
      maxRecords: 400
    },
    contacts: {
      includeCampaigns: false,
      includeDeals: true,
      maxPages: 8,
      maxRecords: 800
    },
    tasks: {
      includeCampaigns: false,
      includeAssociations: true,
      maxPages: 5,
      maxRecords: 420
    },
    calls: {
      includeCampaigns: false,
      includeAssociations: true,
      maxPages: 5,
      maxRecords: 420
    },
    meetings: {
      includeCampaigns: false,
      includeAssociations: true,
      maxPages: 5,
      maxRecords: 420
    }
  },
  deals: {
    owners: {
      maxPages: 2,
      maxRecords: 500
    },
    deals: {
      includeCampaigns: false,
      includeContacts: false,
      maxPages: 3,
      maxRecords: 240
    },
    tasks: {
      includeCampaigns: false,
      includeAssociations: true,
      maxPages: 1,
      maxRecords: 80
    },
    calls: {
      includeCampaigns: false,
      includeAssociations: true,
      maxPages: 1,
      maxRecords: 80
    },
    meetings: {
      includeCampaigns: false,
      includeAssociations: true,
      maxPages: 1,
      maxRecords: 80
    }
  },
  campaigns: {
    owners: {
      maxPages: 2,
      maxRecords: 500
    },
    deals: {
      includeCampaigns: true,
      includeContacts: true,
      maxPages: 4,
      maxRecords: 400
    },
    contacts: {
      includeCampaigns: true,
      includeDeals: true,
      maxPages: 10,
      maxRecords: 1000
    },
    tasks: {
      includeCampaigns: true,
      includeAssociations: true,
      maxPages: 8,
      maxRecords: 800
    },
    calls: {
      includeCampaigns: true,
      includeAssociations: true,
      maxPages: 8,
      maxRecords: 800
    },
    meetings: {
      includeCampaigns: true,
      includeAssociations: true,
      maxPages: 8,
      maxRecords: 800
    }
  },
  tasks: {
    owners: {
      maxPages: 2,
      maxRecords: 500
    },
    tasks: {
      includeCampaigns: false,
      includeAssociations: true,
      maxPages: 4,
      maxRecords: 320
    },
    calls: {
      includeCampaigns: false,
      includeAssociations: true,
      maxPages: 4,
      maxRecords: 320
    },
    meetings: {
      includeCampaigns: false,
      includeAssociations: true,
      maxPages: 4,
      maxRecords: 320
    }
  },
  settings: {
    owners: {
      maxPages: 2,
      maxRecords: 500
    },
    deals: {
      includeCampaigns: false,
      includeContacts: false,
      maxPages: 1,
      maxRecords: 40
    }
  }
};
function buildContactsPath(options = {}) {
  const properties = [...HUBSPOT_CONTACT_BASE_PROPERTIES, ...(options.includeCampaigns ? HUBSPOT_CAMPAIGN_PROPERTIES : [])];
  const associations = options.includeDeals ? "&associations=deals" : "";
  const limit = getCollectionLimit(options);
  return `/crm/v3/objects/contacts?limit=${limit}&archived=false${associations}&properties=${joinProperties(properties)}`;
}
function buildCampaignContactsSearchBody(options = {}) {
  const properties = [...HUBSPOT_CONTACT_BASE_PROPERTIES, ...(options.includeCampaigns ? HUBSPOT_CAMPAIGN_PROPERTIES : [])];
  return {
    limit: getCollectionLimit(options),
    properties,
    filterGroups: [{
      filters: [{
        propertyName: "campanhas",
        operator: "EQ",
        value: PRIMARY_CAMPAIGN_CONTACT_VALUE
      }]
    }],
    sorts: [{
      propertyName: "lastmodifieddate",
      direction: "DESCENDING"
    }]
  };
}
function getCampaignLabelTokens(label) {
  return normalizeComparable(label).split(/\s+/).map(token => token.trim()).filter(token => token.length >= 3);
}
function buildCampaignPropertyFilterGroups(propertyNames = [], campaignName = "") {
  const normalizedCampaignName = normalizeCampaignName(campaignName);
  if (!normalizedCampaignName) {
    return [];
  }
  return propertyNames.map(propertyName => ({
    filters: [{
      propertyName,
      operator: "EQ",
      value: normalizedCampaignName
    }]
  }));
}
function buildContainsAllTokensFilterGroup(propertyName, campaignName = "") {
  const tokens = getCampaignLabelTokens(campaignName);
  if (!tokens.length) {
    return null;
  }
  return {
    filters: tokens.map(token => ({
      propertyName,
      operator: "CONTAINS_TOKEN",
      value: token
    }))
  };
}
function buildSelectedCampaignContactsSearchBody(campaignName, options = {}) {
  if (isPrimaryCampaignName(campaignName)) {
    return buildCampaignContactsSearchBody(options);
  }
  const properties = [...HUBSPOT_CONTACT_BASE_PROPERTIES, ...(options.includeCampaigns ? HUBSPOT_CAMPAIGN_PROPERTIES : [])];
  const filterGroups = [...buildCampaignPropertyFilterGroups(["campanhas", "lap_campaign_name", "utm_campaign"], campaignName)];
  const tokenGroups = [buildContainsAllTokensFilterGroup("campanhas", campaignName), buildContainsAllTokensFilterGroup("lap_campaign_name", campaignName), buildContainsAllTokensFilterGroup("utm_campaign", campaignName)].filter(Boolean);
  return {
    limit: getCollectionLimit(options),
    properties,
    filterGroups: [...filterGroups, ...tokenGroups],
    sorts: [{
      propertyName: "lastmodifieddate",
      direction: "DESCENDING"
    }]
  };
}
function buildContainsBothTokensFilterGroup(propertyName, firstToken = "Aluno", secondToken = "Bordo") {
  return {
    filters: [{
      propertyName,
      operator: "CONTAINS_TOKEN",
      value: firstToken
    }, {
      propertyName,
      operator: "CONTAINS_TOKEN",
      value: secondToken
    }]
  };
}
function buildCampaignDealsSearchBody(options = {}) {
  const properties = [...HUBSPOT_DEAL_BASE_PROPERTIES, ...(options.includeCampaigns ? HUBSPOT_CAMPAIGN_PROPERTIES : [])];
  return {
    limit: getCollectionLimit(options),
    properties,
    filterGroups: [buildContainsBothTokensFilterGroup("dealname")],
    sorts: [{
      propertyName: "hs_lastmodifieddate",
      direction: "DESCENDING"
    }]
  };
}
function buildSelectedCampaignDealsSearchBody(campaignName, options = {}) {
  if (isPrimaryCampaignName(campaignName)) {
    return buildCampaignDealsSearchBody(options);
  }
  const properties = [...HUBSPOT_DEAL_BASE_PROPERTIES, ...(options.includeCampaigns ? HUBSPOT_CAMPAIGN_PROPERTIES : [])];
  const filterGroups = [...buildCampaignPropertyFilterGroups(["campanhas", "utm_campaign"], campaignName)];
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
      direction: "DESCENDING"
    }]
  };
}
function buildCampaignActivitySearchBody(baseProperties, options = {}, propertyNames = []) {
  const properties = [...baseProperties, ...(options.includeCampaigns ? HUBSPOT_CAMPAIGN_PROPERTIES : [])];
  return {
    limit: getCollectionLimit(options),
    properties,
    filterGroups: propertyNames.slice(0, 5).map(propertyName => buildContainsBothTokensFilterGroup(propertyName)),
    sorts: [{
      propertyName: "hs_lastmodifieddate",
      direction: "DESCENDING"
    }]
  };
}
function buildSelectedCampaignActivitySearchBody(baseProperties, campaignName, options = {}, propertyNames = []) {
  if (isPrimaryCampaignName(campaignName)) {
    return buildCampaignActivitySearchBody(baseProperties, options, propertyNames);
  }
  const properties = [...baseProperties, ...(options.includeCampaigns ? HUBSPOT_CAMPAIGN_PROPERTIES : [])];
  const filterGroups = propertyNames.map(propertyName => buildContainsAllTokensFilterGroup(propertyName, campaignName)).filter(Boolean);
  return {
    limit: getCollectionLimit(options),
    properties,
    filterGroups,
    sorts: [{
      propertyName: "hs_lastmodifieddate",
      direction: "DESCENDING"
    }]
  };
}
function extractCampaignOptionsFromRecords(rawDeals = [], rawContacts = []) {
  const options = new Map();
  [...rawDeals, ...rawContacts].forEach(record => {
    const properties = record?.properties || {};
    const label = normalizeCampaignName(extractCampaignLabel(properties));
    if (!label) {
      return;
    }
    const key = normalizeComparable(label);
    if (!options.has(key)) {
      options.set(key, {
        id: key,
        label
      });
    }
  });
  return [...options.values()].sort((left, right) => left.label.localeCompare(right.label, "pt-BR"));
}
function mergeConfiguredCampaignOptions(options = []) {
  const merged = new Map(options.map(option => [normalizeComparable(option?.label), option]));
  [{
    id: normalizeComparable(PRIMARY_CAMPAIGN_CONTACT_VALUE),
    label: PRIMARY_CAMPAIGN_CONTACT_VALUE
  }].forEach(option => {
    if (!merged.has(normalizeComparable(option.label))) {
      merged.set(normalizeComparable(option.label), option);
    }
  });
  return [...merged.values()].sort((left, right) => left.label.localeCompare(right.label, "pt-BR"));
}
function buildActivityPath(objectType, baseProperties, options = {}) {
  const properties = [...baseProperties, ...(options.includeCampaigns ? HUBSPOT_CAMPAIGN_PROPERTIES : [])];
  const associations = options.includeAssociations ? "&associations=contacts,deals" : "";
  const limit = getCollectionLimit(options);
  return `/crm/v3/objects/${objectType}?limit=${limit}&archived=false${associations}&properties=${joinProperties(properties)}`;
}
function getActivityScheduleProperty(objectType = "task") {
  return objectType === "meetings" ? "hs_meeting_start_time" : "hs_timestamp";
}
function buildUpcomingActivitySearchBody(objectType, baseProperties, options = {}) {
  const properties = [...baseProperties, ...(options.includeCampaigns ? HUBSPOT_CAMPAIGN_PROPERTIES : [])];
  const scheduleProperty = getActivityScheduleProperty(objectType);
  return {
    limit: getCollectionLimit(options),
    properties,
    filterGroups: [{
      filters: [{
        propertyName: scheduleProperty,
        operator: "GTE",
        value: String(Date.now())
      }]
    }],
    sorts: [{
      propertyName: scheduleProperty,
      direction: "ASCENDING"
    }]
  };
}
function buildOwnerScopedSearchBody({
  properties,
  ownerIds,
  sortProperty = "hs_lastmodifieddate"
}) {
  return {
    limit: 100,
    properties,
    filterGroups: ownerIds.map(ownerId => ({
      filters: [{
        propertyName: "hubspot_owner_id",
        operator: "EQ",
        value: ownerId
      }]
    })),
    sorts: [{
      propertyName: sortProperty,
      direction: "DESCENDING"
    }]
  };
}
async function fetchOwnerScopedCollection(path, bodyOptions, options = {}) {
  const ownerIds = Array.isArray(bodyOptions?.ownerIds) ? bodyOptions.ownerIds.filter(Boolean).map(ownerId => String(ownerId).trim()) : [];
  if (!ownerIds.length) {
    return [];
  }
  const ownerChunks = chunkItems(ownerIds, HUBSPOT_OWNER_FILTER_GROUP_SIZE);
  const results = await Promise.all(ownerChunks.map(ownerChunk => fetchSearchedCollection(path, buildOwnerScopedSearchBody({
    ...bodyOptions,
    ownerIds: ownerChunk
  }), {
    ...options,
    maxPages: Math.max(Number(options.maxPages || 1), 4),
    maxRecords: Math.max(Number(options.maxRecords || 100), ownerChunk.length * 120)
  }).catch(() => [])));
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
  if (normalizedPipelineId && pipelines.some(pipeline => pipeline?.id === normalizedPipelineId)) {
    return normalizedPipelineId;
  }
  const preferredPipeline = pipelines.find(pipeline => String(pipeline?.label || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() === "brasil publico");
  return preferredPipeline?.id || String(pipelines[0]?.id || "").trim();
}
async function fetchDealPipelines() {
  const payload = await hubspotFetch("/crm/v3/pipelines/deals", {
    operation: "fetch-deal-pipelines"
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
    campaignOptionsOnly
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
    campaignOptionsOnly
  });
  const currentCacheEntry = hubSpotDashboardCache.get(cacheKey);
  if (currentCacheEntry?.promise) {
    return currentCacheEntry.promise;
  }
  const plan = getDashboardScopePlan(scope);
  const loadPromise = (async () => {
    const requests = [];
    const sellersScope = scope === "sellers";
    const presalesScope = scope === "presales";
    const campaignScope = isCampaignScope(scope);
    const presalesCampaignScope = presalesScope && Boolean(requestedCampaignName);
    const filteredCampaignScope = campaignScope && !campaignOptionsOnly;
    const presalesOwnerScopedLoad = presalesScope && requestedOwnerFilter && requestedOwnerFilter !== "todos";
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
    if (plan.deals && scope !== "deals" && !sellersScope && !presalesOwnerScopedLoad) {
      requests.push(filteredCampaignScope ? fetchSearchedCollection("/crm/v3/objects/deals/search", requestedCampaignName ? buildSelectedCampaignDealsSearchBody(requestedCampaignName, plan.deals) : buildCampaignDealsSearchBody(plan.deals), plan.deals).catch(() => []) : fetchPagedCollection(buildDealsPath(plan.deals), plan.deals));
    } else {
      requests.push(Promise.resolve([]));
    }
    if (plan.contacts && !presalesOwnerScopedLoad) {
      requests.push(filteredCampaignScope ? fetchSearchedCollection("/crm/v3/objects/contacts/search", requestedCampaignName ? buildSelectedCampaignContactsSearchBody(requestedCampaignName, plan.contacts) : buildCampaignContactsSearchBody(plan.contacts), plan.contacts).catch(() => []) : fetchOptionalPagedCollection(buildContactsPath(plan.contacts), plan.contacts));
    } else {
      requests.push(Promise.resolve([]));
    }
    if (plan.tasks && !sellersScope && !campaignOptionsOnly && !presalesOwnerScopedLoad) {
      requests.push(filteredCampaignScope ? fetchCampaignScopedActivities({
        objectType: "tasks",
        baseProperties: HUBSPOT_TASK_BASE_PROPERTIES,
        requestedCampaignName,
        options: plan.tasks,
        propertyNames: ["hs_task_subject", "hs_task_body", "hs_task_campaign_guid", "hs_campaign", "campanhas", "utm_campaign"]
      }) : scope === "tasks" ? fetchSearchedCollection("/crm/v3/objects/tasks/search", buildUpcomingActivitySearchBody("tasks", HUBSPOT_TASK_BASE_PROPERTIES, plan.tasks), plan.tasks).catch(() => []) : fetchOptionalPagedCollection(buildActivityPath("tasks", HUBSPOT_TASK_BASE_PROPERTIES, plan.tasks), plan.tasks));
    } else {
      requests.push(Promise.resolve([]));
    }
    if (plan.calls && !sellersScope && !campaignOptionsOnly && !presalesOwnerScopedLoad) {
      requests.push(filteredCampaignScope ? fetchCampaignScopedActivities({
        objectType: "calls",
        baseProperties: HUBSPOT_CALL_BASE_PROPERTIES,
        requestedCampaignName,
        options: plan.calls,
        propertyNames: ["hs_call_title", "hs_call_body", "hs_campaign_guid", "hs_campaign", "campanhas", "utm_campaign"]
      }) : scope === "tasks" ? fetchSearchedCollection("/crm/v3/objects/calls/search", buildUpcomingActivitySearchBody("calls", HUBSPOT_CALL_BASE_PROPERTIES, plan.calls), plan.calls).catch(() => []) : fetchOptionalPagedCollection(buildActivityPath("calls", HUBSPOT_CALL_BASE_PROPERTIES, plan.calls), plan.calls));
    } else {
      requests.push(Promise.resolve([]));
    }
    if (plan.meetings && !sellersScope && !campaignOptionsOnly && !presalesOwnerScopedLoad) {
      requests.push(filteredCampaignScope ? fetchCampaignScopedActivities({
        objectType: "meetings",
        baseProperties: HUBSPOT_MEETING_BASE_PROPERTIES,
        requestedCampaignName,
        options: plan.meetings,
        propertyNames: ["hs_meeting_title", "hs_meeting_body", "hs_internal_meeting_notes", "hs_campaign_guid", "hs_campaign", "campanhas"]
      }) : scope === "tasks" ? fetchSearchedCollection("/crm/v3/objects/meetings/search", buildUpcomingActivitySearchBody("meetings", HUBSPOT_MEETING_BASE_PROPERTIES, plan.meetings), plan.meetings).catch(() => []) : fetchOptionalPagedCollection(buildActivityPath("meetings", HUBSPOT_MEETING_BASE_PROPERTIES, plan.meetings), plan.meetings));
    } else {
      requests.push(Promise.resolve([]));
    }
    const [owners, pipelines, initialDeals, initialContacts, tasks, calls, meetings] = await Promise.all(requests.map((requestPromise, index) => campaignScope && index === 0 ? Promise.resolve(requestPromise).catch(() => []) : Promise.resolve(requestPromise)));
    const listBackedContacts = filteredCampaignScope || presalesCampaignScope ? await fetchContactsFromCampaignSegmentLists(requestedCampaignName, plan.contacts).catch(() => []) : [];
    const baseCampaignContacts = filteredCampaignScope || presalesCampaignScope ? listBackedContacts.length ? listBackedContacts : initialContacts : initialContacts;
    const historyBackedContacts = (campaignScope || presalesScope) && requestedCampaignName && baseCampaignContacts.length ? await fetchContactsByIds(baseCampaignContacts.map(contact => contact?.id), plan.contacts).catch(() => []) : [];
    const sortedOwners = sellersScope || campaignScope || presalesScope ? sortHubSpotOwnersAlphabetically(owners) : owners;
    const visibleSellerOwners = sellersScope ? filterSellerOwners(sortedOwners, requestedSellerSearch) : sortedOwners;
    const sellerTotalPages = sellersScope ? getSellerPaginationTotalPages(visibleSellerOwners.length) : 1;
    const resolvedSellerPage = sellersScope ? String(Math.min(Math.max(1, Number.parseInt(requestedSellerPage, 10) || 1), sellerTotalPages)) : requestedSellerPage;
    const selectedOwners = sellersScope ? paginateSellerOwners(visibleSellerOwners, resolvedSellerPage) : sortedOwners;
    const selectedOwnerIds = selectedOwners.map(owner => String(owner?.id || "").trim()).filter(Boolean);
    const selectedPipelineId = scope === "deals" ? resolveSelectedPipelineId(pipelines, requestedPipelineId) : "";
    const selectedOwnerId = (scope === "deals" || scope === "campaigns" || scope === "presales") && requestedOwnerFilter && requestedOwnerFilter !== "todos" ? resolveSelectedOwnerId(sortedOwners, requestedOwnerFilter) : "";
    const presalesOwnerIds = presalesScope && selectedOwnerId ? [selectedOwnerId] : [];
    const presalesContacts = presalesOwnerIds.length && plan.contacts ? await fetchOwnerScopedCollection("/crm/v3/objects/contacts/search", {
      properties: HUBSPOT_CONTACT_BASE_PROPERTIES,
      ownerIds: presalesOwnerIds,
      sortProperty: "lastmodifieddate"
    }, plan.contacts) : initialContacts;
    const deals = scope === "deals" && plan.deals ? selectedPipelineId ? await fetchSearchedCollection("/crm/v3/objects/deals/search", buildDealSearchBody({
      pipelineId: selectedPipelineId,
      ownerId: selectedOwnerId,
      activityWeeksFilter: requestedActivityWeeksFilter,
      options: plan.deals
    }), plan.deals) : [] : presalesOwnerIds.length ? await fetchOwnerScopedCollection("/crm/v3/objects/deals/search", {
      properties: HUBSPOT_DEAL_BASE_PROPERTIES,
      ownerIds: presalesOwnerIds
    }, plan.deals) : sellersScope ? await fetchOwnerScopedCollection("/crm/v3/objects/deals/search", {
      properties: HUBSPOT_DEAL_BASE_PROPERTIES,
      ownerIds: selectedOwnerIds
    }, plan.deals) : initialDeals;
    const sellerTasks = sellersScope ? await fetchOwnerScopedCollection("/crm/v3/objects/tasks/search", {
      properties: HUBSPOT_TASK_BASE_PROPERTIES,
      ownerIds: selectedOwnerIds
    }, plan.tasks) : presalesOwnerIds.length ? await fetchOwnerScopedCollection("/crm/v3/objects/tasks/search", {
      properties: HUBSPOT_TASK_BASE_PROPERTIES,
      ownerIds: presalesOwnerIds
    }, plan.tasks) : tasks;
    const sellerCalls = sellersScope ? await fetchOwnerScopedCollection("/crm/v3/objects/calls/search", {
      properties: HUBSPOT_CALL_BASE_PROPERTIES,
      ownerIds: selectedOwnerIds
    }, plan.calls) : presalesOwnerIds.length ? await fetchOwnerScopedCollection("/crm/v3/objects/calls/search", {
      properties: HUBSPOT_CALL_BASE_PROPERTIES,
      ownerIds: presalesOwnerIds
    }, plan.calls) : calls;
    const sellerMeetings = sellersScope ? await fetchOwnerScopedCollection("/crm/v3/objects/meetings/search", {
      properties: HUBSPOT_MEETING_BASE_PROPERTIES,
      ownerIds: selectedOwnerIds,
      sortProperty: "hs_meeting_start_time"
    }, plan.meetings) : presalesOwnerIds.length ? await fetchOwnerScopedCollection("/crm/v3/objects/meetings/search", {
      properties: HUBSPOT_MEETING_BASE_PROPERTIES,
      ownerIds: presalesOwnerIds,
      sortProperty: "hs_meeting_start_time"
    }, plan.meetings) : meetings;
    const contacts = campaignScope || presalesCampaignScope ? mergeHubSpotContactRecords(baseCampaignContacts, historyBackedContacts) : presalesContacts;
    const ownerFilteredContacts = filteredCampaignScope ? filterHubSpotRecordsByOwner(contacts, selectedOwnerId) : contacts;
    const ownerFilteredDeals = filteredCampaignScope ? filterHubSpotRecordsByOwner(deals, selectedOwnerId) : deals;
    const ownerFilteredTasks = filteredCampaignScope ? filterHubSpotRecordsByOwner(sellerTasks, selectedOwnerId) : sellerTasks;
    const ownerFilteredCalls = filteredCampaignScope ? filterHubSpotRecordsByOwner(sellerCalls, selectedOwnerId) : sellerCalls;
    const ownerFilteredMeetings = filteredCampaignScope ? filterHubSpotRecordsByOwner(sellerMeetings, selectedOwnerId) : sellerMeetings;
    const campaignScopedTasks = filteredCampaignScope ? filterCampaignActivitiesByAssociations(ownerFilteredTasks, {
      contacts: ownerFilteredContacts,
      deals: ownerFilteredDeals,
      requestedCampaignName
    }) : sellerTasks;
    const campaignScopedCalls = filteredCampaignScope ? filterCampaignActivitiesByAssociations(ownerFilteredCalls, {
      contacts: ownerFilteredContacts,
      deals: ownerFilteredDeals,
      requestedCampaignName
    }) : sellerCalls;
    const campaignScopedMeetings = filteredCampaignScope ? filterCampaignActivitiesByAssociations(ownerFilteredMeetings, {
      contacts: ownerFilteredContacts,
      deals: ownerFilteredDeals,
      requestedCampaignName
    }) : sellerMeetings;
    const campaignOptions = scope === "campaigns" || scope === "presales" ? mergeConfiguredCampaignOptions(extractCampaignOptionsFromRecords(initialDeals, contacts)) : [];
    if ((scope === "campaigns" || scope === "presales") && campaignOptionsOnly) {
      const fallbackData = createDashboardFallbackData({
        source: "hubspot",
        loading: "ready",
        status: "Ativa"
      });
      fallbackData.configured = true;
      fallbackData.integration.status = "Ativa";
      fallbackData.integration.source = "hubspot";
      fallbackData.integration.owners = sortedOwners.length;
      fallbackData.integration.ownerDirectory = sortedOwners.map(owner => ({
        id: String(owner?.id || "").trim(),
        name: getHubSpotOwnerDisplayName(owner) || "Sem nome",
        email: String(owner?.email || "").trim(),
        team: String(owner?.teams?.find(team => team?.primary)?.name || owner?.teams?.[0]?.name || "Time comercial").trim()
      }));
      fallbackData.campaignOptions = campaignOptions;
      fallbackData.syncedAt = new Date().toISOString();
      return fallbackData;
    }
    const dashboardData = buildDashboardDomainPayload(selectedOwners, filteredCampaignScope ? ownerFilteredDeals : deals, {
      contacts: filteredCampaignScope ? ownerFilteredContacts : contacts,
      tasks: campaignScopedTasks,
      calls: campaignScopedCalls,
      meetings: campaignScopedMeetings
    }, pipelines, {
      includeCampaignDetails: !(scope === "campaigns" && !requestedCampaignDetailKey),
      campaignDetailKey: requestedCampaignDetailKey,
      selectedCampaignName: requestedCampaignName,
      selectedOwnerFilter: presalesScope ? requestedOwnerFilter : ""
    });
    if (scope === "campaigns" || scope === "presales") {
      dashboardData.campaignOptions = campaignOptions;
    }
    if (sellersScope || campaignScope || presalesScope) {
      dashboardData.integration.owners = sortedOwners.length;
      dashboardData.integration.ownerDirectory = sortedOwners.map(owner => ({
        id: String(owner?.id || "").trim(),
        name: getHubSpotOwnerDisplayName(owner) || "Sem nome",
        email: String(owner?.email || "").trim(),
        team: String(owner?.teams?.find(team => team?.primary)?.name || owner?.teams?.[0]?.name || "Time comercial").trim()
      }));
    }
    if (sellersScope) {
      dashboardData.sellerPagination = {
        currentPage: Number(resolvedSellerPage),
        totalPages: sellerTotalPages,
        totalOwners: visibleSellerOwners.length,
        pageSize: selectedOwners.length,
        searchQuery: requestedSellerSearch
      };
    }
    hubSpotDashboardCache.set(cacheKey, {
      data: dashboardData,
      expiresAt: Date.now() + getHubSpotCacheTtlMs(scope),
      promise: null
    });
    return dashboardData;
  })().catch(error => {
    hubSpotDashboardCache.delete(cacheKey);
    throw error;
  });
  hubSpotDashboardCache.set(cacheKey, {
    data: null,
    expiresAt: 0,
    promise: loadPromise
  });
  return loadPromise;
}