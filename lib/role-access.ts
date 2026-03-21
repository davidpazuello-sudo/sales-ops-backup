// @ts-nocheck
import { normalizeAccessRole } from "./supabase/shared";

const ROLE_RANK = {
  Vendedor: 1,
  Supervisor: 2,
  Gerente: 3,
  Admin: 4,
};

export function getRoleRank(role) {
  const normalizedRole = normalizeAccessRole(role, "");
  return ROLE_RANK[normalizedRole] || 0;
}

export function hasMinimumRole(userOrRole, minimumRole) {
  if (!minimumRole) {
    return true;
  }

  const currentRole = typeof userOrRole === "string" ? userOrRole : userOrRole?.role;
  return getRoleRank(currentRole) >= getRoleRank(minimumRole);
}
