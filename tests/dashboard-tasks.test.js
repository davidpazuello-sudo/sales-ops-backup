import { describe, expect, it } from "vitest";
import {
  buildTaskSummary,
  canViewTeamTasks,
  getTaskOwnerOptions,
  getVisibleTasks,
  groupTasksByKind,
} from "../lib/services/dashboard-tasks";

const tasks = [
  {
    id: "meeting-1",
    ownerEmail: "ana@empresa.com",
    ownerName: "Ana Souza",
    kind: "meeting",
    isCompleted: false,
    isOverdue: false,
  },
  {
    id: "call-1",
    ownerEmail: "ana@empresa.com",
    ownerName: "Ana Souza",
    kind: "call",
    isCompleted: false,
    isOverdue: true,
  },
  {
    id: "task-1",
    ownerEmail: "bruno@empresa.com",
    ownerName: "Bruno Lima",
    kind: "task",
    isCompleted: true,
    isOverdue: false,
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

    expect(visibleTasks.map((task) => task.id)).toEqual(["meeting-1", "call-1"]);
  });

  it("lets supervisors filter the full list by vendedor", () => {
    const visibleTasks = getVisibleTasks(tasks, {
      role: "Supervisor",
    }, {
      ownerFilter: "Bruno Lima",
      statusFilter: "todos",
    });

    expect(visibleTasks.map((task) => task.id)).toEqual(["task-1"]);
    expect(getTaskOwnerOptions(tasks)).toEqual(["Ana Souza", "Bruno Lima"]);
  });

  it("summarizes and groups tasks by type", () => {
    const groupedTasks = groupTasksByKind(tasks);
    const summary = buildTaskSummary(tasks);

    expect(groupedTasks.meeting).toHaveLength(1);
    expect(groupedTasks.call).toHaveLength(1);
    expect(groupedTasks.task).toHaveLength(1);
    expect(summary).toEqual({
      total: 3,
      open: 2,
      overdue: 1,
      completed: 1,
      meetings: 1,
      calls: 1,
      other: 1,
    });
  });
});
