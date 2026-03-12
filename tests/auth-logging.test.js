import { describe, expect, it } from "vitest";
import { sanitizeLogMeta } from "../lib/auth-logging";

describe("auth logging sanitization", () => {
  it("redacts sensitive keys before logging", () => {
    const sanitized = sanitizeLogMeta({
      email: "admin@sasi.com.br",
      password: "super-secret",
      accessToken: "gho_exampletoken",
      nested: {
        authorization: "Bearer abc",
        note: "safe",
      },
    });

    expect(sanitized.email).toBe("admin@sasi.com.br");
    expect(sanitized.password).toBe("[REDACTED]");
    expect(sanitized.accessToken).toBe("[REDACTED]");
    expect(sanitized.nested.authorization).toBe("[REDACTED]");
    expect(sanitized.nested.note).toBe("safe");
  });

  it("redacts token-like values even inside generic strings", () => {
    const sanitized = sanitizeLogMeta({
      detail: "Falha ao usar gho_secret123 e jwt eyJabc.def.ghi no fluxo.",
    });

    expect(sanitized.detail).not.toContain("gho_secret123");
    expect(sanitized.detail).not.toContain("eyJabc.def.ghi");
    expect(sanitized.detail).toContain("[REDACTED]");
  });
});
