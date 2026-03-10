import { NextResponse } from "next/server";
import {
  buildLoginRedirectUrl,
  FIRST_ACCESS_MODE,
  isAlreadyRegisteredError,
  normalizeEmail,
} from "lib/auth-flows";
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
  const tempPassword = `SalesOps!${Math.random().toString(36).slice(2, 10)}A1`;
  const { error: signUpError } = await supabase.auth.signUp({
    email,
    password: tempPassword,
    options: {
      data: {
        role: "Equipe comercial",
      },
    },
  });

  if (signUpError && !isAlreadyRegisteredError(signUpError)) {
    return NextResponse.json(
      { ok: false, error: signUpError.message || "Nao foi possivel solicitar acesso." },
      { status: 400 },
    );
  }

  const { error: firstAccessError } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: buildLoginRedirectUrl(request, FIRST_ACCESS_MODE),
  });

  if (firstAccessError) {
    return NextResponse.json(
      { ok: false, error: firstAccessError.message || "Nao foi possivel enviar o link de primeiro acesso." },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Solicitacao recebida. Se o email estiver habilitado, voce recebera um link para concluir o primeiro acesso e definir sua senha.",
  });
}
