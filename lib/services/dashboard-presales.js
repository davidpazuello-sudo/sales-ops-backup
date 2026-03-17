const DAY_IN_MS = 86400000;

function normalizeComparable(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function matchesOwner(value, ownerFilter) {
  const normalizedFilter = normalizeComparable(ownerFilter);
  if (!normalizedFilter || normalizedFilter === "todos") {
    return true;
  }

  return normalizeComparable(value) === normalizedFilter;
}

function intersectsIds(values = [], idSet = new Set()) {
  return values.some((value) => idSet.has(String(value || "").trim()));
}

function getActivityContactIds(activity = {}, dealToContactIds = new Map()) {
  const relatedContactIds = new Set(
    (Array.isArray(activity.contactIds) ? activity.contactIds : [])
      .map((contactId) => String(contactId || "").trim())
      .filter(Boolean),
  );

  (Array.isArray(activity.dealIds) ? activity.dealIds : []).forEach((dealId) => {
    const normalizedDealId = String(dealId || "").trim();
    if (!normalizedDealId) {
      return;
    }

    const associatedContactIds = dealToContactIds.get(normalizedDealId) || [];
    associatedContactIds.forEach((contactId) => {
      if (contactId) {
        relatedContactIds.add(contactId);
      }
    });
  });

  return [...relatedContactIds];
}

function isQualifiedContact(contact = {}) {
  const lifecycleStage = normalizeComparable(contact.lifecycleStage);
  const leadStatus = normalizeComparable(contact.leadStatus);

  return lifecycleStage.includes("qualific")
    || lifecycleStage.includes("sales qualified")
    || lifecycleStage.includes("reuniao agendada")
    || leadStatus.includes("qualified")
    || leadStatus.includes("open deal");
}

function isScheduledMeeting(activity = {}) {
  if (activity.kind !== "meeting") {
    return false;
  }

  const status = normalizeComparable(activity.status);
  if (["no_show", "nao compareceu", "failed", "cancelled", "canceled", "cancelada"].includes(status)) {
    return false;
  }

  if (activity.isCompleted) {
    return false;
  }

  const dueTimestamp = activity.dueAt ? new Date(activity.dueAt).getTime() : Number.NaN;
  return Number.isFinite(dueTimestamp) ? dueTimestamp >= Date.now() : true;
}

function isCompletedMeeting(activity = {}) {
  if (activity.kind !== "meeting") {
    return false;
  }

  const status = normalizeComparable(activity.status);
  if (["no_show", "nao compareceu", "failed", "cancelled", "canceled", "cancelada"].includes(status)) {
    return false;
  }

  if (activity.isCompleted) {
    return true;
  }

  const dueTimestamp = activity.dueAt ? new Date(activity.dueAt).getTime() : Number.NaN;
  return Number.isFinite(dueTimestamp) && dueTimestamp < Date.now();
}

function needsMeetingReschedule(activity = {}) {
  if (activity.kind !== "meeting") {
    return false;
  }

  const status = normalizeComparable(activity.status);
  if (["no_show", "nao compareceu", "failed", "cancelled", "canceled", "cancelada"].includes(status)) {
    return true;
  }

  return Boolean(activity.isOverdue && !activity.isCompleted);
}

function formatAverage(value) {
  if (!Number.isFinite(value)) {
    return "0";
  }

  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 1,
  }).format(value);
}

function sortByDateDesc(left, right) {
  const leftTimestamp = left?.updatedAt ? new Date(left.updatedAt).getTime() : 0;
  const rightTimestamp = right?.updatedAt ? new Date(right.updatedAt).getTime() : 0;
  return rightTimestamp - leftTimestamp;
}

