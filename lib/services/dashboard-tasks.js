function normalizeComparable(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function isTeamRole(role) {
  const normalizedRole = normalizeComparable(role);
  return ["admin", "supervisor", "gerente", "gestor", "manager"].includes(normalizedRole);
}

function sortNames(left, right) {
  return left.localeCompare(right, "pt-BR");
}

function getTaskTimestamp(task = {}) {
  const timestamp = task?.dueAt ? new Date(task.dueAt).getTime() : Number.NaN;
  return Number.isFinite(timestamp) ? timestamp : Number.NaN;
}

function isFutureTask(task = {}, referenceTime = Date.now()) {
  const timestamp = getTaskTimestamp(task);
  return Boolean(!task.isCompleted && Number.isFinite(timestamp) && timestamp >= referenceTime);
}

export function canViewTeamTasks(sessionUser = {}) {
  return Boolean(sessionUser?.isSuperAdmin || isTeamRole(sessionUser?.role));
}

export function isTaskOwnedBySession(task = {}, sessionUser = {}) {
  if (!task || !sessionUser) {
    return false;
  }

  const taskEmail = normalizeComparable(task.ownerEmail);
  const sessionEmail = normalizeComparable(sessionUser.email);
  if (taskEmail && sessionEmail) {
    return taskEmail === sessionEmail;
  }

  const taskName = normalizeComparable(task.ownerName);
  const sessionName = normalizeComparable(sessionUser.name);
  return Boolean(taskName && sessionName && taskName === sessionName);
}

export function getScopedTasks(tasks = [], sessionUser = {}) {
  if (canViewTeamTasks(sessionUser)) {
    return tasks;
  }

  return tasks.filter((task) => isTaskOwnedBySession(task, sessionUser));
}

export function getTaskOwnerOptions(tasks = []) {
  return Array.from(
    new Set(
      tasks
        .map((task) => String(task.ownerName || "").trim())
        .filter(Boolean),
    ),
  ).sort(sortNames);
}

export function getVisibleTasks(tasks = [], sessionUser = {}, {
  ownerFilter = "todos",
  typeFilter = "todos",
  statusFilter = "pending",
} = {}) {
  const scopedTasks = getScopedTasks(tasks, sessionUser).filter((task) => isFutureTask(task));
  const teamAccess = canViewTeamTasks(sessionUser);

  return scopedTasks.filter((task) => {
    const ownerMatch = !teamAccess || ownerFilter === "todos" || task.ownerName === ownerFilter;
    const typeMatch = typeFilter === "todos" || task.kind === typeFilter;
    const statusMatch = statusFilter === "todos"
      || (statusFilter === "completed" && task.isCompleted)
      || (statusFilter === "overdue" && task.isOverdue)
      || (statusFilter === "pending" && !task.isCompleted);

    return ownerMatch && typeMatch && statusMatch;
  });
}

export function buildUpcomingTaskSummary(tasks = []) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const tomorrowStart = todayStart + 86400000;
  const nextWeekStart = todayStart + (7 * 86400000);

  return tasks.reduce((summary, task) => {
    const timestamp = getTaskTimestamp(task);
    if (!Number.isFinite(timestamp)) {
      return summary;
    }

    summary.total += 1;

    if (timestamp >= todayStart && timestamp < tomorrowStart) {
      summary.today += 1;
    } else if (timestamp < nextWeekStart) {
      summary.thisWeek += 1;
    } else {
      summary.later += 1;
    }

    return summary;
  }, {
    total: 0,
    today: 0,
    thisWeek: 0,
    later: 0,
  });
}

export function groupTasksByKind(tasks = []) {
  return tasks.reduce((groups, task) => {
    if (task.kind === "meeting") {
      groups.meeting.push(task);
    } else if (task.kind === "call") {
      groups.call.push(task);
    } else {
      groups.task.push(task);
    }

    return groups;
  }, {
    meeting: [],
    call: [],
    task: [],
  });
}

export function buildTaskSummary(tasks = []) {
  return tasks.reduce((summary, task) => {
    summary.total += 1;

    if (task.isCompleted) {
      summary.completed += 1;
    } else {
      summary.open += 1;
    }

    if (task.isOverdue) {
      summary.overdue += 1;
    }

    if (task.kind === "meeting") {
      summary.meetings += 1;
    } else if (task.kind === "call") {
      summary.calls += 1;
    } else {
      summary.other += 1;
    }

    return summary;
  }, {
    total: 0,
    open: 0,
    overdue: 0,
    completed: 0,
    meetings: 0,
    calls: 0,
    other: 0,
  });
}
