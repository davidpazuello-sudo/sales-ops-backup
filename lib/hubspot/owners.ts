import type { HubSpotCollectionOptions } from "../types/hubspot";

export function getOwnerCollectionLimit(options: HubSpotCollectionOptions = {}): number {
  const requestedLimit = Number(options.maxRecords);
  if (Number.isFinite(requestedLimit) && requestedLimit > 0) {
    return Math.max(1, Math.min(500, requestedLimit));
  }
  return 500;
}

export function buildOwnersPath(options: HubSpotCollectionOptions = {}): string {
  const limit = getOwnerCollectionLimit(options);
  return `/crm/v3/owners?limit=${limit}&archived=false`;
}
