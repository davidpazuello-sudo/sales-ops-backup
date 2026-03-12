function normalizeComparable(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function slugify(value) {
  return normalizeComparable(value).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function formatDateKey(value, mode = "day") {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  if (mode === "week") {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - start.getDay());
    return start.toISOString().slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
}

function countRecentActivities(activities, kind, mode = "day") {
  const buckets = new Set(
    activities
      .filter((activity) => !kind || activity.kind === kind)
      .map((activity) => formatDateKey(activity.dueAt || activity.updatedAt || activity.createdAt, mode))
      .filter(Boolean),
  );

  if (!buckets.size) {
    return 0;
  }

  if (mode === "day") {
    const today = formatDateKey(new Date().toISOString(), "day");
    return activities.filter((activity) => (
      (!kind || activity.kind === kind)
      && formatDateKey(activity.dueAt || activity.updatedAt || activity.createdAt, "day") === today
    )).length;
  }

  const currentWeek = formatDateKey(new Date().toISOString(), "week");
  return activities.filter((activity) => (
    (!kind || activity.kind === kind)
    && formatDateKey(activity.dueAt || activity.updatedAt || activity.createdAt, "week") === currentWeek
  )).length;
}

function firstNonEmpty(values = []) {
  return values.find((value) => String(value || "").trim()) || "";
}

export function normalizeCampaignLabel(...values) {
  const label = firstNonEmpty(values)
    .replace(/\s+/g, " ")
    .trim();

  return label || "";
}

export function extractCampaignLabel(properties = {}) {
  const explicitLabel = normalizeCampaignLabel(
    properties.campaign_name,
    properties.campanha,
    properties.utm_campaign,
    properties.campaign_code,
    properties.hs_campaign,
    properties.hs_marketing_campaign,
  );

  if (explicitLabel) {
    return explicitLabel;
  }

  const fallbackAnalyticsLabel = normalizeCampaignLabel(
    properties.hs_analytics_source_data_2,
    properties.hs_analytics_source_data_1,
  );

  if (fallbackAnalyticsLabel && fallbackAnalyticsLabel.length <= 80) {
    return fallbackAnalyticsLabel;
  }

  return "";
}

export function createCampaignRecord(name, source = "hubspot") {
  const normalizedName = normalizeCampaignLabel(name, "Sem campanha identificada");

  return {
    id: slugify(normalizedName) || "sem-campanha-identificada",
    name: normalizedName,
    source,
    prospecting: {
      callsDaily: 0,
      callsWeekly: 0,
      connectionsDaily: 0,
      connectionsWeekly: 0,
      dailyCallTarget: 15,
      dailyConnectionTarget: 7,
    },
    qualification: {
      mqlCount: 0,
      sqlCount: 0,
      conversionRate: 0,
      targetSqls: 40,
    },
    sales: {
      proposalCount: 0,
      closedWonCount: 0,
      conversionRate: 0,
      targetClosedWon: 15,
    },
    smartGoals: [],
    meetingCount: 0,
    qualifiedOpportunityCount: 0,
    lastActivityAt: null,
  };
}

function buildGoalStatus(id, label, current, target) {
  const safeTarget = Math.max(0, target || 0);
  const progress = safeTarget ? Math.min(999, Math.round((current / safeTarget) * 100)) : 0;
  const remaining = Math.max(0, safeTarget - current);

  return {
    id,
    label,
    current,
    target: safeTarget,
    progress,
    remaining,
    status: current >= safeTarget ? "Meta atingida" : remaining <= Math.ceil(safeTarget * 0.2) ? "Em reta final" : "Em andamento",
  };
}

function isMql(contact = {}) {
  return normalizeComparable(contact.lifecycleStage) === "marketingqualifiedlead";
}

function isSql(contact = {}) {
  const lifecycle = normalizeComparable(contact.lifecycleStage);
  const leadStatus = normalizeComparable(contact.leadStatus);

  return lifecycle === "salesqualifiedlead"
    || leadStatus.includes("sql")
    || leadStatus.includes("qualified");
}

function isProposalDeal(deal = {}) {
  const stage = normalizeComparable(deal.stageLabel || deal.stageId);
  return stage.includes("proposta")
    || stage.includes("proposal")
    || stage.includes("cotacao")
    || stage.includes("orcamento");
}

function isQualifiedOpportunity(deal = {}) {
  const stage = normalizeComparable(deal.stageLabel || deal.stageId);
  if (deal.isClosed) {
    return false;
  }

  return stage.includes("qualif")
    || stage.includes("qualified")
    || stage.includes("discovery")
    || stage.includes("diagnost")
    || stage.includes("apresent")
    || stage.includes("proposta")
    || stage.includes("proposal")
    || stage.includes("negoci")
    || stage.includes("licit");
}

function toCampaignMap(records = [], source = "hubspot") {
  const campaignMap = new Map();

  records.forEach((record) => {
    const campaignName = normalizeCampaignLabel(record.campaignName, "Sem campanha identificada");
    const key = slugify(campaignName) || "sem-campanha-identificada";

    if (!campaignMap.has(key)) {
      campaignMap.set(key, createCampaignRecord(campaignName, source));
    }
  });

  return campaignMap;
}

export function buildCampaignSummaries({
  deals = [],
  contacts = [],
  activities = [],
  source = "hubspot",
} = {}) {
  const campaignMap = toCampaignMap([...deals, ...contacts, ...activities], source);

  if (!campaignMap.size) {
    return [];
  }

  for (const campaign of campaignMap.values()) {
    const campaignDeals = deals.filter((deal) => slugify(deal.campaignName || "Sem campanha identificada") === campaign.id);
    const campaignContacts = contacts.filter((contact) => slugify(contact.campaignName || "Sem campanha identificada") === campaign.id);
    const campaignActivities = activities.filter((activity) => slugify(activity.campaignName || "Sem campanha identificada") === campaign.id);

    const mqlCount = campaignContacts.filter(isMql).length;
    const sqlCount = campaignContacts.filter(isSql).length;
    const proposalCount = campaignDeals.filter(isProposalDeal).length;
    const closedWonCount = campaignDeals.filter((deal) => deal.isWon).length;
    const qualifiedOpportunityCount = campaignDeals.filter(isQualifiedOpportunity).length
      || campaignDeals.filter((deal) => !deal.isClosed).length;
    const meetingCount = campaignActivities.filter((activity) => activity.kind === "meeting").length;
    const connectionActivities = campaignActivities.filter((activity) => activity.kind !== "call");
    const lastActivity = [...campaignActivities]
      .map((activity) => activity.dueAt || activity.updatedAt || activity.createdAt || null)
      .filter(Boolean)
      .sort()
      .pop() || null;

    campaign.prospecting.callsDaily = countRecentActivities(campaignActivities, "call", "day");
    campaign.prospecting.callsWeekly = countRecentActivities(campaignActivities, "call", "week");
    campaign.prospecting.connectionsDaily = countRecentActivities(connectionActivities, "", "day");
    campaign.prospecting.connectionsWeekly = countRecentActivities(connectionActivities, "", "week");
    campaign.qualification.mqlCount = mqlCount;
    campaign.qualification.sqlCount = sqlCount;
    campaign.qualification.conversionRate = mqlCount ? Math.round((sqlCount / mqlCount) * 100) : 0;
    campaign.sales.proposalCount = proposalCount;
    campaign.sales.closedWonCount = closedWonCount;
    campaign.sales.conversionRate = proposalCount ? Math.round((closedWonCount / proposalCount) * 100) : 0;
    campaign.meetingCount = meetingCount;
    campaign.qualifiedOpportunityCount = qualifiedOpportunityCount;
    campaign.lastActivityAt = lastActivity;
    campaign.smartGoals = [
      buildGoalStatus("sqls", "Leads qualificados (SQLs)", sqlCount, 40),
      buildGoalStatus("meetings", "Reunioes agendadas", meetingCount, 70),
      buildGoalStatus("closed-won", "Contratos fechados", closedWonCount, 15),
      buildGoalStatus("qualified-opportunities", "Oportunidades qualificadas", qualifiedOpportunityCount, 65),
    ];
  }

  return [...campaignMap.values()].sort((left, right) => {
    const rightScore = right.qualifiedOpportunityCount + right.sales.closedWonCount + right.qualification.sqlCount;
    const leftScore = left.qualifiedOpportunityCount + left.sales.closedWonCount + left.qualification.sqlCount;

    if (rightScore !== leftScore) {
      return rightScore - leftScore;
    }

    return left.name.localeCompare(right.name, "pt-BR");
  });
}

export function getCampaignOptions(campaigns = []) {
  return campaigns.map((campaign) => ({
    id: campaign.id,
    label: campaign.name,
  }));
}

export function getDefaultCampaignId(campaigns = []) {
  const preferredCampaign = campaigns.find((campaign) => normalizeComparable(campaign?.name) === "aluno a bordo");
  return preferredCampaign?.id || "all";
}

export function getCampaignById(campaigns = [], campaignId = "") {
  return campaigns.find((campaign) => campaign.id === campaignId) || null;
}

export function aggregateCampaignSummary(campaigns = []) {
  if (!campaigns.length) {
    return createCampaignRecord("Todas as campanhas");
  }

  const aggregate = createCampaignRecord("Todas as campanhas");
  const goalAccumulators = {
    sqls: { current: 0, target: 0, label: "Leads qualificados (SQLs)" },
    meetings: { current: 0, target: 0, label: "Reunioes agendadas" },
    "closed-won": { current: 0, target: 0, label: "Contratos fechados" },
    "qualified-opportunities": { current: 0, target: 0, label: "Oportunidades qualificadas" },
  };

  campaigns.forEach((campaign) => {
    aggregate.prospecting.callsDaily += campaign.prospecting.callsDaily;
    aggregate.prospecting.callsWeekly += campaign.prospecting.callsWeekly;
    aggregate.prospecting.connectionsDaily += campaign.prospecting.connectionsDaily;
    aggregate.prospecting.connectionsWeekly += campaign.prospecting.connectionsWeekly;
    aggregate.qualification.mqlCount += campaign.qualification.mqlCount;
    aggregate.qualification.sqlCount += campaign.qualification.sqlCount;
    aggregate.sales.proposalCount += campaign.sales.proposalCount;
    aggregate.sales.closedWonCount += campaign.sales.closedWonCount;
    aggregate.meetingCount += campaign.meetingCount;
    aggregate.qualifiedOpportunityCount += campaign.qualifiedOpportunityCount;

    if (!aggregate.lastActivityAt || (campaign.lastActivityAt && campaign.lastActivityAt > aggregate.lastActivityAt)) {
      aggregate.lastActivityAt = campaign.lastActivityAt;
    }

    campaign.smartGoals.forEach((goal) => {
      if (!goalAccumulators[goal.id]) {
        return;
      }

      goalAccumulators[goal.id].current += goal.current;
      goalAccumulators[goal.id].target += goal.target;
    });
  });

  aggregate.qualification.conversionRate = aggregate.qualification.mqlCount
    ? Math.round((aggregate.qualification.sqlCount / aggregate.qualification.mqlCount) * 100)
    : 0;
  aggregate.sales.conversionRate = aggregate.sales.proposalCount
    ? Math.round((aggregate.sales.closedWonCount / aggregate.sales.proposalCount) * 100)
    : 0;
  aggregate.smartGoals = Object.entries(goalAccumulators).map(([id, goal]) => (
    buildGoalStatus(id, goal.label, goal.current, goal.target)
  ));

  return aggregate;
}
