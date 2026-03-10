import { NextResponse } from "next/server";
import { getPublicSupabaseConfig } from "lib/supabase/shared";

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
  });
}
