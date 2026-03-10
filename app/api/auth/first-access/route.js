import { NextResponse } from "next/server";
import { buildLoginRedirectUrl, FIRST_ACCESS_MODE, normalizeEmail } from "lib/auth-flows";
import { createClient } from "lib/supabase/server";

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const email = normalizeEmail(body?.email);

  if (!email) {
    return NextResponse.json(
      { ok: false, error: "Informe um email valido." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: buildLoginRedirectUrl(request, FIRST_ACCESS_MODE),
  });

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message || "Nao foi possivel iniciar o primeiro acesso." },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Se o email estiver habilitado, voce recebera um link para definir a senha do primeiro acesso.",
  });
}
