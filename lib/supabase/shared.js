const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPER_ADMIN_EMAILS = process.env.SUPER_ADMIN_EMAILS || "";
const CORPORATE_EMAIL_DOMAINS = process.env.CORPORATE_EMAIL_DOMAINS || "sasi.com.br";
const ACCESS_ROLES = ["Admin", "Supervisor", "Vendedor"];

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

export function hasSupabaseAdminEnv() {
  return Boolean(
    SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY,
  );
}

export function getSupabaseUrl() {
  return requireEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL);
}

export function getSupabasePublishableKey() {
  return SUPABASE_PUBLISHABLE_KEY
    || requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", SUPABASE_ANON_KEY);
}

export function getSupabaseServiceRoleKey() {
  return requireEnv("SUPABASE_SERVICE_ROLE_KEY", SUPABASE_SERVICE_ROLE_KEY);
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

export function getSuperAdminEmails() {
  return SUPER_ADMIN_EMAILS
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function getCorporateEmailDomains() {
  return CORPORATE_EMAIL_DOMAINS
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function isCorporateEmail(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const domains = getCorporateEmailDomains();

  if (!normalizedEmail || !domains.length || !normalizedEmail.includes("@")) {
    return false;
  }

  const domain = normalizedEmail.split("@").pop();
  return domains.includes(domain || "");
}

export function normalizeAccessRole(role, fallback = "Vendedor") {
  const normalized = String(role || "").trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }

  const matchedRole = ACCESS_ROLES.find((item) => item.toLowerCase() === normalized);
  return matchedRole || fallback;
}

export function isSuperAdminEmail(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) {
    return false;
  }

  return getSuperAdminEmails().includes(normalizedEmail);
}

export function mapSupabaseUser(user, resolvedRole = "") {
  const email = user.email || "";
  const metadataRole = normalizeAccessRole(user.app_metadata?.role, "");
  const normalizedRole = isSuperAdminEmail(email)
    ? "Admin"
    : normalizeAccessRole(resolvedRole || metadataRole, "Vendedor");
  const isSuperAdmin = normalizedRole === "Admin";

  return {
    id: user.id,
    email,
    name:
      user.user_metadata?.full_name
      || user.user_metadata?.name
      || email
      || "Usuario",
    role: normalizedRole,
    isSuperAdmin,
  };
}
