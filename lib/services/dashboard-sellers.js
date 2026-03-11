import { parseCurrencyLabel } from "./dashboard-deals";

export function getMotivationStatus(seller) {
  if (seller.metaPercent >= 105 && seller.health >= 8) {
    return "Alto";
  }

  if (seller.metaPercent >= 90 && seller.health >= 6) {
    return "Medio";
  }

  return "Baixo";
}

export function getSellerDeals(dashboardData, sellerName) {
  return dashboardData.deals.filter((deal) => deal.owner === sellerName);
}

export function getSellerPipelineValue(deals) {
  return deals.reduce((sum, deal) => sum + parseCurrencyLabel(deal.amountLabel), 0);
}

export function getPendingSellerTasks(deals) {
  return deals.filter((deal) => Number.parseInt(deal.staleLabel, 10) >= 3).length;
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
