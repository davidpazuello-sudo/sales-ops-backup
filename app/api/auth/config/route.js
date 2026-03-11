import { NextResponse } from "next/server";
import { getPublicSupabaseConfig, getSuperAdminEmails, hasSupabaseAdminEnv } from "lib/supabase/shared";

export async function GET() {
  const supabase = getPublicSupabaseConfig();

  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Supabase nao configurado neste ambiente." },
      { status: 503 },
    );
  }

  return NextResponse.json({
    ok: true,
    supabase,
    accessControl: {
      adminConfigured: hasSupabaseAdminEnv(),
      superAdminsConfigured: getSuperAdminEmails().length > 0,
    },
  });
}
