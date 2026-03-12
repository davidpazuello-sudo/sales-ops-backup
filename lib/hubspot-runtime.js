function normalizeEnvironment(value) {
  const normalized = String(value || "").trim().toLowerCase();

  if (!normalized) {
    return "development";
  }

  if (["preview", "staging"].includes(normalized)) {
    return "staging";
  }

  if (["production", "prod"].includes(normalized)) {
    return "production";
  }

  return normalized;
}

export function getAppEnvironment() {
  return normalizeEnvironment(
    process.env.APP_ENVIRONMENT
      || process.env.NEXT_PUBLIC_APP_ENV
      || process.env.VERCEL_ENV
      || process.env.NODE_ENV,
  );
}

export function getHubSpotToken() {
  const environment = getAppEnvironment();

  if (environment === "staging") {
    return process.env.HUBSPOT_ACCESS_TOKEN_STAGING
      || process.env.HUBSPOT_ACCESS_TOKEN
      || "";
  }

  if (environment === "production") {
    return process.env.HUBSPOT_ACCESS_TOKEN_PRODUCTION
      || process.env.HUBSPOT_ACCESS_TOKEN
      || "";
  }

  return process.env.HUBSPOT_ACCESS_TOKEN_DEVELOPMENT
    || process.env.HUBSPOT_ACCESS_TOKEN
    || "";
}

export function hasHubSpotTokenConfigured() {
  return Boolean(getHubSpotToken());
}

export function getHubSpotTokenSource() {
  const environment = getAppEnvironment();

  if (environment === "staging" && process.env.HUBSPOT_ACCESS_TOKEN_STAGING) {
    return "HUBSPOT_ACCESS_TOKEN_STAGING";
  }

  if (environment === "production" && process.env.HUBSPOT_ACCESS_TOKEN_PRODUCTION) {
    return "HUBSPOT_ACCESS_TOKEN_PRODUCTION";
  }

  if (environment === "development" && process.env.HUBSPOT_ACCESS_TOKEN_DEVELOPMENT) {
    return "HUBSPOT_ACCESS_TOKEN_DEVELOPMENT";
  }

  return "HUBSPOT_ACCESS_TOKEN";
}
