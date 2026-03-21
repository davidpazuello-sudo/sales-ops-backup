// @ts-nocheck
import { normalizeEmail } from "./auth-flows";
import { createAdminClient } from "./supabase/admin";
import {
  hasSupabaseAdminEnv,
  isSuperAdminEmail,
  normalizeAccessRole,
} from "./supabase/shared";

const USER_ROLES_TABLE = "user_roles";
const PAGE_SIZE = 100;

export const MANAGED_ROLE_OPTIONS = ["Admin", "Gerente", "Supervisor", "Vendedor"];

function getUserDisplayName(user) {
  const metadata = user?.user_metadata || {};
  const candidates = [
    metadata.full_name,
    metadata.name,
    metadata.display_name,
  ];

  const matchedName = candidates.find((value) => String(value || "").trim());
  if (matchedName) {
    return String(matchedName).trim();
  }

  const normalizedEmail = normalizeEmail(user?.email || "");
  if (normalizedEmail.includes("@")) {
    return normalizedEmail.split("@")[0];
  }

  return "Usuario";
}

function getStatusFromAuthUser(user) {
  if (user?.last_sign_in_at) {
    return {
      status: "active",
      statusLabel: "Ativo",
    };
  }

  if (user?.email_confirmed_at) {
    return {
      status: "invited",
      statusLabel: "Convidado",
    };
  }

  return {
    status: "pending",
    statusLabel: "Pendente",
  };
}

function sortUsers(left, right) {
  if (left.roleLocked !== right.roleLocked) {
    return left.roleLocked ? -1 : 1;
  }

  const statusOrder = {
    active: 0,
    invited: 1,
    pending: 2,
  };

  const leftStatusRank = statusOrder[left.status] ?? 99;
  const rightStatusRank = statusOrder[right.status] ?? 99;

  if (leftStatusRank !== rightStatusRank) {
    return leftStatusRank - rightStatusRank;
  }

  return left.name.localeCompare(right.name, "pt-BR");
}

export function isManagedRoleLocked(email) {
  return isSuperAdminEmail(normalizeEmail(email));
}

export function buildSystemUsers(authUsers = [], roleRecords = []) {
  const roleByUserId = new Map();
  const roleByEmail = new Map();

  for (const record of roleRecords) {
    const normalizedEmail = normalizeEmail(record?.email || "");
    const normalizedRole = normalizeAccessRole(record?.role, "Vendedor");

    if (record?.user_id) {
      roleByUserId.set(record.user_id, normalizedRole);
    }

    if (normalizedEmail) {
      roleByEmail.set(normalizedEmail, normalizedRole);
    }
  }

  return authUsers
    .filter((user) => String(user?.email || "").trim())
    .map((user) => {
      const normalizedEmail = normalizeEmail(user.email || "");
      const roleLocked = isManagedRoleLocked(normalizedEmail);
      const storedRole = roleByUserId.get(user.id) || roleByEmail.get(normalizedEmail) || "Vendedor";
      const role = roleLocked ? "Admin" : normalizeAccessRole(storedRole, "Vendedor");
      const statusInfo = getStatusFromAuthUser(user);

      return {
        id: user.id,
        name: getUserDisplayName(user),
        email: normalizedEmail || user.email || "",
        role,
        roleLocked,
        status: statusInfo.status,
        statusLabel: statusInfo.statusLabel,
        lastInteractionAt: user.last_sign_in_at || null,
        createdAt: user.created_at || null,
      };
    })
    .sort(sortUsers);
}

async function listAllAuthUsers(supabase) {
  const users = [];
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: PAGE_SIZE,
    });

    if (error) {
      throw error;
    }

    const batch = data?.users || [];
    users.push(...batch);

    if (batch.length < PAGE_SIZE) {
      break;
    }

    page += 1;
  }

  return users;
}

export async function listSystemUsers() {
  if (!hasSupabaseAdminEnv()) {
    throw new Error("SUPABASE_ADMIN_UNAVAILABLE");
  }

  const supabase = createAdminClient();
  const [authUsers, roleResponse] = await Promise.all([
    listAllAuthUsers(supabase),
    supabase
      .from(USER_ROLES_TABLE)
      .select("user_id, email, role"),
  ]);

  if (roleResponse.error) {
    throw roleResponse.error;
  }

  return buildSystemUsers(authUsers, roleResponse.data || []);
}

export async function saveSystemUserRole({ userId, email, role }) {
  const normalizedRole = normalizeAccessRole(role, "Vendedor");
  const normalizedEmail = normalizeEmail(email || "");

  if (!userId || !normalizedEmail) {
    throw new Error("SYSTEM_USER_INVALID");
  }

  if (isManagedRoleLocked(normalizedEmail)) {
    throw new Error("SYSTEM_USER_ROLE_LOCKED");
  }

  if (!MANAGED_ROLE_OPTIONS.includes(normalizedRole)) {
    throw new Error("SYSTEM_USER_ROLE_INVALID");
  }

  const { upsertUserRole } = await import("./user-roles");

  await upsertUserRole({
    userId,
    email: normalizedEmail,
    role: normalizedRole,
  });

  return {
    userId,
    email: normalizedEmail,
    role: normalizedRole,
  };
}

export async function deleteSystemUser({ actorUserId = "", userId, email }) {
  const normalizedEmail = normalizeEmail(email || "");

  if (!userId || !normalizedEmail) {
    throw new Error("SYSTEM_USER_INVALID");
  }

  if (actorUserId && actorUserId === userId) {
    throw new Error("SYSTEM_USER_DELETE_SELF");
  }

  if (isManagedRoleLocked(normalizedEmail)) {
    throw new Error("SYSTEM_USER_DELETE_LOCKED");
  }

  if (!hasSupabaseAdminEnv()) {
    throw new Error("SUPABASE_ADMIN_UNAVAILABLE");
  }

  const supabase = createAdminClient();
  const { error: authError } = await supabase.auth.admin.deleteUser(userId);

  if (authError) {
    throw authError;
  }

  await supabase
    .from(USER_ROLES_TABLE)
    .delete()
    .or(`user_id.eq.${userId},email.eq.${normalizedEmail}`);

  return {
    userId,
    email: normalizedEmail,
  };
}
