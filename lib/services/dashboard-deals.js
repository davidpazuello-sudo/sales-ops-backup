export function parseCurrencyLabel(label) {
  const numericValue = Number.parseFloat(
    String(label).replace(/[^\d,]/g, "").replace(/\./g, "").replace(",", "."),
  );

  return Number.isNaN(numericValue) ? 0 : numericValue;
}

export function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCurrencyFromLabel(label) {
  const parsed = parseCurrencyLabel(label);
  if (!parsed) {
    return label;
  }

  return formatCurrency(parsed);
}

export function parseStaleDays(staleLabel) {
  const days = Number.parseInt(String(staleLabel), 10);
  return Number.isNaN(days) ? 0 : days;
}

export function getOwnerOptions(deals) {
  return Array.from(new Set(deals.map((deal) => deal.owner))).sort((a, b) => a.localeCompare(b));
}

export function getVisibleDeals(deals, ownerFilter, activityWeeksFilter) {
  const maxDays = Number(activityWeeksFilter) * 7;
  return deals.filter((deal) => {
    const ownerMatch = ownerFilter === "todos" || deal.owner === ownerFilter;
    const activityMatch = parseStaleDays(deal.staleLabel) <= maxDays;
    return ownerMatch && activityMatch;
  });
}

export function getBoardColumns(deals, stageOrder) {
  const stages = Array.from(new Set([...stageOrder, ...deals.map((deal) => deal.stage)])).filter(Boolean);

  return stages.map((stage) => {
    const stageDeals = deals.filter((deal) => deal.stage === stage);
    const totalValue = stageDeals.reduce((sum, deal) => sum + parseCurrencyLabel(deal.amountLabel), 0);

    return {
      stage,
      deals: stageDeals,
      count: stageDeals.length,
      totalLabel: formatCurrency(totalValue),
    };
  });
}

export function moveDealToStage(deals, draggedDealId, targetStage) {
  return deals.map((deal) =>
    deal.id === draggedDealId
      ? { ...deal, stage: targetStage, staleLabel: "Atualizado agora" }
      : deal,
  );
}
