// @ts-nocheck
import { normalizeEmail } from "lib/auth-flows";
import { createAdminClient } from "lib/supabase/admin";
import { hasSupabaseAdminEnv, isSuperAdminEmail, normalizeAccessRole } from "lib/supabase/shared";

const USER_ROLES_TABLE = "user_roles";

function normalizeRoleRecord(record) {
  if (!record) {
    return null;
  }

  return {
    userId: record.user_id,
    email: record.email || "",
    role: normalizeAccessRole(record.role, "Vendedor"),
  };
}

export async function getUserRoleRecord(supabase, user) {
  if (!supabase || !user?.id) {
    return null;
  }

  const { data, error } = await supabase
    .from(USER_ROLES_TABLE)
    .select("user_id, email, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return null;
  }

  return normalizeRoleRecord(data);
}

export async function resolveAuthorizedRole(supabase, user) {
  if (!user) {
    return "";
  }

  const roleRecord = await getUserRoleRecord(supabase, user);
  if (roleRecord?.role) {
    return roleRecord.role;
  }

  const email = normalizeEmail(user.email);
  if (isSuperAdminEmail(email)) {
    return "Admin";
  }

  return "";
}

export async function hasAuthorizedWorkspaceAccess(supabase, user) {
  const role = await resolveAuthorizedRole(supabase, user);
  return Boolean(role);
}

export async function upsertUserRole({ userId, email, role }) {
  if (!hasSupabaseAdminEnv()) {
    return null;
  }

  const normalizedEmail = normalizeEmail(email);
  const normalizedRole = isSuperAdminEmail(normalizedEmail)
    ? "Admin"
    : normalizeAccessRole(role, "Vendedor");
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from(USER_ROLES_TABLE)
    .upsert({
      user_id: userId,
      email: normalizedEmail,
      role: normalizedRole,
    }, {
      onConflict: "user_id",
    })
    .select("user_id, email, role")
    .single();

  if (error) {
    throw error;
  }

  return normalizeRoleRecord(data);
}
