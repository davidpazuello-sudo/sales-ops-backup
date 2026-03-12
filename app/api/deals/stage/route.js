import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "lib/admin-access";
import { consumeRateLimit, getRequestClientKey } from "lib/auth-rate-limit";
import { logAuthRouteError, logRateLimitEvent } from "lib/auth-logging";
import { jsonWithApiObservation, startApiObservation } from "lib/api-observability.js";
import { updateHubSpotDealStage } from "lib/hubspot";
import { writeAuditLog, writeSystemEvent } from "lib/audit-log-store";

export async function POST(request) {
  const observation = startApiObservation(request, "api/deals/stage");
  const auth = await requireAuthenticatedUser({
    route: "api/deals/stage",
    action: "update-deal-stage",
    minimumRole: "Vendedor",
  });
  if (!auth.ok) {
    return jsonWithApiObservation(observation, { ok: false, error: auth.error }, { status: auth.status });
  }

  const clientKey = getRequestClientKey(request);
  const rateLimit = await consumeRateLimit({
    scope: "deal-stage-update",
    bucket: `${clientKey}:${auth.user.email}`,
    limit: 20,
    windowMs: 60 * 1000,
  });

  if (!rateLimit.ok) {
    logRateLimitEvent("api/deals/stage", "deal-stage-update", {
      actorEmail: auth.user.email,
      clientKey,
      retryAfter: rateLimit.retryAfter,
    });
    return jsonWithApiObservation(
      observation,
      { ok: false, error: "Muitas mudancas de etapa em pouco tempo. Aguarde alguns instantes." },
      { status: 429 },
      { actorEmail: auth.user.email, actorUserId: auth.user.id, actorRole: auth.user.role, clientKey },
    );
  }

  try {
    const payload = await request.json().catch(() => null);
    const dealId = String(payload?.dealId || "").trim();
    const stageId = String(payload?.stageId || "").trim();
    const stageLabel = String(payload?.stageLabel || "").trim();

    if (!dealId || !stageId) {
      return jsonWithApiObservation(
        observation,
        { ok: false, error: "Informe o negocio e a etapa de destino." },
        { status: 400 },
        { actorEmail: auth.user.email, actorUserId: auth.user.id, actorRole: auth.user.role, clientKey },
      );
    }

    await updateHubSpotDealStage({ dealId, stageId });

    await Promise.allSettled([
      writeAuditLog({
        actorUserId: auth.user.id,
        actorEmail: auth.user.email,
        actorRole: auth.user.role,
        action: "deal.stage.updated",
        entityType: "deal",
        entityId: dealId,
        route: "api/deals/stage",
        details: {
          stageId,
          stageLabel,
        },
      }),
      writeSystemEvent({
        event: "deal.stage.updated",
        level: "info",
        route: "api/deals/stage",
        actorUserId: auth.user.id,
        actorEmail: auth.user.email,
        actorRole: auth.user.role,
        clientKey,
        message: `Negocio ${dealId} movido para ${stageLabel || stageId}.`,
        meta: {
          dealId,
          stageId,
          stageLabel,
        },
      }),
    ]);

    return jsonWithApiObservation(
      observation,
      {
        ok: true,
        message: `Etapa atualizada para ${stageLabel || stageId}.`,
        deal: {
          id: dealId,
          stageId,
          stageLabel,
        },
      },
      undefined,
      { actorEmail: auth.user.email, actorUserId: auth.user.id, actorRole: auth.user.role, clientKey },
    );
  } catch (error) {
    logAuthRouteError("api/deals/stage", "update-deal-stage", error, {
      actorEmail: auth.user.email,
      clientKey,
    });
    return jsonWithApiObservation(
      observation,
      { ok: false, error: "Nao foi possivel atualizar a etapa do negocio agora." },
      { status: 503 },
      { actorEmail: auth.user.email, actorUserId: auth.user.id, actorRole: auth.user.role, clientKey },
    );
  }
}
