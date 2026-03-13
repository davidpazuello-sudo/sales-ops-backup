function normalizeComparable(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export const PRIMARY_CAMPAIGN_NAME = "Aluno a Bordo";
export const PRIMARY_CAMPAIGN_CONTACT_VALUE = "Aluno a Bordo 2026";
const PRIMARY_CAMPAIGN_CANONICAL_VALUE = PRIMARY_CAMPAIGN_CONTACT_VALUE;
const PRIMARY_CAMPAIGN_ALIASES = [
  PRIMARY_CAMPAIGN_NAME,
  PRIMARY_CAMPAIGN_CONTACT_VALUE,
  "Aluno a bordo 2026",
  "Aluno a Bordo e Pais Conectados",
  "Aluno a bordo e Pais Conectados",
];

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

function hasPrimaryCampaignKeywords(value) {
  const normalized = normalizeComparable(value);
  return normalized.includes("aluno") && normalized.includes("bordo");
}

export function inferPrimaryCampaignLabel(...values) {
  const explicitPrimaryAlias = values.find((value) => (
    PRIMARY_CAMPAIGN_ALIASES.some((alias) => normalizeComparable(alias) === normalizeComparable(value))
  ));

  if (explicitPrimaryAlias) {
    return PRIMARY_CAMPAIGN_CANONICAL_VALUE;
  }

  if (values.some((value) => hasPrimaryCampaignKeywords(value))) {
    return PRIMARY_CAMPAIGN_CANONICAL_VALUE;
  }

  if (values.some((value) => normalizeComparable(value) === "true")) {
    return PRIMARY_CAMPAIGN_CANONICAL_VALUE;
  }

  return "";
}

export function normalizeCampaignLabel(...values) {
  const inferredPrimaryCampaign = inferPrimaryCampaignLabel(...values);
  if (inferredPrimaryCampaign) {
    return inferredPrimaryCampaign;
  }

  const label = firstNonEmpty(values)
    .replace(/\s+/g, " ")
    .trim();

  return label || "";
}

export function extractCampaignLabel(properties = {}) {
  const explicitLabel = normalizeCampaignLabel(
    properties.campanhas,
    properties.campaign_name,
    properties.campanha,
    properties.lap_campaign_name,
    properties.utm_campaign,
    properties.campaign_code,
    properties.hs_campaign,
    properties.hs_marketing_campaign,
    properties.hs_analytics_first_touch_converting_campaign,
    properties.hs_analytics_last_touch_converting_campaign,
    properties.first_utm_data,
    properties.latest_utm,
  );

  if (explicitLabel) {
    return explicitLabel;
  }

  const fallbackPrimaryMarker = inferPrimaryCampaignLabel(
    properties.alunos_a_bordo_contatos,
    properties.dealname,
  );

  if (fallbackPrimaryMarker) {
    return fallbackPrimaryMarker;
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
      totalLeads: 0,
      mqlCount: 0,
      sqlCount: 0,
      conversionRate: 0,
      targetSqls: 40,
      totalLeadItems: [],
      sqlLeadItems: [],
    },
    sales: {
      proposalCount: 0,
      closedWonCount: 0,
      conversionRate: 0,
      targetClosedWon: 15,
      closedWonItems: [],
    },
    smartGoals: [],
    meetings: [],
    qualifiedOpportunityItems: [],
    meetingCount: 0,
    qualifiedOpportunityCount: 0,
    lastActivityAt: null,
  };
}

function shouldIncludeCampaignDetail(includeDetails, detailKey, requestedDetailKey = "") {
  if (!includeDetails) {
    return false;
  }

  if (!requestedDetailKey) {
    return true;
  }

  return detailKey === requestedDetailKey;
}

