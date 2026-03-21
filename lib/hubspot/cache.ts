import type { HubSpotCacheEntry } from "../types/hubspot";

export const HUBSPOT_CACHE_TTL_MS: number = 60 * 1000;
export const HUBSPOT_CAMPAIGNS_CACHE_TTL_MS: number = 20 * 1000;
export const hubSpotDashboardCache = new Map<string, HubSpotCacheEntry>();

export function getHubSpotCacheTtlMs(scope: string = "default"): number {
  return scope === "campaigns" ? HUBSPOT_CAMPAIGNS_CACHE_TTL_MS : HUBSPOT_CACHE_TTL_MS;
}
