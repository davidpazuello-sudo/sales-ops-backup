import { hubspotFetch } from "./client";
import { dedupeHubSpotRecords, chunkItems } from "./utils";
import { getConfiguredCampaignSegmentListNames } from "../services/dashboard-campaigns";
import type { HubSpotRecord, HubSpotCollectionOptions, HubSpotListPayload, HubSpotMembershipItem } from "../types/hubspot";

const HUBSPOT_CAMPAIGN_PROPERTIES: string[] = [
  "campanhas", "utm_campaign", "campaign_name", "campanha", "campaign_code",
  "hs_campaign", "hs_marketing_campaign", "hs_analytics_source_data_1", "hs_analytics_source_data_2",
];

export const HUBSPOT_CONTACT_BASE_PROPERTIES: string[] = [
  "firstname", "lastname", "email", "phone", "mobilephone", "lifecyclestage",
  "conectado", "hs_lead_status", "hubspot_owner_id", "alunos_a_bordo_contatos",
  "lap_campaign_name", "first_utm_data", "latest_utm",
  "hs_analytics_first_touch_converting_campaign", "hs_analytics_last_touch_converting_campaign",
  "createdate", "lastmodifieddate",
];

export async function fetchListByName(listName: string = ""): Promise<HubSpotListPayload | null> {
  const normalizedListName = String(listName || "").trim();
  if (!normalizedListName) {
    return null;
  }
  try {
    return await hubspotFetch(`/crm/v3/lists/object-type-id/0-1/name/${encodeURIComponent(normalizedListName)}`, {
      operation: "fetch-list-by-name",
    });
  } catch {
    return null;
  }
}

export function resolveHubSpotListId(payload: HubSpotListPayload | null): string {
  return String(
    payload?.listId || payload?.id || payload?.list?.listId || payload?.list?.id || "",
  ).trim();
}

export async function fetchListMembershipIds(listId: string = "", options: HubSpotCollectionOptions = {}): Promise<string[]> {
  const normalizedListId = String(listId || "").trim();
  if (!normalizedListId) {
    return [];
  }
  const results: HubSpotMembershipItem[] = [];
  let after: string = "";
  let pageCount: number = 0;
  const maxPages = Number.isFinite(options.maxPages) ? Number(options.maxPages) : 10;
  const maxRecords = Number.isFinite(options.maxRecords) ? Number(options.maxRecords) : 1000;

  while (true) {
    const separator = after ? `&after=${after}` : "";
    const payload = await hubspotFetch(`/crm/v3/lists/${encodeURIComponent(normalizedListId)}/memberships?limit=250${separator}`, {
      operation: "fetch-list-memberships",
    });
    pageCount += 1;
    results.push(...(payload.results || []));
    if (results.length >= maxRecords || pageCount >= maxPages) {
      break;
    }
    after = payload.paging?.next?.after || "";
    if (!after) {
      break;
    }
  }
  return [...new Set(
    results.map((item) => String(item?.recordId || item?.id || item?.entityId || "").trim()).filter(Boolean),
  )];
}

export async function fetchContactsByIds(contactIds: string[] = [], options: HubSpotCollectionOptions = {}): Promise<HubSpotRecord[]> {
  const normalizedContactIds = [...new Set(
    contactIds.map((contactId) => String(contactId || "").trim()).filter(Boolean),
  )];
  if (!normalizedContactIds.length) {
    return [];
  }
  const properties = [
    ...HUBSPOT_CONTACT_BASE_PROPERTIES,
    ...(options.includeCampaigns ? HUBSPOT_CAMPAIGN_PROPERTIES : []),
  ];
  const chunks = chunkItems(normalizedContactIds, 100);
  const results = await Promise.all(
    chunks.map((chunk) =>
      hubspotFetch("/crm/v3/objects/contacts/batch/read", {
        method: "POST",
        operation: "fetch-contacts-batch-read",
        body: JSON.stringify({
          properties,
          propertiesWithHistory: ["lifecyclestage", "conectado"],
          inputs: chunk.map((id) => ({ id })),
        }),
      }).then((payload: { results?: HubSpotRecord[] }) => payload?.results || []).catch(() => [] as HubSpotRecord[]),
    ),
  );
  return dedupeHubSpotRecords(results.flat());
}

export function mergeHubSpotContactRecords(baseContacts: HubSpotRecord[] = [], historyContacts: HubSpotRecord[] = []): HubSpotRecord[] {
  const mergedContacts = new Map<string, HubSpotRecord>();
  for (const contact of baseContacts) {
    const id = String(contact?.id || "").trim();
    if (id) {
      mergedContacts.set(id, contact);
    }
  }
  for (const contact of historyContacts) {
    const id = String(contact?.id || "").trim();
    if (!id) {
      continue;
    }
    const previousContact = mergedContacts.get(id) || {};
    mergedContacts.set(id, {
      ...previousContact,
      ...contact,
      properties: {
        ...(previousContact.properties || {}),
        ...(contact.properties || {}),
      },
      propertiesWithHistory: contact.propertiesWithHistory || previousContact.propertiesWithHistory,
      associations: previousContact.associations || contact.associations,
    });
  }
  return dedupeHubSpotRecords([...mergedContacts.values()]);
}

export async function fetchContactsFromCampaignSegmentLists(campaignName: string = "", options: HubSpotCollectionOptions = {}): Promise<HubSpotRecord[]> {
  const configuredListNames = getConfiguredCampaignSegmentListNames(campaignName);
  if (!configuredListNames.length) {
    return [];
  }
  const lists = await Promise.all(configuredListNames.map((listName: string) => fetchListByName(listName)));
  const membershipIds = await Promise.all(
    lists.filter(Boolean).map((list) => fetchListMembershipIds(resolveHubSpotListId(list as HubSpotListPayload), options).catch(() => [] as string[])),
  );
  const contactIds = [...new Set(membershipIds.flat())];
  if (!contactIds.length) {
    return [];
  }
  return fetchContactsByIds(contactIds, options);
}
