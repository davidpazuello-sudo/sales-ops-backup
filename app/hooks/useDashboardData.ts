"use client";
import { useEffect, useState } from "react";
import { createDashboardFallbackData } from "lib/dashboard-fallback";
import type { DashboardData } from "lib/types/dashboard";

export type DashboardScope =
  | "reports"
  | "sellers"
  | "presales"
  | "deals"
  | "campaigns"
  | "tasks"
  | "settings"
  | "default"
  | "none";

export interface UseDashboardDataOptions {
  scope: DashboardScope;
  pipelineId?: string;
  ownerFilter?: string;
  activityWeeksFilter?: string;
  campaignName?: string;
  sellerPage?: string;
  sellerSearch?: string;
}

const CACHE_PREFIX = "salesops:dashboard-scope:";
const CACHE_TTL_MS = 60 * 1000;

function buildCacheKey(scope: string, opts: Omit<UseDashboardDataOptions, "scope">): string {
  if (!scope || scope === "none") return "";
  const parts = [
    opts.pipelineId,
    opts.ownerFilter,
    opts.activityWeeksFilter,
    opts.campaignName,
    opts.sellerPage,
    opts.sellerSearch,
  ]
    .map((v) => String(v ?? "").trim())
    .filter(Boolean);
  return parts.length ? `${scope}:${parts.join(":")}` : scope;
}

function readCache(cacheKey: string): DashboardData | null {
  if (typeof window === "undefined" || !cacheKey) return null;
  try {
    const stored = window.sessionStorage.getItem(`${CACHE_PREFIX}${cacheKey}`);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as { cachedAt?: number; payload?: DashboardData };
    const cachedAt = Number(parsed?.cachedAt ?? 0);
    if (!cachedAt || Date.now() - cachedAt > CACHE_TTL_MS) {
      window.sessionStorage.removeItem(`${CACHE_PREFIX}${cacheKey}`);
      return null;
    }
    return parsed?.payload ?? null;
  } catch {
    window.sessionStorage.removeItem(`${CACHE_PREFIX}${cacheKey}`);
    return null;
  }
}

function writeCache(cacheKey: string, payload: DashboardData): void {
  if (typeof window === "undefined" || !cacheKey) return;
  window.sessionStorage.setItem(
    `${CACHE_PREFIX}${cacheKey}`,
    JSON.stringify({ cachedAt: Date.now(), payload }),
  );
}

const defaultData = createDashboardFallbackData({ loading: "loading", status: "Carregando HubSpot" });

export function useDashboardData({
  scope,
  pipelineId = "",
  ownerFilter = "todos",
  activityWeeksFilter = "1",
  campaignName = "",
  sellerPage = "1",
  sellerSearch = "",
}: UseDashboardDataOptions): { dashboardData: DashboardData; hubspotMessage: string } {
  const [dashboardData, setDashboardData] = useState<DashboardData>(defaultData);
  const [hubspotMessage, setHubspotMessage] = useState("Carregando dados da HubSpot...");

  const effectivePipelineId = scope === "deals" ? String(pipelineId).trim() : "";
  const effectiveOwnerFilter =
    scope === "deals" || scope === "campaigns" || scope === "presales"
      ? String(ownerFilter).trim()
      : "";
  const effectiveActivityWeeks = scope === "deals" ? String(activityWeeksFilter).trim() : "";
  const effectiveCampaign =
    scope === "campaigns" || scope === "presales" ? String(campaignName).trim() : "";
  const effectiveSellerPage = scope === "sellers" ? String(sellerPage).trim() : "";
  const effectiveSellerSearch = scope === "sellers" ? String(sellerSearch).trim() : "";

  useEffect(() => {
    if (scope === "none") {
      setDashboardData(createDashboardFallbackData());
      setHubspotMessage("Sem consulta HubSpot nesta página.");
      return;
    }

    let cancelled = false;
    const abortController = new AbortController();

    const cacheKey = buildCacheKey(scope, {
      pipelineId: effectivePipelineId,
      ownerFilter: effectiveOwnerFilter,
      activityWeeksFilter: effectiveActivityWeeks,
      campaignName: effectiveCampaign,
      sellerPage: effectiveSellerPage,
      sellerSearch: effectiveSellerSearch,
    });

    const cached = readCache(cacheKey);
    if (cached) {
      setDashboardData(cached);
      setHubspotMessage("Dados recentes da HubSpot carregados.");
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const searchParams = new URLSearchParams({ scope });
      if (effectivePipelineId) searchParams.set("pipelineId", effectivePipelineId);
      if (effectiveOwnerFilter) searchParams.set("owner", effectiveOwnerFilter);
      if (effectiveActivityWeeks) searchParams.set("activityWeeks", effectiveActivityWeeks);
      if (effectiveCampaign) searchParams.set("campaign", effectiveCampaign);
      if (effectiveSellerPage) searchParams.set("sellerPage", effectiveSellerPage);
      if (effectiveSellerSearch) searchParams.set("sellerSearch", effectiveSellerSearch);

      fetch(`/api/hubspot/dashboard?${searchParams}`, {
        signal: abortController.signal,
        cache: "no-store",
      })
        .then(async (res) => {
          const payload = await res.json() as DashboardData & { error?: string };
          if (cancelled) return;
          if (!res.ok) {
            const errorMessage = payload.error ?? "Não foi possível consultar a HubSpot.";
            setDashboardData(
              createDashboardFallbackData({
                loading: res.status === 503 ? "config_required" : "error",
                status: res.status === 503 ? "Configuração pendente" : "Falha na sincronização",
                error: errorMessage,
              }),
            );
            setHubspotMessage(errorMessage);
            return;
          }
          setDashboardData(payload);
          writeCache(cacheKey, payload);
          setHubspotMessage("Dados da HubSpot sincronizados.");
        })
        .catch((error: unknown) => {
          if (cancelled || (error instanceof Error && error.name === "AbortError")) return;
          const errorMessage = "Não foi possível consultar a HubSpot.";
          setDashboardData(
            createDashboardFallbackData({ loading: "error", status: "Falha na sincronização", error: errorMessage }),
          );
          setHubspotMessage(errorMessage);
        });
    }, 160);

    return () => {
      cancelled = true;
      abortController.abort();
      window.clearTimeout(timeoutId);
    };
  }, [scope, effectivePipelineId, effectiveOwnerFilter, effectiveActivityWeeks, effectiveCampaign, effectiveSellerPage, effectiveSellerSearch]);

  return { dashboardData, hubspotMessage };
}
