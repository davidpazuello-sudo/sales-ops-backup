const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function requireEnv(name, value) {
  if (!value) {
    throw new Error(`MISSING_ENV:${name}`);
  }
  return value;
}

export function hasSupabaseEnv() {
  return Boolean(
    SUPABASE_URL && (SUPABASE_PUBLISHABLE_KEY || SUPABASE_ANON_KEY),
  );
}

export function getSupabaseUrl() {
  return requireEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL);
}

export function getSupabasePublishableKey() {
  return SUPABASE_PUBLISHABLE_KEY
    || requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", SUPABASE_ANON_KEY);
}

export function getPublicSupabaseConfig() {
  if (!hasSupabaseEnv()) {
    return null;
  }

  return {
    url: getSupabaseUrl(),
    publishableKey: getSupabasePublishableKey(),
  };
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
