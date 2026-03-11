function emptyMfaState() {
  return {
    currentLevel: null,
    nextLevel: null,
    hasVerifiedFactor: false,
    hasTotpFactor: false,
    preferredFactorId: "",
    preferredFactorName: "",
    requiresTwoFactor: false,
  };
}

export async function readMfaState(supabase) {
  if (!supabase?.auth?.mfa) {
    return emptyMfaState();
  }

  try {
    const [{ data: assurance, error: assuranceError }, { data: factors, error: factorsError }] = await Promise.all([
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      supabase.auth.mfa.listFactors(),
    ]);

    if (assuranceError) {
      throw assuranceError;
    }

    if (factorsError) {
      throw factorsError;
    }

    const allFactors = Array.isArray(factors?.all) ? factors.all : [];
    const verifiedFactors = allFactors.filter((factor) => factor?.status === "verified");
    const totpFactors = verifiedFactors.filter((factor) => factor?.factor_type === "totp");
    const preferredFactor = totpFactors[0] || verifiedFactors[0] || null;

    return {
      currentLevel: assurance?.currentLevel || null,
      nextLevel: assurance?.nextLevel || null,
      hasVerifiedFactor: verifiedFactors.length > 0,
      hasTotpFactor: totpFactors.length > 0,
      preferredFactorId: preferredFactor?.id || "",
      preferredFactorName: preferredFactor?.friendly_name || "",
      requiresTwoFactor: verifiedFactors.length > 0
        && assurance?.nextLevel === "aal2"
        && assurance?.currentLevel !== "aal2",
    };
  } catch {
    return emptyMfaState();
  }
}
