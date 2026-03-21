// @ts-nocheck
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

export function getPipelineOptions(pipeline = {}) {
  const items = Array.isArray(pipeline?.items) ? pipeline.items : [];
  return items.map((item) => ({
    id: item.id,
    label: item.label,
  }));
}

export function getDefaultPipelineId(pipeline = {}) {
  const items = Array.isArray(pipeline?.items) ? pipeline.items : [];
  if (pipeline?.defaultPipelineId && items.some((item) => item.id === pipeline.defaultPipelineId)) {
    return pipeline.defaultPipelineId;
  }

  return items[0]?.id || "";
}

export function getVisibleDeals(deals, ownerFilter, activityWeeksFilter, pipelineFilter = "") {
  const maxDays = Number(activityWeeksFilter) * 7;
  return deals.filter((deal) => {
    const ownerMatch = ownerFilter === "todos" || deal.owner === ownerFilter;
    const activityMatch = parseStaleDays(deal.staleLabel) <= maxDays;
    const pipelineMatch = !pipelineFilter || deal.pipelineId === pipelineFilter;
    return ownerMatch && activityMatch && pipelineMatch;
  });
}

export function getBoardColumns(deals, pipeline = {}, selectedPipelineId = "") {
  const selectedPipeline = Array.isArray(pipeline?.items)
    ? pipeline.items.find((item) => item.id === selectedPipelineId)
    : null;
  const pipelineStages = Array.isArray(selectedPipeline?.stages) && selectedPipeline?.stages.length
    ? selectedPipeline.stages
    : (Array.isArray(pipeline?.stages) ? pipeline.stages : []);
  const knownStages = pipelineStages.map((stage) => ({
    id: stage.id || stage.label,
    label: stage.label,
  }));
  const dynamicStages = deals
    .filter((deal) => !knownStages.some((stage) => stage.label === deal.stage))
    .map((deal) => ({
      id: deal.stageId || deal.stage,
      label: deal.stage,
    }));
  const stages = [...knownStages, ...dynamicStages].filter((stage, index, array) =>
    stage?.label && array.findIndex((item) => item.label === stage.label) === index,
  );

  return stages.map((stage) => {
    const stageDeals = deals.filter((deal) => deal.stage === stage.label);
    const totalValue = stageDeals.reduce((sum, deal) => sum + parseCurrencyLabel(deal.amountLabel), 0);

    return {
      stage: stage.label,
      stageId: stage.id || stage.label,
      deals: stageDeals,
      count: stageDeals.length,
      totalLabel: formatCurrency(totalValue),
    };
  });
}

export function moveDealToStage(deals, draggedDealId, targetStage) {
  return deals.map((deal) =>
    deal.id === draggedDealId
      ? {
        ...deal,
        stage: targetStage.stageLabel,
        stageId: targetStage.stageId,
        staleLabel: "Atualizado agora",
        updatedAt: new Date().toISOString(),
      }
      : deal,
  );
}
