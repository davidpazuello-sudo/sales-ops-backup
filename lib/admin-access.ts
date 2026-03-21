// @ts-nocheck
import { cookies } from "next/headers";
import { readE2EUserFromCookies } from "lib/e2e-auth";
import { logAuthorizationFailure } from "lib/auth-logging";
import { getRoleRank, hasMinimumRole } from "lib/role-access";
import { createClient } from "lib/supabase/server";
import { mapSupabaseUser } from "lib/supabase/shared";
import { resolveAuthorizedRole } from "lib/user-roles";

export async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const e2eUser = readE2EUserFromCookies(cookieStore);
  if (e2eUser) {
    return e2eUser;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const role = await resolveAuthorizedRole(supabase, user);
  return mapSupabaseUser(user, role);
}

export async function requireAuthenticatedUser({
  minimumRole = "",
  route = "unknown",
  action = "",
  forbiddenMessage = "",
} = {}) {
  const user = await getAuthenticatedUser();

  if (!user) {
    const auth = {
      ok: false,
      status: 401,
      error: "Nao autenticado.",
      user: null,
    };
    logAuthorizationFailure(route, auth, { action, minimumRole });
    return auth;
  }

  if (!user.role) {
    const auth = {
      ok: false,
      status: 403,
      error: "Acesso ao workspace ainda nao liberado.",
      user,
    };
    logAuthorizationFailure(route, auth, { action, minimumRole });
    return auth;
  }

  if (minimumRole && !hasMinimumRole(user, minimumRole)) {
    const auth = {
      ok: false,
      status: 403,
      error: forbiddenMessage || `Acesso restrito a ${minimumRole} ou superior.`,
      user,
    };
    logAuthorizationFailure(route, auth, { action, minimumRole });
    return auth;
  }

  return {
    ok: true,
    user,
  };
}

export async function requireSuperAdmin(options = {}) {
  return requireAuthenticatedUser({
    ...options,
    minimumRole: "Admin",
    forbiddenMessage: options.forbiddenMessage || "Acesso restrito a super admin.",
  });
}

export { getRoleRank, hasMinimumRole };
