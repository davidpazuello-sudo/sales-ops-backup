import { NextResponse } from "next/server";
import { createClient } from "lib/supabase/server";

function getResetRedirectUrl(request) {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) {
    return `${configured.replace(/\/+$/, "")}/login`;
  }
  return new URL("/login", request.url).toString();
}

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const email = String(body?.email || "").trim();

  if (!email) {
    return NextResponse.json(
      { ok: false, error: "Informe um email valido." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: getResetRedirectUrl(request),
  });

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message || "Nao foi possivel enviar o link de recuperacao." },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Link de recuperacao enviado. Verifique seu email.",
  });
}
