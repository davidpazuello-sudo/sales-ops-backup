export const E2E_AUTH_COOKIE = "salesops-e2e-role";

export type E2ERole = "admin" | "seller";

export type E2EUser = {
  id: string;
  email: string;
  name: string;
  role: "Admin" | "Vendedor";
  isSuperAdmin: boolean;
  twoFactorEnabled: boolean;
  twoFactorLevel: null;
};

type CookieReader = {
  get(name: string): { value?: string } | undefined;
};

function buildE2EUser(role: E2ERole): E2EUser {
  const normalizedRole = role === "admin" ? "Admin" : "Vendedor";

  return {
    id: `e2e-${role}`,
    email: role === "admin" ? "admin-e2e@sasi.com.br" : "vendedor-e2e@sasi.com.br",
    name: role === "admin" ? "Admin E2E" : "Vendedor E2E",
    role: normalizedRole,
    isSuperAdmin: role === "admin",
    twoFactorEnabled: false,
    twoFactorLevel: null,
  };
}

export function readE2EUserFromCookies(cookieStore: CookieReader): E2EUser | null {
  if (
    process.env.E2E_AUTH_BYPASS !== "true" ||
    process.env.NODE_ENV === "production"
  ) {
    return null;
  }

  const role = cookieStore.get(E2E_AUTH_COOKIE)?.value;
  if (role !== "admin" && role !== "seller") {
    return null;
  }

  return buildE2EUser(role);
}
