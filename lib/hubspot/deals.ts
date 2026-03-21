import { hubspotFetch } from "./client";
import type { HubSpotCollectionOptions, HubSpotDealSearchParams, HubSpotSearchBody } from "../types/hubspot";

export const HUBSPOT_DEAL_BASE_PROPERTIES: string[] = [
  "dealname", "amount", "dealstage", "pipeline", "hubspot_owner_id",
  "closedate", "createdate", "hs_lastmodifieddate",
];

const HUBSPOT_CAMPAIGN_PROPERTIES: string[] = [
  "campanhas", "utm_campaign", "campaign_name", "campanha", "campaign_code",
  "hs_campaign", "hs_marketing_campaign", "hs_analytics_source_data_1", "hs_analytics_source_data_2",
];

export function joinProperties(properties: string[] = []): string {
  return properties.filter(Boolean).join(",");
}

export function getCollectionLimit(options: HubSpotCollectionOptions = {}): number {
  const requestedLimit = Number(options.maxRecords);
  if (Number.isFinite(requestedLimit) && requestedLimit > 0) {
    return Math.max(1, Math.min(100, requestedLimit));
  }
  return 100;
}

export function buildDealsPath(options: HubSpotCollectionOptions = {}): string {
  const properties = [...HUBSPOT_DEAL_BASE_PROPERTIES, ...(options.includeCampaigns ? HUBSPOT_CAMPAIGN_PROPERTIES : [])];
  const associations = options.includeContacts ? "&associations=contacts" : "";
  const limit = getCollectionLimit(options);
  return `/crm/v3/objects/deals?limit=${limit}&archived=false${associations}&properties=${joinProperties(properties)}`;
}

export function buildDealSearchBody({ pipelineId, ownerId, activityWeeksFilter, options = {} }: HubSpotDealSearchParams): HubSpotSearchBody {
  const properties = [...HUBSPOT_DEAL_BASE_PROPERTIES, ...(options.includeCampaigns ? HUBSPOT_CAMPAIGN_PROPERTIES : [])];
  const filters: { propertyName: string; operator: string; value: string }[] = [];

  if (pipelineId) {
    filters.push({ propertyName: "pipeline", operator: "EQ", value: pipelineId });
  }
  if (ownerId) {
    filters.push({ propertyName: "hubspot_owner_id", operator: "EQ", value: ownerId });
  }

  const parsedActivityWeeks = Number.parseInt(String(activityWeeksFilter || ""), 10);
  if (Number.isFinite(parsedActivityWeeks) && parsedActivityWeeks > 0) {
    filters.push({
      propertyName: "hs_lastmodifieddate",
      operator: "GTE",
      value: String(Date.now() - parsedActivityWeeks * 7 * 24 * 60 * 60 * 1000),
    });
  }

  return {
    limit: getCollectionLimit(options),
    properties,
    filterGroups: filters.length ? [{ filters }] : [],
    sorts: [{ propertyName: "hs_lastmodifieddate", direction: "DESCENDING" }],
  };
}

export async function updateHubSpotDealStage({ dealId, stageId }: { dealId: string; stageId: string }): Promise<unknown> {
  const normalizedDealId = String(dealId || "").trim();
  const normalizedStageId = String(stageId || "").trim();
  if (!normalizedDealId || !normalizedStageId) {
    throw new Error("HUBSPOT_DEAL_STAGE_INVALID");
  }
  return hubspotFetch(`/crm/v3/objects/deals/${encodeURIComponent(normalizedDealId)}`, {
    method: "PATCH",
    operation: "update-deal-stage",
    body: JSON.stringify({
      properties: { dealstage: normalizedStageId },
    }),
  });
}
