import { parseCurrencyLabel } from "./dashboard-deals";

function normalizeComparable(value) {
  return String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function resolveSellerIdentity(sellerOrName) {
  if (sellerOrName && typeof sellerOrName === "object") {
    return {
      id: String(sellerOrName.id || "").trim(),
      email: String(sellerOrName.email || "").trim().toLowerCase(),
      name: String(sellerOrName.name || "").trim(),
    };
  }

  return {
    id: "",
    email: "",
    name: String(sellerOrName || "").trim(),
  };
}

function matchSellerRecord(record, sellerIdentity) {
  const recordOwnerId = String(record?.ownerId || record?.hubspotOwnerId || "").trim();
  const recordOwnerEmail = String(record?.ownerEmail || "").trim().toLowerCase();
  const recordOwnerName = normalizeComparable(record?.owner || record?.ownerName || "");

  if (sellerIdentity.id && recordOwnerId === sellerIdentity.id) {
    return true;
  }

  if (sellerIdentity.email && recordOwnerEmail === sellerIdentity.email) {
    return true;
  }

  return Boolean(sellerIdentity.name) && recordOwnerName === normalizeComparable(sellerIdentity.name);
}

export function getMotivationStatus(seller) {
  if (seller.metaPercent >= 105 && seller.health >= 8) {
    return "Alto";
  }

  if (seller.metaPercent >= 90 && seller.health >= 6) {
    return "Medio";
  }

  return "Baixo";
}

export function getSellerDeals(dashboardData, sellerOrName) {
  const sellerIdentity = resolveSellerIdentity(sellerOrName);
  return dashboardData.deals.filter((deal) => matchSellerRecord(deal, sellerIdentity));
}

export function getSellerPipelineValue(deals) {
  return deals.reduce((sum, deal) => sum + parseCurrencyLabel(deal.amountLabel), 0);
}

export function getPendingSellerTasks(dashboardData, sellerOrName) {
  const sellerIdentity = resolveSellerIdentity(sellerOrName);
  const activityItems = Array.isArray(dashboardData?.tasks) ? dashboardData.tasks : [];
  const pendingActivities = activityItems.filter((item) => !item.isCompleted && matchSellerRecord(item, sellerIdentity));

  if (pendingActivities.length) {
    return pendingActivities.length;
  }

  return getSellerDeals(dashboardData, sellerOrName)
    .filter((deal) => Number.parseInt(deal.staleLabel, 10) >= 3)
    .length;
}

export function getSellerConversionRate(seller) {
  return seller.openDeals + seller.wonDeals > 0
    ? Math.round((seller.wonDeals / (seller.openDeals + seller.wonDeals)) * 100)
    : 0;
}

export function getSellerActivityKpis(seller) {
  return [
    ["Chamadas", `${seller.openDeals * 7}`],
    ["Emails", `${seller.openDeals * 12}`],
    ["Reunioes", `${Math.max(2, seller.wonDeals * 2)}`],
  ];
}

export function getSellerKanbanColumns(deals) {
  return [
    { title: "Discovery", count: deals.filter((deal) => deal.stage.toLowerCase().includes("discovery")).length },
    { title: "Proposal", count: deals.filter((deal) => deal.stage.toLowerCase().includes("proposal")).length },
    { title: "Negotiation", count: deals.filter((deal) => deal.stage.toLowerCase().includes("negotiation")).length },
    { title: "Commit", count: deals.filter((deal) => deal.stage.toLowerCase().includes("commit")).length },
  ];
}

export function getMaxKanbanCount(columns) {
  return Math.max(1, ...columns.map((column) => column.count));
}

export function getStageDeals(deals, selectedStage) {
  if (!selectedStage) {
    return [];
  }

  return deals.filter((deal) => deal.stage.toLowerCase().includes(selectedStage.toLowerCase()));
}