function sortByDueDateAsc(left, right) {
  const leftTimestamp = left?.dueAt ? new Date(left.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
  const rightTimestamp = right?.dueAt ? new Date(right.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
  return leftTimestamp - rightTimestamp;
}

function mapContactRow(contact = {}) {
  return {
    id: contact.id,
    title: contact.name || "Contato sem nome",
    subtitle: contact.ownerName || "Sem proprietario",
    meta: contact.phone || contact.email || "Sem telefone ou email",
    status: contact.leadStatus || contact.lifecycleStage || "Sem status",
    cells: [
      contact.ownerName || "Sem proprietario",
      contact.name || "Contato sem nome",
      contact.phone || contact.email || "Sem telefone ou email",
      contact.leadStatus || contact.lifecycleStage || "Sem status",
    ],
  };
}

function mapActivityRow(activity = {}) {
  return {
    id: activity.id,
    title: activity.title || activity.leadName || "Atividade sem titulo",
    subtitle: activity.leadName || "Lead nao associado",
    meta: activity.dueLabel || activity.ownerName || "Sem prazo definido",
    status: activity.statusLabel || "Sem status",
    cells: [
      activity.ownerName || "Sem proprietario",
      activity.title || activity.leadName || "Atividade sem titulo",
      activity.dueLabel || activity.ownerName || "Sem prazo definido",
      activity.statusLabel || "Sem status",
    ],
  };
}

function mapDealRow(deal = {}) {
  return {
    id: deal.id,
    title: deal.name || "Negocio sem nome",
    subtitle: deal.ownerName || "Sem proprietario",
    meta: deal.amountLabel || "Sem valor",
    status: deal.stageLabel || "Sem etapa",
    cells: [
      deal.ownerName || "Sem proprietario",
      deal.name || "Negocio sem nome",
      deal.amountLabel || "Sem valor",
      deal.stageLabel || "Sem etapa",
    ],
  };
}

function buildCallsPerContactRows(contacts = [], calls = []) {
  const callCountsByContactId = new Map();

  calls.forEach((activity) => {
    (Array.isArray(activity.relatedContactIds) ? activity.relatedContactIds : []).forEach((contactId) => {
      const normalizedContactId = String(contactId || "").trim();
      if (!normalizedContactId) {
        return;
      }

      callCountsByContactId.set(normalizedContactId, (callCountsByContactId.get(normalizedContactId) || 0) + 1);
    });
  });

  return contacts
    .map((contact) => ({
      contact,
      callCount: callCountsByContactId.get(contact.id) || 0,
    }))
    .filter((entry) => entry.callCount > 0)
    .sort((left, right) => right.callCount - left.callCount || sortByDateDesc(left.contact, right.contact))
    .map(({ contact, callCount }) => ({
      id: contact.id,
      title: contact.name || "Contato sem nome",
      subtitle: contact.ownerName || "Sem proprietario",
      meta: `${callCount} chamada(s)`,
      status: contact.leadStatus || contact.lifecycleStage || "Sem status",
      cells: [
        contact.ownerName || "Sem proprietario",
        contact.name || "Contato sem nome",
        `${callCount} chamada(s)`,
        contact.leadStatus || contact.lifecycleStage || "Sem status",
      ],
    }));
}

export function buildPreSalesSummary({
  contacts = [],
  deals = [],
  activities = [],
  ownerFilter = "todos",
} = {}) {
  const filteredContacts = contacts.filter((contact) => (
    matchesOwner(contact.ownerName, ownerFilter)
    || matchesOwner(contact.ownerEmail, ownerFilter)
  ));
  const filteredContactIds = new Set(filteredContacts.map((contact) => contact.id));
  const filteredDealIds = new Set(
    filteredContacts.flatMap((contact) => (Array.isArray(contact.dealIds) ? contact.dealIds : [])),
  );
  const dealToContactIds = filteredContacts.reduce((mapping, contact) => {
    (Array.isArray(contact.dealIds) ? contact.dealIds : []).forEach((dealId) => {
      const normalizedDealId = String(dealId || "").trim();
      if (!normalizedDealId) {
        return;
      }

      if (!mapping.has(normalizedDealId)) {
        mapping.set(normalizedDealId, []);
      }

      mapping.get(normalizedDealId).push(contact.id);
    });
    return mapping;
  }, new Map());

  const relatedActivities = activities
    .filter((activity) => {
      const relatedContactIds = getActivityContactIds(activity, dealToContactIds);
      return intersectsIds(relatedContactIds, filteredContactIds) || intersectsIds(activity.dealIds, filteredDealIds);
    })
    .map((activity) => ({
      ...activity,
      relatedContactIds: getActivityContactIds(activity, dealToContactIds),
    }));

  const connectedContactIds = new Set();
  relatedActivities.forEach((activity) => {
    activity.relatedContactIds.forEach((contactId) => connectedContactIds.add(contactId));
  });

  const calls = relatedActivities.filter((activity) => activity.kind === "call");
  const completedActivities = relatedActivities.filter((activity) => activity.isCompleted);
  const openActivities = relatedActivities.filter((activity) => !activity.isCompleted);
  const scheduledMeetings = relatedActivities.filter(isScheduledMeeting).sort(sortByDueDateAsc);
  const completedMeetings = relatedActivities.filter(isCompletedMeeting).sort(sortByDateDesc);
  const meetingsToReschedule = relatedActivities.filter(needsMeetingReschedule).sort(sortByDateDesc);
  const qualifiedContacts = filteredContacts.filter(isQualifiedContact).sort(sortByDateDesc);
  const contactsWithoutConnection = filteredContacts
    .filter((contact) => !connectedContactIds.has(contact.id))
    .sort(sortByDateDesc);
  const connectedContacts = filteredContacts
    .filter((contact) => connectedContactIds.has(contact.id))
    .sort(sortByDateDesc);
  const ownerDeals = deals
    .filter((deal) => intersectsIds(deal.contactIds, filteredContactIds))
    .sort(sortByDateDesc);
  const totalConnections = connectedContactIds.size;
  const averageCallsPerContact = filteredContacts.length
    ? calls.length / filteredContacts.length
    : 0;

  const nextSevenDaysTimestamp = Date.now() + (7 * DAY_IN_MS);
  const upcomingActivities = openActivities
    .filter((activity) => {
      const timestamp = activity.dueAt ? new Date(activity.dueAt).getTime() : Number.NaN;
      return Number.isFinite(timestamp) && timestamp <= nextSevenDaysTimestamp;
    })
    .sort(sortByDueDateAsc);

  return {
    ownerFilter,
    metrics: {
      totalContacts: filteredContacts.length,
      contactsWithoutConnection: contactsWithoutConnection.length,
      qualifiedContacts: qualifiedContacts.length,
      totalCalls: calls.length,
      averageCallsPerContact: formatAverage(averageCallsPerContact),
      totalConnections,
      activitiesDone: completedActivities.length,
      activitiesOpen: openActivities.length,
      scheduledMeetings: scheduledMeetings.length,
      completedMeetings: completedMeetings.length,
      meetingsToReschedule: meetingsToReschedule.length,
      opportunitiesWithDeals: ownerDeals.length,
    },
    details: {
      totalContacts: filteredContacts.map(mapContactRow),
      contactsWithoutConnection: contactsWithoutConnection.map(mapContactRow),
      qualifiedContacts: qualifiedContacts.map(mapContactRow),
      opportunitiesWithDeals: ownerDeals.map(mapDealRow),
      totalCalls: calls.map(mapActivityRow),
      averageCallsPerContact: buildCallsPerContactRows(filteredContacts, calls),
      totalConnections: connectedContacts.map(mapContactRow),
      activitiesDone: completedActivities.map(mapActivityRow),
      activitiesOpen: openActivities.map(mapActivityRow),
      scheduledMeetings: scheduledMeetings.map(mapActivityRow),
      completedMeetings: completedMeetings.map(mapActivityRow),
      meetingsToReschedule: meetingsToReschedule.map(mapActivityRow),
    },
    lists: {
      contactsWithoutConnection: contactsWithoutConnection.slice(0, 8).map(mapContactRow),
      qualifiedContacts: qualifiedContacts.slice(0, 8).map(mapContactRow),
      scheduledMeetings: scheduledMeetings.slice(0, 8).map(mapActivityRow),
      completedMeetings: completedMeetings.slice(0, 8).map(mapActivityRow),
      meetingsToReschedule: meetingsToReschedule.slice(0, 8).map(mapActivityRow),
      upcomingActivities: upcomingActivities.slice(0, 8).map(mapActivityRow),
    },
  };
}
