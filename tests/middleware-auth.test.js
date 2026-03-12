import { afterEach, describe, expect, it, vi } from "vitest";

function createRequest(pathname) {
  return {
    url: `http://localhost${pathname}`,
    nextUrl: {
      pathname,
      search: "",
    },
    cookies: {
      getAll() {
        return [];
      },
      set() {},
      get() {
        return undefined;
      },
    },
  };
}

async function loadMiddleware({
  user = null,
  role = "",
  hasSupabaseEnv = true,
  requiresTwoFactor = false,
} = {}) {
  vi.resetModules();

  vi.doMock("@supabase/ssr", () => ({
    createServerClient: vi.fn(() => ({
      auth: {
        getUser: vi.fn(async () => ({
          data: { user },
        })),
      },
    })),
  }));

  vi.doMock("../lib/supabase/shared.js", () => ({
    getSupabasePublishableKey: vi.fn(() => "pk"),
    getSupabaseUrl: vi.fn(() => "https://example.supabase.co"),
    hasSupabaseEnv: vi.fn(() => hasSupabaseEnv),
    mapSupabaseUser: vi.fn((currentUser, currentRole) => ({
      id: currentUser?.id || "",
      email: currentUser?.email || "",
      role: currentRole,
      isSuperAdmin: currentRole === "Admin",
    })),
  }));

  vi.doMock("../lib/supabase/mfa.js", () => ({
    readMfaState: vi.fn(async () => ({
      requiresTwoFactor,
    })),
  }));

  vi.doMock("lib/e2e-auth", () => ({
    readE2EUserFromCookies: vi.fn(() => null),
  }));

  vi.doMock("lib/user-roles", () => ({
    resolveAuthorizedRole: vi.fn(async () => role),
  }));

  vi.doMock("lib/role-access", () => ({
    hasMinimumRole: vi.fn((currentUser, minimumRole) => {
      const rank = {
        Vendedor: 1,
        Supervisor: 2,
        Gerente: 3,
        Admin: 4,
      };

      return (rank[currentUser?.role] || 0) >= (rank[minimumRole] || 0);
    }),
  }));

  vi.doMock("lib/auth-logging", () => ({
    logAuthRouteError: vi.fn(),
    logAuthorizationFailure: vi.fn(),
  }));

  return import("../lib/supabase/middleware.js");
}

afterEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

describe("supabase middleware authorization", () => {
  it("redirects anonymous users from protected pages to login", async () => {
    const middleware = await loadMiddleware({
      user: null,
      role: "",
    });

    const response = await middleware.updateSession(createRequest("/relatorios"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login");
    expect(response.headers.get("location")).toContain("redirect=%2Frelatorios");
  });

  it("redirects vendedores away from super-admin pages", async () => {
    const middleware = await loadMiddleware({
      user: {
        id: "seller-1",
        email: "seller@sasi.com.br",
      },
      role: "Vendedor",
    });

    const response = await middleware.updateSession(createRequest("/permissoes-e-acessos"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/relatorios");
  });

  it("returns 401 JSON for unauthenticated API requests outside auth routes", async () => {
    const middleware = await loadMiddleware({
      user: null,
      role: "",
    });

    const response = await middleware.updateSession(createRequest("/api/notifications"));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Nao autenticado." });
  });
});
