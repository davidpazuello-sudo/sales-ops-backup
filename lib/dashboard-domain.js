function normalizeString(value, fallback = "") {
  const normalized = String(value || "").trim();
  return normalized || fallback;
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

function mapActivityStatus(rawStatus, objectType) {
  const normalizedStatus = normalizeString(rawStatus).toUpperCase();
  const statusMap = {
    NOT_STARTED: "Nao iniciada",
    WAITING: "Em espera",
    IN_PROGRESS: "Em andamento",
    COMPLETED: "Concluida",
    CANCELED: "Cancelada",
    CANCELLED: "Cancelada",
    SCHEDULED: objectType === "meeting" ? "Agendada" : "Programada",
    RESCHEDULED: "Reagendada",
    BUSY: "Concluida",
    NO_ANSWER: "Sem resposta",
    LEFT_VOICEMAIL: "Voicemail",
    CONNECTED: "Conectada",
  };
  const completedStatuses = new Set(["COMPLETED", "BUSY", "CONNECTED"]);
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
    name: normalizeString(name, owner.email || "Sem nome"),
    email: normalizeString(owner.email),
    team: normalizeString(primaryTeam || backupTeam, "Time comercial"),
  };
}

export function normalizeHubSpotDeal(deal, ownerMap) {
  const properties = deal.properties || {};
  const ownerId = normalizeString(properties.hubspot_owner_id);
  const owner = ownerMap.get(ownerId);
  const amount = parseAmount(properties.amount);
  const stageId = normalizeString(properties.dealstage);
  const stageLabel = titleizeStage(stageId);
  const lastTouchDays = daysSince(properties.hs_lastmodifieddate);
  const isWon = stageId.toLowerCase().includes("closedwon");
  const isClosed = stageId.toLowerCase().includes("closed");

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
    pipelineId: normalizeString(properties.pipeline, "default"),
    closeDate: properties.closedate || null,
    updatedAt: properties.hs_lastmodifieddate || null,
    createdAt: properties.createdate || null,
    lastTouchDays,
    staleLabel: `${lastTouchDays || 0}d sem touch`,
    isWon,
    isClosed,
  };
}

export function normalizeHubSpotActivity(activity, ownerMap, objectType = "task") {
  const properties = activity.properties || {};
  const ownerId = normalizeString(properties.hubspot_owner_id);
  const owner = ownerMap.get(ownerId);
  const { kind, kindLabel } = resolveActivityKind(objectType, properties.hs_task_type);
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
    status: statusInfo.status,
    statusLabel: statusInfo.statusLabel,
    isCompleted: statusInfo.isCompleted,
    isOverdue: Boolean(!statusInfo.isCompleted && Number.isFinite(dueTimestamp) && dueTimestamp < Date.now()),
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
    source: "hubspot",
  };
}

export function buildPipelineStages(deals) {
  const grouped = new Map();

  for (const deal of deals) {
    const key = deal.stageId || deal.stageLabel || "sem-etapa";
    const current = grouped.get(key) || {
      id: key,
      label: deal.stageLabel || "Sem etapa",
      count: 0,
      totalAmount: 0,
      totalLabel: formatCurrency(0),
      isClosed: false,
    };

    current.count += 1;
    current.totalAmount += deal.amount || 0;
    current.totalLabel = formatCurrency(current.totalAmount);
    current.isClosed = current.isClosed || Boolean(deal.isClosed);
    grouped.set(key, current);
  }

  return [...grouped.values()].sort((left, right) => {
    if (left.isClosed !== right.isClosed) {
      return left.isClosed ? 1 : -1;
    }
    return left.label.localeCompare(right.label, "pt-BR");
  });
}

export function buildSellerSummaries(owners, deals) {
  const dealsByOwner = new Map();

  for (const deal of deals) {
    if (!dealsByOwner.has(deal.ownerId)) {
      dealsByOwner.set(deal.ownerId, []);
    }
    dealsByOwner.get(deal.ownerId).push(deal);
  }

  return owners
    .map((owner) => {
      const ownerDeals = dealsByOwner.get(owner.id) || [];
      const ownerOpenDeals = ownerDeals.filter((deal) => !deal.isClosed);
      const ownerWonDeals = ownerDeals.filter((deal) => deal.isWon);
      const stalledDeals = ownerOpenDeals.filter((deal) => (deal.lastTouchDays || 0) >= 5);
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
        note: stalledDeals.length
          ? `${stalledDeals.length} negocio(s) sem touch recente no pipeline.`
          : "Cadencia de follow-up dentro do esperado.",
      };
    })
    .sort((left, right) => right.pipelineAmount - left.pipelineAmount);
}

export function buildDashboardDomainPayload(rawOwners, rawDeals, rawActivities = {}) {
  const owners = rawOwners.map(normalizeHubSpotOwner);
  const ownerMap = new Map(owners.map((owner) => [owner.id, owner]));
  const deals = rawDeals.map((deal) => normalizeHubSpotDeal(deal, ownerMap));
  const sellers = buildSellerSummaries(owners, deals);
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
  const pipelineStages = buildPipelineStages(openDeals);
  const activityItems = [
    ...(rawActivities.meetings || []).map((activity) => normalizeHubSpotActivity(activity, ownerMap, "meeting")),
    ...(rawActivities.calls || []).map((activity) => normalizeHubSpotActivity(activity, ownerMap, "call")),
    ...(rawActivities.tasks || []).map((activity) => normalizeHubSpotActivity(activity, ownerMap, "task")),
  ].sort(sortActivities);

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
        ownerEmail: deal.ownerEmail,
        ownerId: deal.ownerId,
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
