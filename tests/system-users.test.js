import { describe, expect, it } from "vitest";
import { buildSystemUsers, MANAGED_ROLE_OPTIONS } from "../lib/system-users";

describe("system users", () => {
  it("builds a normalized list for the access management card", () => {
    const users = buildSystemUsers(
      [
        {
          id: "user-1",
          email: "ana@empresa.com",
          user_metadata: { full_name: "Ana Souza" },
          last_sign_in_at: "2026-03-11T12:00:00.000Z",
          email_confirmed_at: "2026-03-10T10:00:00.000Z",
          created_at: "2026-03-10T10:00:00.000Z",
        },
        {
          id: "user-2",
          email: "bruno@empresa.com",
          user_metadata: {},
          last_sign_in_at: null,
          email_confirmed_at: null,
          created_at: "2026-03-10T11:00:00.000Z",
        },
      ],
      [
        { user_id: "user-1", email: "ana@empresa.com", role: "Gestor" },
      ],
    );

    expect(users).toHaveLength(2);
    expect(users[0]).toMatchObject({
      id: "user-1",
      name: "Ana Souza",
      email: "ana@empresa.com",
      role: "Gerente",
      status: "active",
      statusLabel: "Ativo",
    });
    expect(users[1]).toMatchObject({
      id: "user-2",
      name: "bruno",
      email: "bruno@empresa.com",
      role: "Vendedor",
      status: "pending",
      statusLabel: "Pendente",
    });
  });

  it("exposes the role options used by the inline dropdown", () => {
    expect(MANAGED_ROLE_OPTIONS).toEqual([
      "Admin",
      "Gerente",
      "Supervisor",
      "Vendedor",
    ]);
  });
});
