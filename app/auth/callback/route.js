import { NextResponse } from "next/server";
import { createClient } from "lib/supabase/server";

function normalizeNextPath(value) {
  if (!value || typeof value !== "string") return "/relatorios";
  if (!value.startsWith("/") || value.startsWith("//")) return "/relatorios";
  return value;
}

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = normalizeNextPath(requestUrl.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(new URL(`/login?authError=oauth`, requestUrl.origin));
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      throw error;
    }

    return NextResponse.redirect(new URL(nextPath, requestUrl.origin));
  } catch {
    return NextResponse.redirect(new URL(`/login?authError=oauth`, requestUrl.origin));
  }
}
