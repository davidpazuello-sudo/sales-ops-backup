import { NextResponse } from "next/server";
import { jsonWithApiObservation, startApiObservation } from "lib/api-observability.js";
import { approveAccessRequest, listPendingAccessRequests, rejectAccessRequest } from "lib/access-requests-store";
import { requireSuperAdmin } from "lib/admin-access";
import { consumeRateLimit, getRequestClientKey } from "lib/auth-rate-limit";
import { logAuthRouteError, logRateLimitEvent } from "lib/auth-logging";

export async function GET(request) {
  const observation = startApiObservation(request, "api/admin/access-requests");
  const auth = await requireSuperAdmin({
    route: "api/admin/access-requests",
    action: "list-access-requests",
  });
  if (!auth.ok) {
    return jsonWithApiObservation(observation, { ok: false, error: auth.error }, { status: auth.status });
  }

  const clientKey = getRequestClientKey(request);
  const rateLimit = await consumeRateLimit({
    scope: "admin-access-requests-list",
    bucket: `${clientKey}:${auth.user.email}`,
    limit: 20,
    windowMs: 60 * 1000,
  });

  if (!rateLimit.ok) {
    logRateLimitEvent("api/admin/access-requests", "admin-access-requests-list", {
      actorEmail: auth.user.email,
      clientKey,
      retryAfter: rateLimit.retryAfter,
    });
    return jsonWithApiObservation(
      observation,
      { ok: false, error: "Muitas consultas de solicitacoes. Aguarde alguns instantes." },
      { status: 429 },
      { actorEmail: auth.user.email, clientKey, actorUserId: auth.user.id, actorRole: auth.user.role },
    );
  }

  try {
    const requests = await listPendingAccessRequests();
    return jsonWithApiObservation(
      observation,
      { ok: true, requests },
      undefined,
      { actorEmail: auth.user.email, clientKey, actorUserId: auth.user.id, actorRole: auth.user.role },
    );
  } catch (error) {
    logAuthRouteError("api/admin/access-requests", "list-pending", error, {
      actorEmail: auth.user.email,
    });
    return jsonWithApiObservation(
      observation,
      {
        ok: false,
        error: error instanceof Error ? error.message : "Nao foi possivel carregar as solicitacoes.",
      },
      { status: 503 },
      { actorEmail: auth.user.email, clientKey, actorUserId: auth.user.id, actorRole: auth.user.role },
    );
  }
}

export async function POST(request) {
  const observation = startApiObservation(request, "api/admin/access-requests");
  const auth = await requireSuperAdmin({
    route: "api/admin/access-requests",
    action: "resolve-access-request",
  });
  if (!auth.ok) {
    return jsonWithApiObservation(observation, { ok: false, error: auth.error }, { status: auth.status });
  }

  const clientKey = getRequestClientKey(request);
  const rateLimit = await consumeRateLimit({
    scope: "admin-access-requests-resolve",
    bucket: `${clientKey}:${auth.user.email}`,
    limit: 12,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.ok) {
    logRateLimitEvent("api/admin/access-requests", "admin-access-requests-resolve", {
      actorEmail: auth.user.email,
      clientKey,
      retryAfter: rateLimit.retryAfter,
    });
    return jsonWithApiObservation(
      observation,
      { ok: false, error: "Muitas decisoes de acesso em pouco tempo. Aguarde alguns minutos." },
      { status: 429 },
      { actorEmail: auth.user.email, clientKey, actorUserId: auth.user.id, actorRole: auth.user.role },
    );
  }

  const body = await request.json().catch(() => null);
  const requestId = String(body?.requestId || "");
  const decision = String(body?.decision || "").toLowerCase();

  if (!requestId || !["approved", "rejected"].includes(decision)) {
    return jsonWithApiObservation(
      observation,
      { ok: false, error: "Informe uma solicitacao valida e a decisao desejada." },
      { status: 400 },
      { actorEmail: auth.user.email, clientKey, actorUserId: auth.user.id, actorRole: auth.user.role },
    );
  }

  if (decision === "rejected") {
    const resolved = await rejectAccessRequest({
      requestId,
      actorUserId: auth.user.id,
      actorEmail: auth.user.email,
      actorName: auth.user.name,
    });

    if (!resolved) {
      return jsonWithApiObservation(
        observation,
        { ok: false, error: "Solicitacao nao encontrada ou ja resolvida." },
        { status: 404 },
        { actorEmail: auth.user.email, clientKey, actorUserId: auth.user.id, actorRole: auth.user.role },
      );
    }

    return jsonWithApiObservation(
      observation,
      {
        ok: true,
        message: "Solicitacao recusada e removida das notificacoes.",
        request: resolved,
      },
      undefined,
      { actorEmail: auth.user.email, clientKey, actorUserId: auth.user.id, actorRole: auth.user.role },
    );
  }

  const result = await approveAccessRequest({
    requestId,
    actorUserId: auth.user.id,
    actorEmail: auth.user.email,
    actorName: auth.user.name,
    request,
  });

  if (!result.ok) {
    logAuthRouteError("api/admin/access-requests", "approve-request", result.error, {
      requestId,
      actorEmail: auth.user.email,
    });
    return jsonWithApiObservation(
      observation,
      {
        ok: false,
        error: `Nao foi possivel aprovar a solicitacao. ${result.error || "Erro desconhecido."}`,
      },
      { status: 400 },
      { actorEmail: auth.user.email, clientKey, actorUserId: auth.user.id, actorRole: auth.user.role },
    );
  }

  return jsonWithApiObservation(
    observation,
    {
      ok: true,
      message: "Solicitacao aprovada. O email de primeiro acesso foi enviado.",
      request: result.request,
    },
    undefined,
    { actorEmail: auth.user.email, clientKey, actorUserId: auth.user.id, actorRole: auth.user.role },
  );
}
