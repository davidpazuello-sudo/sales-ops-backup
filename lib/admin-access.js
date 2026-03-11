import { createClient } from "lib/supabase/server";
import { mapSupabaseUser } from "lib/supabase/shared";
import { resolveAuthorizedRole } from "lib/user-roles";

export async function getAuthenticatedUser() {
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

export async function requireSuperAdmin() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return {
      ok: false,
      status: 401,
      error: "Nao autenticado.",
    };
  }

  if (!user.isSuperAdmin) {
    return {
      ok: false,
      status: 403,
      error: "Acesso restrito a super admin.",
    };
  }

  return {
    ok: true,
    user,
  };
}
