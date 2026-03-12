import { hasMinimumRole } from "lib/role-access";
import { createAdminClient } from "lib/supabase/admin";
import { hasSupabaseAdminEnv } from "lib/supabase/shared";
import { listNotificationsForUser } from "lib/access-requests-store";

const MEETINGS_TABLE = "meetings";
const AUDIT_LOGS_TABLE = "audit_logs";
const SYSTEM_EVENTS_TABLE = "system_events";

function normalizeText(value, fallback = "") {
  const normalized = String(value || "").trim();
  return normalized || fallback;
}

function formatDateLabel(value) {
  if (!value) {
    return "Sem data";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Sem data";
  }

  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(date);
}

function formatTimeLabel(value) {
  if (!value) {
    return "Sem horario";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Sem horario";
  }

  return new Intl.DateTimeFormat("pt-BR", { timeStyle: "short" }).format(date);
}

function buildLogWhen(value) {
  if (!value) {
    return "Sem registro";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Sem registro";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function buildMeetingSlug(title, id) {
  return String(`${title || "reuniao"}-${id || ""}`)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function mapHubSpotMeeting(task) {
  return {
    id: task.id,
    externalId: task.externalId || task.id,
    slug: buildMeetingSlug(task.title, task.externalId || task.id),
    title: task.title,
    summary: task.description || task.statusLabel || "Reuniao sincronizada com a HubSpot.",
    meetingAt: task.dueAt || null,
    dateLabel: formatDateLabel(task.dueAt),
    timeLabel: formatTimeLabel(task.dueAt),
    type: task.taskTypeLabel || "Reuniao",
    owner: task.ownerName || "Sem responsavel",
    ownerEmail: task.ownerEmail || "",
    hubspotOwnerId: task.ownerId || "",
    statusLabel: task.statusLabel || "Agendada",
    notes: task.description || "",
    audioUrl: "",
    audioLabel: "",
    source: task.source || "hubspot",
    createdAt: task.updatedAt || task.dueAt || null,
  };
}

function mapPersistedMeeting(record) {
  const payload = record.payload || {};
  const title = normalizeText(record.title, "Reuniao interna");
  const recordId = normalizeText(record.external_id || record.id);
  const ownerName = normalizeText(payload.owner_name, record.owner_email || "Sem responsavel");

  return {
    id: normalizeText(record.id),
    externalId: recordId,
    slug: buildMeetingSlug(title, recordId),
    title,
    summary: normalizeText(record.notes, "Registro operacional salvo no Supabase."),
    meetingAt: record.meeting_at || null,
    dateLabel: formatDateLabel(record.meeting_at),
    timeLabel: formatTimeLabel(record.meeting_at),
    type: normalizeText(record.type, "Reuniao"),
    owner: ownerName,
    ownerEmail: normalizeText(record.owner_email),
    hubspotOwnerId: normalizeText(record.hubspot_owner_id),
    statusLabel: normalizeText(record.outcome, "Registrada"),
    notes: normalizeText(record.notes),
    audioUrl: normalizeText(record.recording_url),
    audioLabel: record.recording_url ? "Gravacao disponivel" : "",
    source: normalizeText(record.source, "internal"),
    createdAt: record.created_at || null,
  };
}

function mapAuditLog(record) {
  const actor = normalizeText(record.actor_email || record.actor_role, "Sistema");
  const entityType = normalizeText(record.entity_type).replace(/_/g, " ");
  const entityId = normalizeText(record.entity_id);
  const suffix = entityId ? ` (${entityId})` : "";

  return {
    id: normalizeText(record.id),
    actor,
    action: `${normalizeText(record.action).replace(/\./g, " ")} - ${entityType}${suffix}`.trim(),
    when: buildLogWhen(record.created_at),
    route: normalizeText(record.route),
    level: normalizeText(record.status, "info"),
    source: "audit",
  };
}

function mapSystemEvent(record) {
  return {
    id: normalizeText(record.id),
    when: buildLogWhen(record.created_at),
    message: normalizeText(record.message, normalizeText(record.event, "Evento operacional")),
    severity: normalizeText(record.level, "info"),
    route: normalizeText(record.route),
    source: "system",
  };
}

function mapNotification(record) {
  return {
    id: normalizeText(record.id),
    title: normalizeText(record.title, "Notificacao"),
    body: normalizeText(record.body),
    tag: normalizeText(record.tag),
    createdAt: record.createdAt || null,
    read: Boolean(record.read),
    trash: Boolean(record.trash),
    requestId: normalizeText(record.requestId),
  };
}

function dedupeMeetings(meetings) {
  const seen = new Set();

  return meetings.filter((meeting) => {
    const key = normalizeText(meeting.externalId || meeting.id);
    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export async function listPersistedMeetingsForUser(user) {
  if (!hasSupabaseAdminEnv() || !user?.email) {
    return [];
  }

  const supabase = createAdminClient();
  let query = supabase
    .from(MEETINGS_TABLE)
    .select("id, external_id, owner_email, hubspot_owner_id, title, type, outcome, meeting_at, recording_url, notes, source, payload, created_at")
    .order("meeting_at", { ascending: false, nullsFirst: false })
    .limit(100);

  if (!hasMinimumRole(user, "Supervisor")) {
    query = query.eq("owner_email", user.email);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return Array.isArray(data) ? data.map(mapPersistedMeeting) : [];
}

export async function listOperationalLogsForUser(user) {
  if (!hasSupabaseAdminEnv() || !user?.email) {
    return {
      auditLogs: [],
      syncLogs: [],
    };
  }

  const supabase = createAdminClient();
  let auditQuery = supabase
    .from(AUDIT_LOGS_TABLE)
    .select("id, actor_email, actor_role, action, entity_type, entity_id, status, route, created_at")
    .order("created_at", { ascending: false })
    .limit(8);

  if (!hasMinimumRole(user, "Admin")) {
    auditQuery = auditQuery.eq("actor_email", user.email);
  }

  let systemQuery = supabase
    .from(SYSTEM_EVENTS_TABLE)
    .select("id, event, level, route, actor_email, message, created_at")
    .order("created_at", { ascending: false })
    .limit(8);

  if (!hasMinimumRole(user, "Supervisor")) {
    systemQuery = systemQuery.eq("actor_email", user.email);
  }

  const [{ data: auditData, error: auditError }, { data: systemData, error: systemError }] = await Promise.all([
    auditQuery,
    systemQuery,
  ]);

  if (auditError) {
    throw auditError;
  }

  if (systemError) {
    throw systemError;
  }

  return {
    auditLogs: Array.isArray(auditData) ? auditData.map(mapAuditLog) : [],
    syncLogs: Array.isArray(systemData)
      ? systemData
        .filter((item) => ["error", "warn", "warning", "info"].includes(normalizeText(item.level, "info").toLowerCase()))
        .map(mapSystemEvent)
      : [],
  };
}

export async function listOperationalNotificationsForUser(user) {
  if (!user?.isSuperAdmin) {
    return [];
  }

  try {
    const notifications = await listNotificationsForUser(user.email);
    return Array.isArray(notifications) ? notifications.map(mapNotification) : [];
  } catch {
    return [];
  }
}

export async function enrichDashboardWithOperationalData(dashboardData, user) {
  const [persistedMeetings, logData, notifications] = await Promise.all([
    listPersistedMeetingsForUser(user).catch(() => []),
    listOperationalLogsForUser(user).catch(() => ({ auditLogs: [], syncLogs: [] })),
    listOperationalNotificationsForUser(user),
  ]);

  const hubspotMeetings = (dashboardData.tasks || [])
    .filter((task) => task.kind === "meeting")
    .map(mapHubSpotMeeting);

  return {
    ...dashboardData,
    meetings: dedupeMeetings([...persistedMeetings, ...hubspotMeetings]).sort((left, right) => {
      const leftTime = left.meetingAt ? new Date(left.meetingAt).getTime() : 0;
      const rightTime = right.meetingAt ? new Date(right.meetingAt).getTime() : 0;
      return rightTime - leftTime;
    }),
    auditLogs: logData.auditLogs,
    syncLogs: logData.syncLogs,
    notifications,
  };
}

export async function createOperationalMeeting({
  actorUser,
  title,
  summary,
  meetingAt,
  type,
  ownerName,
  ownerEmail,
  hubspotOwnerId,
} = {}) {
  if (!hasSupabaseAdminEnv()) {
    throw new Error("SUPABASE_ADMIN_UNAVAILABLE");
  }

  const normalizedTitle = normalizeText(title);
  const normalizedMeetingAt = normalizeText(meetingAt);

  if (!normalizedTitle || !normalizedMeetingAt) {
    throw new Error("MEETING_FIELDS_REQUIRED");
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from(MEETINGS_TABLE)
    .insert({
      external_id: `internal-${Date.now()}`,
      owner_user_id: actorUser?.id || null,
      owner_email: normalizeText(ownerEmail, actorUser?.email || ""),
      hubspot_owner_id: normalizeText(hubspotOwnerId),
      title: normalizedTitle,
      type: normalizeText(type, "Reuniao"),
      outcome: "Registrada",
      meeting_at: normalizedMeetingAt,
      notes: normalizeText(summary),
      source: "internal",
      payload: {
        owner_name: normalizeText(ownerName),
        created_by_email: normalizeText(actorUser?.email),
        created_by_role: normalizeText(actorUser?.role),
      },
    })
    .select("id, external_id, owner_email, hubspot_owner_id, title, type, outcome, meeting_at, recording_url, notes, source, payload, created_at")
    .single();

  if (error) {
    throw error;
  }

  return mapPersistedMeeting(data);
}
