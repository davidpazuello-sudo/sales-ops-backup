import { describe, expect, it } from "vitest";
import { isCorporateEmail, mapSupabaseUser, normalizeAccessRole } from "../lib/supabase/shared";

describe("security helpers", () => {
  it("normalizes supported access roles", () => {
    expect(normalizeAccessRole("admin")).toBe("Admin");
    expect(normalizeAccessRole("Supervisor")).toBe("Supervisor");
    expect(normalizeAccessRole("foo")).toBe("Vendedor");
  });

  it("accepts only configured corporate domains", () => {
    expect(isCorporateEmail("gestor@sasi.com.br")).toBe(true);
    expect(isCorporateEmail("gestor@gmail.com")).toBe(false);
  });

  it("does not grant admin via user metadata anymore", () => {
    const mapped = mapSupabaseUser({
      id: "user-1",
      email: "user@sasi.com.br",
      app_metadata: {},
      user_metadata: {
        full_name: "Usuário Teste",
        role: "Admin",
      },
    });

    expect(mapped.isSuperAdmin).toBe(false);
    expect(mapped.role).toBe("");
  });
});
