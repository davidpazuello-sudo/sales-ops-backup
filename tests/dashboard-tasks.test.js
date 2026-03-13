import { describe, expect, it } from "vitest";
import {
  buildUpcomingTaskSummary,
  buildTaskSummary,
  canViewTeamTasks,
  getTaskOwnerOptions,
  getVisibleTasks,
  groupTasksByKind,
} from "../lib/services/dashboard-tasks";

const now = Date.now();
const futureSoon = new Date(now + (3 * 86400000)).toISOString();
const futureLater = new Date(now + (12 * 86400000)).toISOString();
const pastDate = new Date(now - (3 * 86400000)).toISOString();

const tasks = [
  {
    id: "meeting-1",
    ownerEmail: "ana@empresa.com",
    ownerName: "Ana Souza",
    kind: "meeting",
    isCompleted: false,
    isOverdue: false,
    dueAt: futureSoon,
  },
  {
    id: "call-1",
    ownerEmail: "ana@empresa.com",
    ownerName: "Ana Souza",
    kind: "call",
    isCompleted: false,
    isOverdue: true,
    dueAt: pastDate,
  },
  {
    id: "task-1",
    ownerEmail: "bruno@empresa.com",
    ownerName: "Bruno Lima",
    kind: "task",
    isCompleted: true,
    isOverdue: false,
    dueAt: futureLater,
  },
  {
    id: "task-2",
    ownerEmail: "bruno@empresa.com",
    ownerName: "Bruno Lima",
    kind: "task",
    isCompleted: false,
    isOverdue: false,
    dueAt: futureLater,
  },
  {
    id: "task-3",
    ownerEmail: "ana@empresa.com",
    ownerName: "Ana Souza",
    kind: "task",
    isCompleted: false,
    isOverdue: false,
    dueAt: null,
  },
];

describe("dashboard tasks", () => {
  it("grants team visibility to supervisor, gerente and admin roles", () => {
    expect(canViewTeamTasks({ role: "Supervisor" })).toBe(true);
    expect(canViewTeamTasks({ role: "Gerente" })).toBe(true);
    expect(canViewTeamTasks({ role: "Gestor" })).toBe(true);
    expect(canViewTeamTasks({ role: "Vendedor" })).toBe(false);
  });

  it("limits vendedores to their own tasks", () => {
    const visibleTasks = getVisibleTasks(tasks, {
      role: "Vendedor",
      email: "ana@empresa.com",
    }, {
      statusFilter: "todos",
    });

    expect(visibleTasks.map((task) => task.id)).toEqual(["meeting-1", "call-1", "task-3"]);
  });

  it("lets supervisors filter the full list by vendedor", () => {
    const visibleTasks = getVisibleTasks(tasks, {
      role: "Supervisor",
    }, {
      ownerFilter: "Bruno Lima",
      statusFilter: "todos",
    });

    expect(visibleTasks.map((task) => task.id)).toEqual(["task-1", "task-2"]);
    expect(getTaskOwnerOptions(tasks)).toEqual(["Ana Souza", "Bruno Lima"]);
  });

  it("summarizes and groups tasks by type", () => {
    const visibleTasks = getVisibleTasks(tasks, { role: "Supervisor" }, { statusFilter: "todos" });
    const groupedTasks = groupTasksByKind(visibleTasks);
    const summary = buildTaskSummary(visibleTasks);
    const upcomingSummary = buildUpcomingTaskSummary(visibleTasks);

    expect(groupedTasks.meeting).toHaveLength(1);
    expect(groupedTasks.call).toHaveLength(1);
    expect(groupedTasks.task).toHaveLength(3);
    expect(summary).toEqual({
      total: 5,
      open: 4,
      overdue: 1,
      completed: 1,
      meetings: 1,
      calls: 1,
      other: 3,
    });
    expect(upcomingSummary).toEqual({
      total: 5,
      today: 0,
      thisWeek: 1,
      later: 2,
    });
  });
});
