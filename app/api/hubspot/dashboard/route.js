import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "lib/admin-access";
import { consumeRateLimit, getRequestClientKey } from "lib/auth-rate-limit";
import { getHubSpotDashboardData } from "lib/hubspot";
import { logAuthRouteError, logRateLimitEvent } from "lib/auth-logging";
import { jsonWithApiObservation, startApiObservation } from "lib/api-observability.js";
import { assertDashboardData } from "lib/dashboard-contracts";
import { createDashboardFallbackData } from "lib/dashboard-fallback";
import { enrichDashboardWithOperationalData } from "lib/operational-data";

function normalizeDashboardScope(value) {
  const normalized = String(value || "").trim().toLowerCase();
  const allowedScopes = new Set(["default", "ai", "reports", "sellers", "presales", "deals", "campaigns", "tasks", "settings"]);
  return allowedScopes.has(normalized) ? normalized : "default";
}

function readRequestSearchParams(request) {
  if (request?.nextUrl?.searchParams) {
    return request.nextUrl.searchParams;
  }

  try {
    return new URL(request?.url || "http://localhost").searchParams;
  } catch {
    return new URL("http://localhost").searchParams;
  }
}

function normalizeDashboardPipelineId(value) {
  return String(value || "").trim();
}

function normalizeDashboardOwnerFilter(value) {
  return String(value || "").trim() || "todos";
}

function canViewTeamDashboard(user = {}) {
  const normalizedRole = String(user?.role || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

  return Boolean(user?.isSuperAdmin)
    || ["admin", "supervisor", "gerente", "gestor", "manager"].includes(normalizedRole);
}

function normalizeDashboardActivityWeeks(value) {
  const parsed = Number.parseInt(String(value || "1"), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return "1";
  }

  return String(Math.min(parsed, 12));
}

function normalizeDashboardSellerPage(value) {
  const parsed = Number.parseInt(String(value || "1").trim(), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return "1";
  }

  return String(parsed);
}

function normalizeDashboardSellerSearch(value) {
  return String(value || "").trim();
}

function normalizeDashboardCampaignDetail(value) {
  const normalized = String(value || "").trim();
  const allowedDetails = new Set([
    "callsDaily",
    "callsWeekly",
    "connectionsDaily",
    "connectionsWeekly",
    "firstAttemptContacts",
    "secondAttemptContacts",
    "thirdAttemptContacts",
    "fourthAttemptContacts",
    "wrongNumbers",
    "updatedPhones",
    "disqualifiedNumbers",
    "totalLeads",
    "leadStage",
    "prospects",
    "uncontactedLeads",
    "mqls",
    "sqls",
    "qualificationConversion",
    "meetings",
    "completedMeetings",
    "proposals",
    "closedWon",
    "salesConversion",
    "qualifiedOpportunities",
  ]);
  return allowedDetails.has(normalized) ? normalized : "";
}

function normalizeDashboardCampaignName(value) {
  return String(value || "").trim();
}

function normalizeDashboardCampaignOptionsFlag(value) {
  return String(value || "").trim() === "1";
}

export async function GET(request) {
  const observation = startApiObservation(request, "api/hubspot/dashboard");
  const searchParams = readRequestSearchParams(request);
  const scope = normalizeDashboardScope(searchParams.get("scope"));
  const pipelineId = scope === "deals" ? normalizeDashboardPipelineId(searchParams.get("pipelineId")) : "";
  const requestedOwnerFilter = scope === "deals" || scope === "campaigns" || scope === "presales"
    ? normalizeDashboardOwnerFilter(searchParams.get("owner"))
    : "";
  const activityWeeksFilter = scope === "deals" ? normalizeDashboardActivityWeeks(searchParams.get("activityWeeks")) : "";
  const sellerPage = scope === "sellers" ? normalizeDashboardSellerPage(searchParams.get("sellerPage")) : "";
  const sellerSearch = scope === "sellers" ? normalizeDashboardSellerSearch(searchParams.get("sellerSearch")) : "";
  const campaignDetailKey = scope === "campaigns" ? normalizeDashboardCampaignDetail(searchParams.get("campaignDetail")) : "";
  const campaignName = scope === "campaigns" || scope === "presales"
    ? normalizeDashboardCampaignName(searchParams.get("campaign"))
    : "";
  const campaignOptionsOnly = scope === "campaigns" || scope === "presales"
    ? normalizeDashboardCampaignOptionsFlag(searchParams.get("campaignOptions"))
    : false;
  const auth = await requireAuthenticatedUser({
    route: "api/hubspot/dashboard",
    action: "read-dashboard",
    minimumRole: "Vendedor",
  });
  if (!auth.ok) {
    return jsonWithApiObservation(observation, { ok: false, error: auth.error }, { status: auth.status });
  }

  const ownerFilter = scope === "presales" && !canViewTeamDashboard(auth.user)
    ? String(auth.user.name || auth.user.email || "").trim()
    : requestedOwnerFilter;

  const clientKey = getRequestClientKey(request);
  const rateLimit = await consumeRateLimit({
    scope: "hubspot-dashboard",
    bucket: `${clientKey}:${auth.user.email}`,
    limit: 60,
    windowMs: 60 * 1000,
  });

  if (!rateLimit.ok) {
    logRateLimitEvent("api/hubspot/dashboard", "hubspot-dashboard", {
      actorEmail: auth.user.email,
      clientKey,
      retryAfter: rateLimit.retryAfter,
    });
    return jsonWithApiObservation(
      observation,
      createDashboardFallbackData({
        loading: "error",
        status: "Limite temporario",
        error: "Muitas consultas ao dashboard em pouco tempo. Aguarde alguns instantes.",
      }),
      { status: 429 },
      { actorEmail: auth.user.email, actorUserId: auth.user.id, actorRole: auth.user.role, clientKey },
    );
  }

  try {
    const baseData = assertDashboardData(await getHubSpotDashboardData({
      scope,
      pipelineId,
      ownerFilter,
      activityWeeksFilter,
      sellerPage,
      sellerSearch,
      campaignDetailKey,
      campaignName,
      campaignOptionsOnly,
    }));
    const data = campaignOptionsOnly
      ? baseData
      : assertDashboardData(await enrichDashboardWithOperationalData(baseData, auth.user, { scope }));
    return jsonWithApiObservation(
      observation,
      data,
      undefined,
      { actorEmail: auth.user.email, actorUserId: auth.user.id, actorRole: auth.user.role, clientKey },
    );
  } catch (error) {
    logAuthRouteError("api/hubspot/dashboard", "load-dashboard", error, {
      actorEmail: auth.user.email,
    });
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    const missingToken = message.includes("HUBSPOT_TOKEN_MISSING");
    const errorMessage = missingToken
      ? "Configure HUBSPOT_ACCESS_TOKEN para carregar os dados reais da HubSpot."
      : "Nao foi possivel consultar a HubSpot no momento.";

    return jsonWithApiObservation(
      observation,
      createDashboardFallbackData({
        loading: missingToken ? "config_required" : "error",
        status: missingToken ? "Configuracao pendente" : "Falha na sincronizacao",
        error: errorMessage,
      }),
      { status: missingToken ? 503 : 500 },
      { actorEmail: auth.user.email, actorUserId: auth.user.id, actorRole: auth.user.role, clientKey },
    );
  }
}
