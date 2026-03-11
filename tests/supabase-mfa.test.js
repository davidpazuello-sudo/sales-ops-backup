import { describe, expect, it, vi } from "vitest";
import { readMfaState } from "../lib/supabase/mfa";

function createSupabaseMock({ assurance, factors, assuranceError, factorsError } = {}) {
  return {
    auth: {
      mfa: {
        getAuthenticatorAssuranceLevel: vi.fn(async () => ({ data: assurance, error: assuranceError || null })),
        listFactors: vi.fn(async () => ({ data: factors, error: factorsError || null })),
      },
    },
  };
}

describe("supabase mfa helper", () => {
  it("marks two factor as required when a verified factor exists and session is aal1", async () => {
    const supabase = createSupabaseMock({
      assurance: { currentLevel: "aal1", nextLevel: "aal2" },
      factors: {
        all: [
          {
            id: "factor-1",
            factor_type: "totp",
            status: "verified",
            friendly_name: "SalesOps Authenticator",
          },
        ],
      },
    });

    const state = await readMfaState(supabase);
    expect(state.requiresTwoFactor).toBe(true);
    expect(state.hasTotpFactor).toBe(true);
    expect(state.preferredFactorId).toBe("factor-1");
  });

  it("returns a safe empty state when mfa calls fail", async () => {
    const supabase = createSupabaseMock({
      assuranceError: new Error("mfa unavailable"),
    });

    const state = await readMfaState(supabase);
    expect(state.requiresTwoFactor).toBe(false);
    expect(state.hasVerifiedFactor).toBe(false);
    expect(state.preferredFactorId).toBe("");
  });
});
