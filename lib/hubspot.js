const HUBSPOT_BASE_URL = "https://api.hubapi.com";

function getHubSpotToken() {
  return process.env.HUBSPOT_ACCESS_TOKEN || "";
}

async function hubspotFetch(path, init = {}) {
  const token = getHubSpotToken();

  if (!token) {
    throw new Error("HUBSPOT_TOKEN_MISSING");
  }

  const response = await fetch(`${HUBSPOT_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`HUBSPOT_API_ERROR:${response.status}:${body}`);
  }

  return response.json();
}

async function fetchPagedCollection(path) {
  const results = [];
  let after = "";

  while (true) {
    const separator = path.includes("?") ? "&" : "?";
    const url = after ? `${path}${separator}after=${after}` : path;
    const payload = await hubspotFetch(url);

    results.push(...(payload.results || []));

    after = payload.paging?.next?.after || "";
    if (!after) break;
  }

  return results;
}

function parseAmount(value) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount : 0;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatCompactCurrency(value) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${Math.round(value / 1000)}k`;
  return `${Math.round(value)}`;
}

function daysSince(dateLike) {
  if (!dateLike) return null;
  const timestamp = new Date(dateLike).getTime();
  if (Number.isNaN(timestamp)) return null;
  return Math.max(0, Math.floor((Date.now() - timestamp) / 86400000));
}

function titleizeStage(stage) {
  if (!stage) return "Sem etapa";
  return stage
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildSellerStatus({ openDeals, stalledDeals, wonDeals }) {
  if (stalledDeals >= 2) return "Atencao";
  if (wonDeals >= 2) return "Estavel";
  if (openDeals >= 3) return "Aquecendo";
  return "Rampa";
}

function buildDashboardData(owners, deals) {
  const integrationProfileEmail = owners.find((owner) => owner.email)?.email || "";
  const integrationProfileRole =
    owners.find((owner) => owner.teams?.some((team) => team.primary))?.teams?.find((team) => team.primary)?.name
    || owners.find((owner) => owner.teams?.[0])?.teams?.[0]?.name
    || "";
  const ownerMap = new Map(
    owners.map((owner) => [
      String(owner.id),
      {
        id: String(owner.id),
        name: [owner.firstName, owner.lastName].filter(Boolean).join(" ") || owner.email || "Sem nome",
        email: owner.email || "",
        team: owner.teams?.find((team) => team.primary)?.name || "Time comercial",
      },
    ]),
  );

  const dealsByOwner = new Map();
  const openDeals = [];
  const wonDeals = [];

  for (const deal of deals) {
    const properties = deal.properties || {};
    const ownerId = String(properties.hubspot_owner_id || "");
    const amount = parseAmount(properties.amount);
    const lastTouchDays = daysSince(properties.hs_lastmodifieddate);
    const stage = String(properties.dealstage || "");
    const isWon = stage.toLowerCase().includes("closedwon");
    const isClosed = stage.toLowerCase().includes("closed");

    const normalizedDeal = {
      id: deal.id,
      name: properties.dealname || `Negocio ${deal.id}`,
      ownerId,
      ownerName: ownerMap.get(ownerId)?.name || "Sem responsavel",
      amount,
      amountLabel: formatCurrency(amount),
      compactAmount: formatCompactCurrency(amount),
      stage,
      stageLabel: titleizeStage(stage),
      closeDate: properties.closedate || null,
      updatedAt: properties.hs_lastmodifieddate || null,
      lastTouchDays,
      isWon,
      isClosed,
    };

    if (!dealsByOwner.has(ownerId)) dealsByOwner.set(ownerId, []);
    dealsByOwner.get(ownerId).push(normalizedDeal);

    if (isWon) wonDeals.push(normalizedDeal);
    if (!isClosed) openDeals.push(normalizedDeal);
  }

  const sellers = [...dealsByOwner.entries()]
    .map(([ownerId, ownerDeals]) => {
      const owner = ownerMap.get(ownerId) || {
        name: "Sem responsavel",
        email: "",
        team: "Time comercial",
      };

      const ownerOpenDeals = ownerDeals.filter((deal) => !deal.isClosed);
      const ownerWonDeals = ownerDeals.filter((deal) => deal.isWon);
      const pipelineAmount = ownerOpenDeals.reduce((sum, deal) => sum + deal.amount, 0);
      const stalledDeals = ownerOpenDeals.filter((deal) => (deal.lastTouchDays || 0) >= 5);
      const metaPercent = ownerDeals.length ? Math.min(140, Math.round((ownerWonDeals.length / ownerDeals.length) * 100) || 0) : 0;

      return {
        id: ownerId,
        name: owner.name,
        email: owner.email,
        team: owner.team,
        initials: owner.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "SO",
        openDeals: ownerOpenDeals.length,
        wonDeals: ownerWonDeals.length,
        stalledDeals: stalledDeals.length,
        pipelineAmount,
        pipelineLabel: formatCurrency(pipelineAmount),
        compactPipeline: formatCompactCurrency(pipelineAmount),
        metaPercent,
        health: `${Math.max(5, 10 - stalledDeals.length)}/10`,
        status: buildSellerStatus({
          openDeals: ownerOpenDeals.length,
          stalledDeals: stalledDeals.length,
          wonDeals: ownerWonDeals.length,
        }),
        note:
          stalledDeals.length > 0
            ? `${stalledDeals.length} negocio(s) sem touch recente no pipeline.`
            : "Cadencia de follow-up dentro do esperado.",
      };
    })
    .sort((left, right) => right.pipelineAmount - left.pipelineAmount);

  const totalPipeline = openDeals.reduce((sum, deal) => sum + deal.amount, 0);
  const stalledDeals = openDeals.filter((deal) => (deal.lastTouchDays || 0) >= 5);
  const wonThisMonth = wonDeals
    .filter((deal) => {
      if (!deal.closeDate) return false;
      const date = new Date(deal.closeDate);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    })
    .reduce((sum, deal) => sum + deal.amount, 0);

  return {
    configured: true,
    syncedAt: new Date().toISOString(),
    integration: {
      status: "Ativa",
      owners: owners.length,
      deals: deals.length,
      pipelineAmount: totalPipeline,
      profileEmail: integrationProfileEmail,
      profileRole: integrationProfileRole,
    },
    summary: {
      sellersActive: sellers.length,
      totalPipeline,
      wonThisMonth,
      stalledDeals: stalledDeals.length,
    },
    sellers: sellers.slice(0, 12),
    alerts: stalledDeals
      .sort((left, right) => (right.lastTouchDays || 0) - (left.lastTouchDays || 0))
      .slice(0, 5)
      .map((deal) => [
        deal.ownerName,
        `${deal.name} sem touch ha ${deal.lastTouchDays || 0} dias`,
        (deal.lastTouchDays || 0) >= 10 ? "Alta" : "Media",
      ]),
    deals: openDeals
      .sort((left, right) => right.amount - left.amount)
      .slice(0, 12)
      .map((deal) => ({
        id: deal.id,
        name: deal.name,
        owner: deal.ownerName,
        stage: deal.stageLabel,
        amountLabel: deal.amountLabel,
        staleLabel: `${deal.lastTouchDays || 0}d sem touch`,
      })),
    reports: sellers.slice(0, 8).map((seller) => [
      seller.name,
      `${seller.metaPercent}%`,
      seller.pipelineLabel,
      seller.status,
    ]),
  };
}

export async function getHubSpotDashboardData() {
  const owners = await fetchPagedCollection("/crm/v3/owners?limit=100&archived=false");
  const deals = await fetchPagedCollection("/crm/v3/objects/deals?limit=100&archived=false&properties=dealname,amount,dealstage,pipeline,hubspot_owner_id,closedate,createdate,hs_lastmodifieddate");

  return buildDashboardData(owners, deals);
}
