function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`MISSING_ENV:${name}`);
  }
  return value;
}

export function getSupabaseUrl() {
  return requireEnv("NEXT_PUBLIC_SUPABASE_URL");
}

export function getSupabasePublishableKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    || requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

export function mapSupabaseUser(user) {
  return {
    id: user.id,
    email: user.email || "",
    name:
      user.user_metadata?.full_name
      || user.user_metadata?.name
      || user.email
      || "Usuario",
    role:
      user.app_metadata?.role
      || user.user_metadata?.role
      || "Equipe comercial",
  };
}
