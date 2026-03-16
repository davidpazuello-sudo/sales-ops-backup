import {
  buildCampaignSummaries,
  extractCampaignLabel,
  inferPrimaryCampaignLabel,
  normalizeCampaignLabel,
} from "./services/dashboard-campaigns";

function normalizeString(value, fallback = "") {
  const normalized = String(value || "").trim();
  return normalized || fallback;
}

function normalizeComparable(value) {
  return normalizeString(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

const HUBSPOT_CONTACT_LIFECYCLE_STAGE_LABELS = {
  "244303003": "Prospect",
  "1316715089": "1 tentativa",
  "1316738991": "2 tentativa",
  "1316741890": "3 tentativa",
  "1316887836": "4 tentativa",
  "1316738992": "Reuniao agendada",
  "1320556150": "Telefone incorreto",
  "1320496031": "Telefone atualizado",
  "1321207898": "Desqualificado",
};

const HUBSPOT_CONTACT_LEAD_STATUS_LABELS = {
  OPEN: "Open",
  NEW: "New",
  ATTEMPTED_TO_CONTACT: "Attempted to contact",
  Connected: "Connected",
  OPEN_DEAL: "Qualified",
  UNQUALIFIED: "Unqualified",
  "Conection Failed": "Connection failed",
};

function normalizeHubSpotLifecycleStage(value) {
  const normalizedValue = normalizeString(value);
  return HUBSPOT_CONTACT_LIFECYCLE_STAGE_LABELS[normalizedValue] || normalizedValue;
}

function normalizeHubSpotLeadStatus(value) {
  const normalizedValue = normalizeString(value);
  return HUBSPOT_CONTACT_LEAD_STATUS_LABELS[normalizedValue] || normalizedValue;
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

function toIsoDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function formatDateTimeLabel(value, fallback = "Sem data") {
  const nextDate = value ? new Date(value) : null;
  if (!nextDate || Number.isNaN(nextDate.getTime())) {
    return fallback;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(nextDate);
}

function getAssociationIds(record, associationType) {
  const entries = record?.associations?.[associationType]?.results || [];
  return entries
    .map((item) => normalizeString(item?.id))
    .filter(Boolean);
}

function titleizeStage(stage) {
  if (!stage) return "Sem etapa";
  return stage
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function isClosedStageLabel(value) {
  const normalized = normalizeComparable(value);
  return normalized.includes("closed")
    || normalized.includes("fechado")
    || normalized.includes("ganho")
    || normalized.includes("perdido");
}

function isWonStageLabel(value) {
  const normalized = normalizeComparable(value);
  return normalized.includes("closedwon")
    || normalized.includes("closed won")
    || normalized.includes("ganho")
    || normalized.includes("won");
}

function toBoolean(value) {
  if (typeof value === "boolean") {
    return value;
  }

  const normalized = normalizeComparable(value);
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

function normalizeHubSpotPipelines(rawPipelines = []) {
  return rawPipelines
    .map((pipeline) => ({
      id: normalizeString(pipeline?.id),
      label: normalizeString(pipeline?.label, titleizeStage(pipeline?.id || "Pipeline")),
      displayOrder: Number(pipeline?.displayOrder || 0),
      stages: Array.isArray(pipeline?.stages)
        ? pipeline.stages
          .map((stage) => ({
            id: normalizeString(stage?.id),
            label: normalizeString(stage?.label, titleizeStage(stage?.id || "Etapa")),
            displayOrder: Number(stage?.displayOrder || 0),
            isClosed: toBoolean(stage?.metadata?.isClosed) || isClosedStageLabel(stage?.label || stage?.id),
          }))
          .filter((stage) => stage.id)
          .sort((left, right) => left.displayOrder - right.displayOrder)
        : [],
    }))
    .filter((pipeline) => pipeline.id)
    .sort((left, right) => left.displayOrder - right.displayOrder);
}

function buildPipelineRegistry(pipelines = []) {
  const pipelineById = new Map();
  const stageByPipelineKey = new Map();
  const stageById = new Map();

  pipelines.forEach((pipeline) => {
    pipelineById.set(pipeline.id, pipeline);
    pipeline.stages.forEach((stage) => {
      stageByPipelineKey.set(`${pipeline.id}:${stage.id}`, stage);
      if (!stageById.has(stage.id)) {
        stageById.set(stage.id, stage);
      }
    });
  });

  const preferredPipeline = pipelines.find((pipeline) => normalizeComparable(pipeline.label) === "brasil publico");

  return {
    pipelineById,
    stageByPipelineKey,
    stageById,
    defaultPipelineId: preferredPipeline?.id || pipelines[0]?.id || "",
  };
}

function buildSellerStatus({ openDeals, stalledDeals, wonDeals }) {
  if (stalledDeals >= 2) return "Atencao";
  if (wonDeals >= 2) return "Estavel";
  if (openDeals >= 3) return "Aquecendo";
  return "Rampa";
}

function mapActivityStatus(rawStatus, objectType) {
  const normalizedStatus = normalizeString(rawStatus).toUpperCase();
  const statusMap = {
    NOT_STARTED: "Nao iniciada",
    WAITING: "Em espera",
    QUEUED: objectType === "call" ? "Agendada" : "Na fila",
    RINGING: "Tocando",
    CONNECTING: "Conectando",
    IN_PROGRESS: "Em andamento",
    COMPLETED: "Concluida",
    CANCELED: "Cancelada",
    CANCELLED: "Cancelada",
    SCHEDULED: objectType === "meeting" ? "Agendada" : "Programada",
    RESCHEDULED: "Reagendada",
    BUSY: "Concluida",
    NO_ANSWER: "Sem resposta",
    NO_SHOW: "Nao compareceu",
    FAILED: "Falhou",
    LEFT_VOICEMAIL: "Voicemail",
    CONNECTED: "Conectada",
  };
  const completedStatuses = new Set([
    "COMPLETED",
    "BUSY",
    "CONNECTED",
    "CANCELED",
    "CANCELLED",
    "NO_SHOW",
    "FAILED",
  ]);
  const label = statusMap[normalizedStatus] || titleizeStage(normalizedStatus || "pendente");

  return {
    status: normalizedStatus || "PENDING",
    statusLabel: label,
    isCompleted: completedStatuses.has(normalizedStatus),
  };
}

function mapActivityPriority(rawPriority) {
  const normalizedPriority = normalizeString(rawPriority).toUpperCase();
  const priorityMap = {
    HIGH: "Alta",
    MEDIUM: "Media",
    LOW: "Baixa",
  };

  return priorityMap[normalizedPriority] || "Padrao";
}

function resolveActivityKind(objectType, rawTaskType) {
  const normalizedTaskType = normalizeString(rawTaskType).toUpperCase();

  if (objectType === "meeting" || normalizedTaskType.includes("MEETING")) {
    return {
      kind: "meeting",
      kindLabel: "Reuniao",
    };
  }

  if (objectType === "call" || normalizedTaskType.includes("CALL")) {
    return {
      kind: "call",
      kindLabel: "Chamada",
    };
  }

  return {
    kind: "task",
    kindLabel: "Outra tarefa",
  };
}

function buildTaskTitle(properties, kindLabel, id) {
  return normalizeString(
    properties.hs_task_subject
      || properties.hs_call_title
      || properties.hs_meeting_title,
    `${kindLabel} ${id}`,
  );
}

function buildTaskDescription(properties) {
  return normalizeString(
    properties.hs_task_body
      || properties.hs_call_body
      || properties.hs_meeting_body
      || properties.hs_internal_meeting_notes,
  );
}

function sortActivities(left, right) {
  if (left.isCompleted !== right.isCompleted) {
    return left.isCompleted ? 1 : -1;
  }

  if (left.isOverdue !== right.isOverdue) {
    return left.isOverdue ? -1 : 1;
  }

  const leftTime = left.dueAt ? new Date(left.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
  const rightTime = right.dueAt ? new Date(right.dueAt).getTime() : Number.MAX_SAFE_INTEGER;

  if (leftTime !== rightTime) {
    return leftTime - rightTime;
  }

  return left.title.localeCompare(right.title, "pt-BR");
}

export function normalizeHubSpotOwner(owner) {
  const name = [owner.firstName, owner.lastName].filter(Boolean).join(" ");
  const primaryTeam = owner.teams?.find((team) => team.primary)?.name;
  const backupTeam = owner.teams?.[0]?.name;

  return {
    id: normalizeString(owner.id),
    hubspotOwnerId: normalizeString(owner.id),
    userId: normalizeString(owner.userId || owner.userIdIncludingInactive),
    name: normalizeString(name, owner.email || "Sem nome"),
    email: normalizeString(owner.email),
    team: normalizeString(primaryTeam || backupTeam, "Time comercial"),
  };
}

function normalizeHubSpotHistorySourceIds(sourceId) {
  if (!sourceId) {
    return [];
  }

  if (typeof sourceId === "object") {
    return [
      sourceId.userId,
      sourceId.ownerId,
      sourceId.id,
      sourceId.email,
      sourceId.label,
      sourceId.name,
    ].map((value) => normalizeString(value)).filter(Boolean);
  }

  const normalizedSource = normalizeString(sourceId);
  if (!normalizedSource) {
    return [];
  }

  try {
    const parsedSource = JSON.parse(normalizedSource);
    return normalizeHubSpotHistorySourceIds(parsedSource);
  } catch {
    return [normalizedSource];
  }
}

function resolveHubSpotHistoryActor(entry, owners = []) {
  const explicitLabel = normalizeString(
    entry?.sourceLabel || entry?.sourceName || entry?.updatedBy || entry?.updatedByName,
  );
  if (explicitLabel) {
    return explicitLabel;
  }

  const sourceCandidates = normalizeHubSpotHistorySourceIds(
    entry?.sourceId || entry?.sourceID || entry?.source_id || entry?.["source-id"],
  );
  if (!sourceCandidates.length) {
    return "";
  }

  const normalizedCandidates = sourceCandidates.map((candidate) => normalizeComparable(candidate));
  const matchedOwner = owners.find((owner) => {
    const ownerCandidates = [
      owner.id,
      owner.userId,
      owner.email,
      owner.name,
    ].map((value) => normalizeComparable(value)).filter(Boolean);

    return normalizedCandidates.some((candidate) => ownerCandidates.includes(candidate));
  });

  if (matchedOwner) {
    return matchedOwner.name || matchedOwner.email || sourceCandidates[0];
  }

  return sourceCandidates[0];
}

function resolveLifecycleUpdatedBy(contact, owners = []) {
  const lifecycleHistory = contact?.propertiesWithHistory?.lifecyclestage;
  if (!Array.isArray(lifecycleHistory) || !lifecycleHistory.length) {
    return "";
  }

  const latestDisqualificationEntry = [...lifecycleHistory]
    .filter((entry) => normalizeComparable(normalizeHubSpotLifecycleStage(entry?.value)).includes("desqual"))
    .sort((left, right) => new Date(right?.timestamp || 0).getTime() - new Date(left?.timestamp || 0).getTime())
    [0];

  if (!latestDisqualificationEntry) {
    return "";
  }

  return resolveHubSpotHistoryActor(latestDisqualificationEntry, owners);
}

export function normalizeHubSpotContact(contact, ownerMap, owners = []) {
  const properties = contact.properties || {};
  const ownerId = normalizeString(properties.hubspot_owner_id);
  const owner = ownerMap.get(ownerId);

  return {
    id: normalizeString(contact.id),
    name: normalizeString(
      [properties.firstname, properties.lastname].filter(Boolean).join(" "),
      properties.email || `Contato ${contact.id}`,
    ),
    email: normalizeString(properties.email),
    phone: normalizeString(properties.phone || properties.mobilephone),
    ownerId,
    ownerName: owner?.name || "Sem responsavel",
    ownerEmail: owner?.email || "",
    lifecycleStage: normalizeHubSpotLifecycleStage(properties.lifecyclestage),
    leadStatus: normalizeHubSpotLeadStatus(properties.hs_lead_status),
    lifecycleUpdatedBy: normalizeString(resolveLifecycleUpdatedBy(contact, owners)),
    campaignName: normalizeCampaignLabel(extractCampaignLabel(properties)),
    createdAt: toIsoDate(properties.createdate),
    updatedAt: toIsoDate(properties.lastmodifieddate || properties.createdate),
    dealIds: getAssociationIds(contact, "deals"),
  };
}

export function normalizeHubSpotDeal(deal, ownerMap, contactMap = new Map(), pipelineRegistry = {}) {
  const properties = deal.properties || {};
  const ownerId = normalizeString(properties.hubspot_owner_id);
  const owner = ownerMap.get(ownerId);
  const amount = parseAmount(properties.amount);
  const pipelineId = normalizeString(properties.pipeline, pipelineRegistry.defaultPipelineId || "default");
  const pipeline = pipelineRegistry.pipelineById?.get(pipelineId);
  const stageId = normalizeString(properties.dealstage);
  const stage = pipelineRegistry.stageByPipelineKey?.get(`${pipelineId}:${stageId}`)
    || pipelineRegistry.stageById?.get(stageId);
  const stageLabel = stage?.label || titleizeStage(stageId);
  const pipelineLabel = pipeline?.label || titleizeStage(pipelineId);
  const lastTouchDays = daysSince(properties.hs_lastmodifieddate);
  const isWon = Boolean(stage?.isClosed && isWonStageLabel(stageLabel || stageId)) || isWonStageLabel(stageLabel || stageId);
  const isClosed = Boolean(stage?.isClosed) || isClosedStageLabel(stageLabel || stageId);
  const contactIds = getAssociationIds(deal, "contacts");
  const associatedContacts = contactIds
    .map((contactId) => contactMap.get(contactId))
    .filter(Boolean);
  const campaignName = normalizeCampaignLabel(
    extractCampaignLabel(properties),
    ...associatedContacts.map((contact) => contact.campaignName),
    inferPrimaryCampaignLabel(properties.dealname),
  );

  return {
    id: normalizeString(deal.id),
    hubspotDealId: normalizeString(deal.id),
    name: normalizeString(properties.dealname, `Negocio ${deal.id}`),
    ownerId,
    ownerName: owner?.name || "Sem responsavel",
    ownerEmail: owner?.email || "",
    amount,
    amountLabel: formatCurrency(amount),
    compactAmount: formatCompactCurrency(amount),
    stageId,
    stageLabel,
    pipelineId,
    pipelineLabel,
    closeDate: properties.closedate || null,
    updatedAt: properties.hs_lastmodifieddate || null,
    createdAt: properties.createdate || null,
    campaignName,
    contactIds,
    lastTouchDays,
    staleLabel: `${lastTouchDays || 0}d sem touch`,
    isWon,
    isClosed,
  };
}

export function normalizeHubSpotActivity(activity, ownerMap, objectType = "task", contactMap = new Map(), dealMap = new Map()) {
  const properties = activity.properties || {};
  const ownerId = normalizeString(properties.hubspot_owner_id);
  const owner = ownerMap.get(ownerId);
  const { kind, kindLabel } = resolveActivityKind(objectType, properties.hs_task_type);
  const createdAt = toIsoDate(properties.createdate);
  const dueAt = toIsoDate(
    properties.hs_meeting_start_time
      || properties.hs_timestamp
      || properties.hs_lastmodifieddate
      || properties.createdate,
  );
  const statusInfo = mapActivityStatus(
    properties.hs_task_status
      || properties.hs_call_status
      || properties.hs_meeting_outcome
      || properties.hs_activity_type,
    objectType,
  );
  const dueTimestamp = dueAt ? new Date(dueAt).getTime() : Number.NaN;
  const contactIds = getAssociationIds(activity, "contacts");
  const dealIds = getAssociationIds(activity, "deals");
  const associatedContacts = contactIds
    .map((contactId) => contactMap.get(contactId))
    .filter(Boolean);
  const associatedDeals = dealIds
    .map((dealId) => dealMap.get(dealId))
    .filter(Boolean);
  const campaignName = normalizeCampaignLabel(
    extractCampaignLabel(properties),
    ...associatedDeals.map((deal) => deal.campaignName),
    ...associatedContacts.map((contact) => contact.campaignName),
    inferPrimaryCampaignLabel(
      properties.hs_task_subject,
      properties.hs_call_title,
      properties.hs_meeting_title,
    ),
  );

  return {
    id: `${objectType}-${normalizeString(activity.id)}`,
    externalId: normalizeString(activity.id),
    objectType,
    kind,
    kindLabel,
    title: buildTaskTitle(properties, kindLabel, activity.id),
    description: buildTaskDescription(properties),
    ownerId,
    ownerName: owner?.name || "Sem responsavel",
    ownerEmail: owner?.email || "",
    ownerTeam: owner?.team || "",
    leadName: associatedContacts[0]?.name || associatedDeals[0]?.name || "Lead nao associado",
    status: statusInfo.status,
    statusLabel: statusInfo.statusLabel,
    isCompleted: statusInfo.isCompleted,
    isOverdue: Boolean(!statusInfo.isCompleted && Number.isFinite(dueTimestamp) && dueTimestamp < Date.now()),
    createdAt,
    dueAt,
    dueLabel: formatDateTimeLabel(
      dueAt,
      objectType === "meeting" ? "Sem agendamento" : "Sem prazo definido",
    ),
    priority: mapActivityPriority(properties.hs_task_priority),
    taskTypeLabel: kind === "task"
      ? titleizeStage(normalizeString(properties.hs_task_type, "follow_up"))
      : kindLabel,
    updatedAt: toIsoDate(properties.hs_lastmodifieddate || properties.createdate) || dueAt,
    contactIds,
    dealIds,
    campaignName,
    source: "hubspot",
  };
}

export function buildPipelineStages(deals, selectedPipelineId = "", pipelineDefinitions = []) {
  const grouped = new Map();
  const pipeline = pipelineDefinitions.find((item) => item.id === selectedPipelineId);

  (pipeline?.stages || []).forEach((stage) => {
    grouped.set(stage.id, {
      id: stage.id,
      label: stage.label,
      count: 0,
      totalAmount: 0,
      totalLabel: formatCurrency(0),
      isClosed: Boolean(stage.isClosed),
      displayOrder: Number(stage.displayOrder || 0),
    });
  });

  for (const deal of deals) {
    const key = deal.stageId || deal.stageLabel || "sem-etapa";
    const current = grouped.get(key) || {
      id: key,
      label: deal.stageLabel || "Sem etapa",
      count: 0,
      totalAmount: 0,
      totalLabel: formatCurrency(0),
      isClosed: false,
      displayOrder: Number.MAX_SAFE_INTEGER,
    };

    current.count += 1;
    current.totalAmount += deal.amount || 0;
    current.totalLabel = formatCurrency(current.totalAmount);
    current.isClosed = current.isClosed || Boolean(deal.isClosed);
    grouped.set(key, current);
  }

  return [...grouped.values()].sort((left, right) => {
    if (left.displayOrder !== right.displayOrder) {
      return left.displayOrder - right.displayOrder;
    }
    if (left.isClosed !== right.isClosed) {
      return left.isClosed ? 1 : -1;
    }
    return left.label.localeCompare(right.label, "pt-BR");
  });
}

export function buildSellerSummaries(owners, deals, activities = []) {
  const dealsByOwner = new Map();
  const activitiesByOwner = new Map();

  for (const deal of deals) {
    if (!dealsByOwner.has(deal.ownerId)) {
      dealsByOwner.set(deal.ownerId, []);
    }
    dealsByOwner.get(deal.ownerId).push(deal);
  }

  for (const activity of activities) {
    if (!activity.ownerId) {
      continue;
    }

    if (!activitiesByOwner.has(activity.ownerId)) {
      activitiesByOwner.set(activity.ownerId, []);
    }
    activitiesByOwner.get(activity.ownerId).push(activity);
  }

  return owners
    .map((owner) => {
      const ownerDeals = dealsByOwner.get(owner.id) || [];
      const ownerOpenDeals = ownerDeals.filter((deal) => !deal.isClosed);
      const ownerWonDeals = ownerDeals.filter((deal) => deal.isWon);
      const stalledDeals = ownerOpenDeals.filter((deal) => (deal.lastTouchDays || 0) >= 5);
      const ownerActivities = activitiesByOwner.get(owner.id) || [];
      const pendingActivities = ownerActivities.filter((activity) => !activity.isCompleted);
      const totalMeetings = ownerActivities.filter((activity) => activity.kind === "meeting").length;
      const pipelineAmount = ownerOpenDeals.reduce((sum, deal) => sum + deal.amount, 0);
      const metaPercent = ownerDeals.length
        ? Math.min(140, Math.round((ownerWonDeals.length / ownerDeals.length) * 100) || 0)
        : 0;

      return {
        id: owner.id,
        name: owner.name,
        email: owner.email,
        team: owner.team,
        initials: owner.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "SO",
        totalDeals: ownerDeals.length,
        openDeals: ownerOpenDeals.length,
        wonDeals: ownerWonDeals.length,
        stalledDeals: stalledDeals.length,
        pendingActivities: pendingActivities.length,
        meetingsCount: totalMeetings,
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
        note: stalledDeals.length
          ? `${stalledDeals.length} negocio(s) sem touch recente no pipeline.`
          : "Cadencia de follow-up dentro do esperado.",
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));
}

export function buildDashboardDomainPayload(rawOwners, rawDeals, rawActivities = {}, rawPipelines = [], options = {}) {
  const owners = rawOwners.map(normalizeHubSpotOwner);
  const pipelines = normalizeHubSpotPipelines(rawPipelines);
  const pipelineRegistry = buildPipelineRegistry(pipelines);
  const ownerMap = new Map(owners.map((owner) => [owner.id, owner]));
  const contacts = (rawActivities.contacts || []).map((contact) => normalizeHubSpotContact(contact, ownerMap, owners));
  const contactMap = new Map(contacts.map((contact) => [contact.id, contact]));
  const deals = rawDeals.map((deal) => normalizeHubSpotDeal(deal, ownerMap, contactMap, pipelineRegistry));
  const dealMap = new Map(deals.map((deal) => [deal.id, deal]));
  const openDeals = deals.filter((deal) => !deal.isClosed);
  const wonDeals = deals.filter((deal) => deal.isWon);
  const stalledDeals = openDeals.filter((deal) => (deal.lastTouchDays || 0) >= 5);
  const totalPipeline = openDeals.reduce((sum, deal) => sum + deal.amount, 0);
  const wonThisMonth = wonDeals
    .filter((deal) => {
      if (!deal.closeDate) return false;
      const date = new Date(deal.closeDate);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    })
    .reduce((sum, deal) => sum + deal.amount, 0);
  const defaultPipelineId = pipelineRegistry.defaultPipelineId;
  const defaultPipelineDeals = defaultPipelineId
    ? openDeals.filter((deal) => deal.pipelineId === defaultPipelineId)
    : openDeals;
  const pipelineStages = buildPipelineStages(defaultPipelineDeals, defaultPipelineId, pipelines);
  const activityItems = [
    ...(rawActivities.meetings || []).map((activity) => normalizeHubSpotActivity(activity, ownerMap, "meeting", contactMap, dealMap)),
    ...(rawActivities.calls || []).map((activity) => normalizeHubSpotActivity(activity, ownerMap, "call", contactMap, dealMap)),
    ...(rawActivities.tasks || []).map((activity) => normalizeHubSpotActivity(activity, ownerMap, "task", contactMap, dealMap)),
  ].sort(sortActivities);
  const sellers = buildSellerSummaries(owners, deals, activityItems);
  const campaigns = buildCampaignSummaries({
    deals,
    contacts,
    activities: activityItems,
    source: "hubspot",
  }, {
    includeDetails: options.includeCampaignDetails !== false,
    detailKey: options.campaignDetailKey || "",
    selectedCampaignName: options.selectedCampaignName || "",
  });

  return {
    configured: true,
    syncedAt: new Date().toISOString(),
    integration: {
      status: "Ativa",
      source: "hubspot",
      owners: owners.length,
      deals: rawDeals.length,
      pipelineAmount: totalPipeline,
      ownerDirectory: owners,
      profileEmail: owners.find((owner) => owner.email)?.email || "",
      profileRole: owners.find((owner) => owner.team)?.team || "",
    },
    summary: {
      sellersActive: sellers.length,
      totalPipeline,
      wonThisMonth,
      stalledDeals: stalledDeals.length,
    },
    states: {
      source: "hubspot",
      loading: "ready",
      empty: {
        sellers: sellers.length === 0,
        deals: deals.length === 0,
        alerts: stalledDeals.length === 0,
      },
      errors: [],
    },
    pipeline: {
      stages: pipelineStages,
      totalOpenDeals: openDeals.length,
      totalClosedDeals: deals.filter((deal) => deal.isClosed).length,
      items: pipelines,
      defaultPipelineId,
    },
    sellers,
    campaigns,
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
      .map((deal) => ({
        id: deal.id,
        name: deal.name,
        owner: deal.ownerName,
        ownerEmail: deal.ownerEmail,
        ownerId: deal.ownerId,
        pipelineId: deal.pipelineId,
        pipelineLabel: deal.pipelineLabel,
        stage: deal.stageLabel,
        stageId: deal.stageId,
        amount: deal.amount,
        amountLabel: deal.amountLabel,
        staleLabel: deal.staleLabel,
        lastTouchDays: deal.lastTouchDays,
        updatedAt: deal.updatedAt,
        isWon: deal.isWon,
        isClosed: deal.isClosed,
      })),
    tasks: activityItems,
    reports: sellers.slice(0, 8).map((seller) => [
      seller.name,
      `${seller.metaPercent}%`,
      seller.pipelineLabel,
      seller.status,
    ]),
  };
}