export function isPrimaryCampaignName(value) {
  const normalizedValue = normalizeComparable(value);
  return normalizedValue === normalizeComparable(PRIMARY_CAMPAIGN_NAME)
    || normalizedValue === normalizeComparable(PRIMARY_CAMPAIGN_CONTACT_VALUE)
    || PRIMARY_CAMPAIGN_ALIASES.some((alias) => normalizeComparable(alias) === normalizedValue)
    || hasPrimaryCampaignKeywords(value);
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

function getCampaignRecordKey(value) {
  const normalizedName = normalizeCampaignLabel(value, "Sem campanha identificada");
  return slugify(normalizedName) || "sem-campanha-identificada";
}

export function buildCampaignSummaries({
  deals = [],
  contacts = [],
  activities = [],
  source = "hubspot",
} = {}, {
  includeDetails = true,
  detailKey = "",
} = {}) {
  const filteredDeals = deals.filter((deal) => isPrimaryCampaignName(deal?.campaignName));
  const filteredContacts = contacts.filter((contact) => isPrimaryCampaignName(contact?.campaignName));
  const filteredActivities = activities.filter((activity) => isPrimaryCampaignName(activity?.campaignName));
  const campaignMap = toCampaignMap([...filteredDeals, ...filteredContacts, ...filteredActivities], source);

  if (!campaignMap.size) {
    return [];
  }

  for (const campaign of campaignMap.values()) {
    const campaignDeals = filteredDeals.filter((deal) => getCampaignRecordKey(deal.campaignName) === campaign.id);
    const campaignContacts = filteredContacts.filter((contact) => getCampaignRecordKey(contact.campaignName) === campaign.id);
    const campaignActivities = filteredActivities.filter((activity) => getCampaignRecordKey(activity.campaignName) === campaign.id);

    const totalLeads = campaignContacts.length;
    const mqlCount = campaignContacts.filter(isMql).length;
    const sqlCount = campaignContacts.filter(isSql).length;
    const proposalCount = campaignDeals.filter(isProposalDeal).length;
    const closedWonCount = campaignDeals.filter((deal) => deal.isWon).length;
    const qualifiedOpportunityCount = campaignDeals.filter(isQualifiedOpportunity).length
      || campaignDeals.filter((deal) => !deal.isClosed).length;
    const totalLeadItems = shouldIncludeCampaignDetail(includeDetails, "totalLeads", detailKey)
      ? campaignContacts.map((contact) => ({
        id: contact.id,
        ownerName: contact.ownerName || "Sem responsavel",
        leadName: contact.name || contact.email || "Lead sem nome",
        statusLabel: contact.leadStatus || contact.lifecycleStage || "Sem status",
        detailLabel: contact.email || "Sem email",
      }))
      : [];
    const sqlLeadItems = shouldIncludeCampaignDetail(includeDetails, "sqls", detailKey)
      ? campaignContacts
        .filter(isSql)
        .map((contact) => ({
          id: contact.id,
          ownerName: contact.ownerName || "Sem responsavel",
          leadName: contact.name || contact.email || "Lead sem nome",
          statusLabel: contact.leadStatus || contact.lifecycleStage || "SQL",
          detailLabel: contact.email || "Sem email",
        }))
      : [];
    const closedWonItems = shouldIncludeCampaignDetail(includeDetails, "closedWon", detailKey)
      ? campaignDeals
        .filter((deal) => deal.isWon)
        .map((deal) => ({
          id: deal.id,
          ownerName: deal.ownerName || "Sem responsavel",
          recordName: deal.name || "Negocio sem nome",
          statusLabel: deal.stageLabel || "Fechado",
          detailLabel: deal.amountLabel || "Sem valor",
        }))
      : [];
    const qualifiedOpportunityItems = shouldIncludeCampaignDetail(includeDetails, "qualifiedOpportunities", detailKey)
      ? campaignDeals
        .filter((deal) => isQualifiedOpportunity(deal) || !deal.isClosed)
        .map((deal) => ({
          id: deal.id,
          ownerName: deal.ownerName || "Sem responsavel",
          recordName: deal.name || "Negocio sem nome",
          statusLabel: deal.stageLabel || "Sem etapa",
          detailLabel: deal.amountLabel || "Sem valor",
        }))
      : [];
    const meetingActivities = campaignActivities.filter((activity) => activity.kind === "meeting");
    const meetingItems = shouldIncludeCampaignDetail(includeDetails, "meetings", detailKey)
      ? campaignActivities
        .filter((activity) => activity.kind === "meeting")
        .map((activity) => ({
          id: activity.id,
          ownerName: activity.ownerName || "Sem responsavel",
          leadName: activity.leadName || "Lead nao associado",
          dateLabel: activity.dueLabel || "Sem data",
          statusLabel: activity.statusLabel || "Sem status",
        }))
      : [];
    const meetingCount = meetingActivities.length;
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
    campaign.qualification.totalLeads = totalLeads;
    campaign.qualification.totalLeadItems = totalLeadItems;
    campaign.qualification.mqlCount = mqlCount;
    campaign.qualification.sqlCount = sqlCount;
    campaign.qualification.conversionRate = mqlCount ? Math.round((sqlCount / mqlCount) * 100) : 0;
    campaign.qualification.sqlLeadItems = sqlLeadItems;
    campaign.sales.proposalCount = proposalCount;
    campaign.sales.closedWonCount = closedWonCount;
    campaign.sales.conversionRate = proposalCount ? Math.round((closedWonCount / proposalCount) * 100) : 0;
    campaign.sales.closedWonItems = closedWonItems;
    campaign.meetings = meetingItems;
    campaign.meetingCount = meetingCount;
    campaign.qualifiedOpportunityItems = qualifiedOpportunityItems;
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
  const preferredCampaign = campaigns.find((campaign) => isPrimaryCampaignName(campaign?.name));
  return preferredCampaign?.id || "";
}

export function getCampaignById(campaigns = [], campaignId = "") {
  return campaigns.find((campaign) => campaign.id === campaignId) || null;
}

export function getPrimaryCampaign(campaigns = []) {
  return campaigns.find((campaign) => isPrimaryCampaignName(campaign?.name)) || null;
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
    aggregate.qualification.totalLeads += campaign.qualification.totalLeads || 0;
    aggregate.qualification.totalLeadItems.push(...(campaign.qualification.totalLeadItems || []));
    aggregate.qualification.mqlCount += campaign.qualification.mqlCount;
    aggregate.qualification.sqlCount += campaign.qualification.sqlCount;
    aggregate.qualification.sqlLeadItems.push(...(campaign.qualification.sqlLeadItems || []));
    aggregate.sales.proposalCount += campaign.sales.proposalCount;
    aggregate.sales.closedWonCount += campaign.sales.closedWonCount;
    aggregate.sales.closedWonItems.push(...(campaign.sales.closedWonItems || []));
    aggregate.meetings.push(...(campaign.meetings || []));
    aggregate.meetingCount += campaign.meetingCount;
    aggregate.qualifiedOpportunityItems.push(...(campaign.qualifiedOpportunityItems || []));
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
