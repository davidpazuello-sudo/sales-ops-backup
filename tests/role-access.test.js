import { describe, expect, it } from "vitest";
import { getRoleRank, hasMinimumRole } from "../lib/role-access";

describe("role access helpers", () => {
  it("applies the expected hierarchy across operational roles", () => {
    expect(getRoleRank("Vendedor")).toBeLessThan(getRoleRank("Supervisor"));
    expect(getRoleRank("Supervisor")).toBeLessThan(getRoleRank("Gerente"));
    expect(getRoleRank("Gerente")).toBeLessThan(getRoleRank("Admin"));
  });

  it("accepts equivalent or higher roles for protected actions", () => {
    expect(hasMinimumRole({ role: "Admin" }, "Supervisor")).toBe(true);
    expect(hasMinimumRole({ role: "Gerente" }, "Supervisor")).toBe(true);
    expect(hasMinimumRole({ role: "Supervisor" }, "Supervisor")).toBe(true);
    expect(hasMinimumRole({ role: "Vendedor" }, "Supervisor")).toBe(false);
  });
});
