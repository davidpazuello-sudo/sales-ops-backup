import { jsonWithApiObservation, startApiObservation } from "lib/api-observability.js";
import { getPublicSupabaseConfig } from "lib/supabase/shared";

function getRuntimeEnvironment() {
  return process.env.APP_ENVIRONMENT
    || process.env.NEXT_PUBLIC_APP_ENV
    || process.env.VERCEL_ENV
    || process.env.NODE_ENV
    || "development";
}

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
      environment: getRuntimeEnvironment(),
      timestamp: now.toISOString(),
      uptimeSeconds: Math.floor(startedAt),
      version: process.env.VERCEL_GIT_COMMIT_SHA || process.env.npm_package_version || "local",
      checks: {
        hubspotConfigured: Boolean(process.env.HUBSPOT_ACCESS_TOKEN),
        supabaseConfigured: Boolean(supabase?.url && supabase?.publishableKey),
      },
    },
    { status: 200 },
  );
}
