// @ts-nocheck
import { jsonWithApiObservation, startApiObservation } from "lib/api-observability";
import {
  getAppEnvironment,
  getHubSpotClientSecretSource,
  getHubSpotTokenSource,
  hasHubSpotClientSecretConfigured,
  hasHubSpotTokenConfigured,
} from "lib/hubspot-runtime";
import { getPublicSupabaseConfig } from "lib/supabase/shared";

export async function GET(request) {
  const observation = startApiObservation(request, "api/health");
  const supabase = getPublicSupabaseConfig();
  const now = new Date();
  const startedAt = process.uptime();

  return jsonWithApiObservation(
    observation,
    {
      ok: true,
      service: "sales-ops-backup",
      environment: getAppEnvironment(),
      timestamp: now.toISOString(),
      uptimeSeconds: Math.floor(startedAt),
      version: process.env.VERCEL_GIT_COMMIT_SHA || process.env.npm_package_version || "local",
      checks: {
        hubspotConfigured: hasHubSpotTokenConfigured(),
        hubspotTokenSource: getHubSpotTokenSource(),
        hubspotWebhookSecretConfigured: hasHubSpotClientSecretConfigured(),
        hubspotWebhookSecretSource: getHubSpotClientSecretSource(),
        supabaseConfigured: Boolean(supabase?.url && supabase?.publishableKey),
      },
    },
    { status: 200 },
  );
}
