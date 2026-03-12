import { NextResponse } from "next/server";
import { jsonWithApiObservation, startApiObservation } from "lib/api-observability.js";
import { getPublicSupabaseConfig } from "lib/supabase/shared";

export async function GET(request) {
  const observation = startApiObservation(request, "api/auth/config");
  const supabase = getPublicSupabaseConfig();

  if (!supabase) {
    return jsonWithApiObservation(
      observation,
      { ok: false, error: "Supabase nao configurado neste ambiente." },
      { status: 503 },
    );
  }

  return jsonWithApiObservation(observation, {
    ok: true,
    supabase,
  });
}
