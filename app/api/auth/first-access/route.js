import { NextResponse } from "next/server";
import { normalizeEmail } from "lib/auth-flows";
import { logAuthRouteError } from "lib/auth-logging";
import { queueAccessRequest } from "lib/access-requests-store";
import { getSuperAdminEmails, hasSupabaseAdminEnv, hasSupabaseEnv } from "lib/supabase/shared";

export async function POST(request) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json(
      { ok: false, error: "Supabase nao configurado neste ambiente." },
      { status: 503 },
    );
  }

  if (!hasSupabaseAdminEnv()) {
    return NextResponse.json(
      { ok: false, error: "Permissoes e Acessos ainda nao esta configurado com chave administrativa do Supabase." },
      { status: 503 },
    );
  }

  if (!getSuperAdminEmails().length) {
    return NextResponse.json(
      { ok: false, error: "Nao ha super admin configurado para aprovar primeiros acessos." },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => null);
  const email = normalizeEmail(body?.email);

  if (!email) {
    return NextResponse.json(
      { ok: false, error: "Informe um email valido." },
      { status: 400 },
    );
  }

  try {
    const { created } = await queueAccessRequest({
      email,
      type: "first-access",
    });

    return NextResponse.json({
      ok: true,
      message: created
        ? "Pedido de primeiro acesso enviado para aprovacao do super admin."
        : "Ja existe um pedido pendente para este email. Aguarde a aprovacao do super admin.",
    });
  } catch (error) {
    logAuthRouteError("api/auth/first-access", "queue-first-access", error, { email, requestUrl: request.url });
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Nao foi possivel iniciar o primeiro acesso neste ambiente.",
      },
      { status: 503 },
    );
  }
}
