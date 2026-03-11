import { NextResponse } from "next/server";
import { approveAccessRequest, listPendingAccessRequests, rejectAccessRequest } from "lib/access-requests-store";
import { requireSuperAdmin } from "lib/admin-access";
import { logAuthRouteError } from "lib/auth-logging";
import { createClient } from "lib/supabase/server";

export async function GET() {
  const auth = await requireSuperAdmin();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const requests = await listPendingAccessRequests();
  return NextResponse.json({ ok: true, requests });
}

export async function POST(request) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => null);
  const requestId = String(body?.requestId || "");
  const decision = String(body?.decision || "").toLowerCase();

  if (!requestId || !["approved", "rejected"].includes(decision)) {
    return NextResponse.json(
      { ok: false, error: "Informe uma solicitacao valida e a decisao desejada." },
      { status: 400 },
    );
  }

  if (decision === "rejected") {
    const resolved = await rejectAccessRequest({
      requestId,
      actorEmail: auth.user.email,
      actorName: auth.user.name,
    });

    if (!resolved) {
      return NextResponse.json(
        { ok: false, error: "Solicitacao nao encontrada ou ja resolvida." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Solicitacao recusada e removida das notificacoes.",
      request: resolved,
    });
  }

  const result = await approveAccessRequest({
    requestId,
    actorEmail: auth.user.email,
    actorName: auth.user.name,
    request,
    createClient,
  });

  if (!result.ok) {
    logAuthRouteError("api/admin/access-requests", "approve-request", result.error, {
      requestId,
      actorEmail: auth.user.email,
    });
    return NextResponse.json(
      {
        ok: false,
        error: `Nao foi possivel aprovar a solicitacao. ${result.error || "Erro desconhecido."}`,
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Solicitacao aprovada. O email de primeiro acesso foi enviado.",
    request: result.request,
  });
}
