import { NextResponse } from "next/server";
import { createClient } from "lib/supabase/server";
import { mapSupabaseUser } from "lib/supabase/shared";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    user: mapSupabaseUser(user),
  });
}
