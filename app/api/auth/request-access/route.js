import { NextResponse } from "next/server";
import { createClient } from "lib/supabase/server";

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
  const tempPassword = `SalesOps!${Math.random().toString(36).slice(2, 10)}A1`;
  const { error } = await supabase.auth.signUp({
    email,
    password: tempPassword,
    options: {
      data: {
        role: "Equipe comercial",
      },
    },
  });

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message || "Nao foi possivel solicitar acesso." },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Solicitacao enviada. Verifique seu email para concluir o acesso.",
  });
}
