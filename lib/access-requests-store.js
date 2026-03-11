import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { buildLoginRedirectUrl, FIRST_ACCESS_MODE, isAlreadyRegisteredError, normalizeEmail } from "lib/auth-flows";
import { getSuperAdminEmails } from "lib/supabase/shared";

const STORE_DIR = path.join(process.cwd(), ".data");
const STORE_PATH = path.join(STORE_DIR, "access-requests.json");

const DEFAULT_STATE = {
  requests: [],
  notifications: [],
};

async function ensureStoreDir() {
  await fs.mkdir(STORE_DIR, { recursive: true });
}

async function readState() {
  await ensureStoreDir();

  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw);

    return {
      requests: Array.isArray(parsed.requests) ? parsed.requests : [],
      notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
    };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      await writeState(DEFAULT_STATE);
      return { ...DEFAULT_STATE };
    }

    throw error;
  }
}

async function writeState(state) {
  await ensureStoreDir();
  await fs.writeFile(STORE_PATH, JSON.stringify(state, null, 2), "utf8");
}

function describeRequestType(type) {
  return type === "request-access" ? "solicitou acesso ao sistema" : "solicitou o primeiro acesso";
}

function createAdminNotifications(requestRecord) {
  const createdAt = new Date().toISOString();

  return getSuperAdminEmails().map((recipientEmail) => ({
    id: randomUUID(),
    recipientEmail,
    requestId: requestRecord.id,
    read: false,
    trash: false,
    resolvedAt: null,
    createdAt,
    title: `${requestRecord.email} ${describeRequestType(requestRecord.type)}.`,
    tag: requestRecord.type === "request-access" ? "Solicitacao de acesso" : "Primeiro acesso",
    body: `A solicitacao de ${requestRecord.email} aguarda aprovacao de um super admin.`,
  }));
}

export async function queueAccessRequest({ email, type }) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedType = type === "request-access" ? "request-access" : "first-access";
  const state = await readState();
  const existingPending = state.requests.find(
    (item) => item.email === normalizedEmail && item.type === normalizedType && item.status === "pending",
  );

  if (existingPending) {
    return {
      request: existingPending,
      created: false,
    };
  }

  const requestRecord = {
    id: randomUUID(),
    email: normalizedEmail,
    type: normalizedType,
    status: "pending",
    requestedAt: new Date().toISOString(),
    resolvedAt: null,
    resolvedByEmail: "",
    resolvedByName: "",
    lastError: "",
  };

  state.requests.unshift(requestRecord);
  state.notifications.unshift(...createAdminNotifications(requestRecord));
  await writeState(state);

  return {
    request: requestRecord,
    created: true,
  };
}

export async function listPendingAccessRequests() {
  const state = await readState();
  return state.requests
    .filter((item) => item.status === "pending")
    .sort((left, right) => right.requestedAt.localeCompare(left.requestedAt));
}

export async function listNotificationsForUser(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return [];
  }

  const state = await readState();
  return state.notifications
    .filter((item) => item.recipientEmail === normalizedEmail && !item.resolvedAt && !item.trash)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

async function markRequestResolved({ requestId, decision, actorEmail, actorName, lastError = "" }) {
  const state = await readState();
  const requestRecord = state.requests.find((item) => item.id === requestId);

  if (!requestRecord) {
    return null;
  }

  requestRecord.status = decision;
  requestRecord.resolvedAt = new Date().toISOString();
  requestRecord.resolvedByEmail = normalizeEmail(actorEmail);
  requestRecord.resolvedByName = actorName || "";
  requestRecord.lastError = lastError;

  state.notifications.forEach((notification) => {
    if (notification.requestId === requestId && !notification.resolvedAt) {
      notification.resolvedAt = requestRecord.resolvedAt;
      notification.read = true;
    }
  });

  await writeState(state);
  return requestRecord;
}

export async function rejectAccessRequest({ requestId, actorEmail, actorName }) {
  return markRequestResolved({
    requestId,
    decision: "rejected",
    actorEmail,
    actorName,
  });
}

export async function approveAccessRequest({
  requestId,
  actorEmail,
  actorName,
  request,
  createClient,
}) {
  const state = await readState();
  const requestRecord = state.requests.find((item) => item.id === requestId && item.status === "pending");

  if (!requestRecord) {
    return { ok: false, error: "Solicitacao nao encontrada ou ja resolvida." };
  }

  try {
    const supabase = await createClient();
    const tempPassword = `SalesOps!${Math.random().toString(36).slice(2, 10)}A1`;
    const { error: signUpError } = await supabase.auth.signUp({
      email: requestRecord.email,
      password: tempPassword,
      options: {
        data: {
          role: "Equipe comercial",
        },
      },
    });

    if (signUpError && !isAlreadyRegisteredError(signUpError)) {
      throw signUpError;
    }

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(requestRecord.email, {
      redirectTo: buildLoginRedirectUrl(request, FIRST_ACCESS_MODE),
    });

    if (resetError) {
      throw resetError;
    }

    const resolved = await markRequestResolved({
      requestId,
      decision: "approved",
      actorEmail,
      actorName,
    });

    return {
      ok: true,
      request: resolved,
    };
  } catch (error) {
    const lastError = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    await markRequestResolved({
      requestId,
      decision: "pending",
      actorEmail: "",
      actorName: "",
      lastError,
    });

    const revertedState = await readState();
    const revertedRequest = revertedState.requests.find((item) => item.id === requestId);
    if (revertedRequest) {
      revertedRequest.status = "pending";
      revertedRequest.resolvedAt = null;
      revertedRequest.resolvedByEmail = "";
      revertedRequest.resolvedByName = "";
      revertedState.notifications.forEach((notification) => {
        if (notification.requestId === requestId) {
          notification.resolvedAt = null;
          notification.read = false;
        }
      });
      await writeState(revertedState);
    }

    return {
      ok: false,
      error: lastError,
    };
  }
}
