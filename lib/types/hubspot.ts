// HubSpot CRM Type Definitions

export type HubSpotRecord = {
  id?: string;
  properties?: Record<string, string | null>;
  propertiesWithHistory?: Record<string, unknown>;
  associations?: Record<string, { results?: { id?: string }[] }>;
};

export type HubSpotOwner = {
  id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  teams?: { name?: string; primary?: boolean }[];
};

export type HubSpotPipeline = {
  id?: string;
  label?: string;
  displayOrder?: number;
  stages?: HubSpotPipelineStage[];
};

export type HubSpotPipelineStage = {
  id?: string;
  label?: string;
  displayOrder?: number;
  metadata?: Record<string, string>;
};

export type HubSpotPagedResponse = {
  results?: HubSpotRecord[];
  paging?: { next?: { after?: string } };
};

export type HubSpotListPayload = {
  listId?: string;
  id?: string;
  list?: { listId?: string; id?: string };
};

export type HubSpotMembershipItem = {
  recordId?: string;
  id?: string;
  entityId?: string;
};

export type HubSpotFetchInit = RequestInit & {
  operation?: string;
  headers?: Record<string, string>;
};

export type HubSpotCollectionOptions = {
  maxPages?: number;
  maxRecords?: number;
  operation?: string;
  includeCampaigns?: boolean;
  includeContacts?: boolean;
  includeDeals?: boolean;
  includeAssociations?: boolean;
};

export type HubSpotSearchFilter = {
  propertyName: string;
  operator: string;
  value: string;
};

export type HubSpotSearchBody = {
  limit: number;
  properties: string[];
  filterGroups: { filters: HubSpotSearchFilter[] }[];
  sorts?: { propertyName: string; direction: string }[];
  after?: string;
};

export type HubSpotDealSearchParams = {
  pipelineId?: string;
  ownerId?: string;
  activityWeeksFilter?: string;
  options?: HubSpotCollectionOptions;
};

export type HubSpotCacheEntry = {
  data: unknown;
  expiresAt: number;
  promise: Promise<unknown> | null;
};
