import { afterEach, describe, expect, it, vi } from "vitest";

function createRequest({
  method = "GET",
  body = undefined,
  headers = {},
  url = "http://localhost/api/test",
} = {}) {
  const normalizedHeaders = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
  );

  return {
    method,
    url,
    headers: {
      get(name) {
        return normalizedHeaders[String(name || "").toLowerCase()] || null;
      },
    },
    json: vi.fn().mockResolvedValue(body),
  };
}

async function readJsonResponse(response) {
  return {
    status: response.status,
    body: await response.json(),
  };
}

async function loadModule(modulePath, mocks = {}) {
  vi.resetModules();

  vi.doMock("lib/api-observability.js", () => ({
    startApiObservation: vi.fn(() => ({
      route: "test-route",
      path: "/api/test",
      method: "GET",
      requestId: "request-1",
      startedAt: Date.now(),
    })),
    jsonWithApiObservation: vi.fn((observation, body, init = {}) => new Response(JSON.stringify(body), {
      status: init?.status || 200,
      headers: {
        "content-type": "application/json",
      },
    })),
  }));

  Object.entries(mocks).forEach(([specifier, factory]) => {
    vi.doMock(specifier, factory);
  });

  return import(modulePath);
}

afterEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

describe("API route contracts", () => {
  it("returns the public Supabase configuration contract", async () => {
    const route = await loadModule("../app/api/auth/config/route.js", {
      "lib/supabase/shared": () => ({
        getPublicSupabaseConfig: vi.fn(() => ({
          url: "https://example.supabase.co",
          publishableKey: "sb_publishable_example",
        })),
      }),
    });

    const response = await route.GET();
    const payload = await readJsonResponse(response);

    expect(payload.status).toBe(200);
    expect(payload.body).toEqual({
      ok: true,
      supabase: {
        url: "https://example.supabase.co",
        publishableKey: "sb_publishable_example",
      },
    });
  });

  it("returns the health contract with environment and checks", async () => {
    const route = await loadModule("../app/api/health/route.js", {
      "lib/supabase/shared": () => ({
        getPublicSupabaseConfig: vi.fn(() => ({
          url: "https://example.supabase.co",
          publishableKey: "sb_publishable_example",
        })),
      }),
      "lib/auth-logging": () => ({
        logSecurityEvent: vi.fn(() => null),
      }),
    });

    const response = await route.GET(createRequest({
      method: "GET",
      url: "http://localhost/api/health",
    }));
    const payload = await readJsonResponse(response);

    expect(payload.status).toBe(200);
    expect(payload.body).toMatchObject({
      ok: true,
      service: "sales-ops-backup",
      checks: {
        hubspotConfigured: false,
        supabaseConfigured: true,
      },
    });
  });

  it("returns the login success contract with MFA metadata", async () => {
    const route = await loadModule("../app/api/auth/login/route.js", {
      "lib/audit-log-store": () => ({
        writeAuditLog: vi.fn().mockResolvedValue(null),
      }),
      "lib/supabase/server": () => ({
        createClient: vi.fn(async () => ({
          auth: {
            signInWithPassword: vi.fn(async () => ({
              data: {
                user: {
                  id: "user-1",
                  email: "admin@sasi.com.br",
                },
              },
              error: null,
            })),
            signOut: vi.fn(async () => ({ error: null })),
          },
        })),
      }),
      "lib/supabase/shared": () => ({
        isCorporateEmail: vi.fn(() => true),
        mapSupabaseUser: vi.fn((user, role) => ({
          id: user.id,
          email: user.email,
          name: "Admin QA",
          role,
          isSuperAdmin: role === "Admin",
        })),
      }),
      "lib/user-roles": () => ({
        resolveAuthorizedRole: vi.fn(async () => "Admin"),
      }),
      "lib/supabase/mfa": () => ({
        readMfaState: vi.fn(async () => ({
          requiresTwoFactor: true,
          hasTotpFactor: true,
        })),
      }),
      "lib/auth-rate-limit": () => ({
        consumeRateLimit: vi.fn(async () => ({ ok: true, remaining: 6, retryAfter: 0 })),
        getRequestClientKey: vi.fn(() => "client-login"),
      }),
      "lib/auth-logging": () => ({
        logAuthRouteError: vi.fn(),
        logRateLimitEvent: vi.fn(),
        logSecurityEvent: vi.fn(),
      }),
      "lib/auth-flows": () => ({
        normalizeEmail: vi.fn((value) => String(value || "").trim().toLowerCase()),
      }),
    });

    const response = await route.POST(createRequest({
      method: "POST",
      body: { email: "ADMIN@SASI.COM.BR", password: "Senha@123" },
    }));
    const payload = await readJsonResponse(response);

    expect(payload.status).toBe(200);
    expect(payload.body).toMatchObject({
      ok: true,
      requiresTwoFactor: true,
      twoFactorEnabled: true,
      user: {
        id: "user-1",
        email: "admin@sasi.com.br",
        role: "Admin",
      },
    });
  });

  it("returns the session contract for an authenticated user", async () => {
    const route = await loadModule("../app/api/auth/session/route.js", {
      "next/headers": () => ({
        cookies: vi.fn(async () => ({
          get: vi.fn(() => undefined),
        })),
      }),
      "lib/e2e-auth": () => ({
        readE2EUserFromCookies: vi.fn(() => null),
      }),
      "lib/supabase/server": () => ({
        createClient: vi.fn(async () => ({
          auth: {
            getUser: vi.fn(async () => ({
              data: {
                user: {
                  id: "user-2",
                  email: "seller@sasi.com.br",
                },
              },
              error: null,
            })),
          },
        })),
      }),
      "lib/supabase/shared": () => ({
        mapSupabaseUser: vi.fn((user, role) => ({
          id: user.id,
          email: user.email,
          name: "Seller QA",
          role,
          isSuperAdmin: false,
        })),
      }),
      "lib/user-roles": () => ({
        resolveAuthorizedRole: vi.fn(async () => "Vendedor"),
      }),
      "lib/supabase/mfa": () => ({
        readMfaState: vi.fn(async () => ({
          requiresTwoFactor: false,
          hasTotpFactor: false,
          currentLevel: null,
        })),
      }),
      "lib/auth-rate-limit": () => ({
        consumeRateLimit: vi.fn(async () => ({ ok: true, remaining: 59, retryAfter: 0 })),
        getRequestClientKey: vi.fn(() => "client-session"),
      }),
      "lib/auth-logging": () => ({
        logAuthRouteError: vi.fn(),
        logRateLimitEvent: vi.fn(),
        logSecurityEvent: vi.fn(),
      }),
    });

    const response = await route.GET(createRequest());
    const payload = await readJsonResponse(response);

    expect(payload.status).toBe(200);
    expect(payload.body).toMatchObject({
      authenticated: true,
      authorizedAccess: true,
      requiresTwoFactor: false,
      twoFactorEnabled: false,
      user: {
        id: "user-2",
        email: "seller@sasi.com.br",
        role: "Vendedor",
      },
    });
  });

  it("returns the logout contract", async () => {
    const route = await loadModule("../app/api/auth/logout/route.js", {
      "lib/supabase/server": () => ({
        createClient: vi.fn(async () => ({
          auth: {
            signOut: vi.fn(async () => ({ error: null })),
          },
        })),
      }),
      "lib/auth-rate-limit": () => ({
        consumeRateLimit: vi.fn(async () => ({ ok: true, remaining: 19, retryAfter: 0 })),
        getRequestClientKey: vi.fn(() => "client-logout"),
      }),
      "lib/auth-logging": () => ({
        logAuthRouteError: vi.fn(),
        logRateLimitEvent: vi.fn(),
        logSecurityEvent: vi.fn(),
      }),
    });

    const response = await route.POST(createRequest({ method: "POST" }));
    const payload = await readJsonResponse(response);

    expect(payload.status).toBe(200);
    expect(payload.body).toEqual({ ok: true });
  });

  it("returns the request-access contract", async () => {
    const route = await loadModule("../app/api/auth/request-access/route.js", {
      "lib/auth-flows": () => ({
        normalizeEmail: vi.fn((value) => String(value || "").trim().toLowerCase()),
      }),
      "lib/auth-logging": () => ({
        logAuthRouteError: vi.fn(),
        logRateLimitEvent: vi.fn(),
        logSecurityEvent: vi.fn(),
      }),
      "lib/access-requests-store": () => ({
        queueAccessRequest: vi.fn(async () => ({
          ok: true,
        })),
      }),
      "lib/supabase/shared": () => ({
        getSuperAdminEmails: vi.fn(() => ["admin@sasi.com.br"]),
        hasSupabaseAdminEnv: vi.fn(() => true),
        hasSupabaseEnv: vi.fn(() => true),
        isCorporateEmail: vi.fn(() => true),
      }),
      "lib/auth-rate-limit": () => ({
        consumeRateLimit: vi.fn(async () => ({ ok: true, remaining: 3, retryAfter: 0 })),
        getRequestClientKey: vi.fn(() => "client-request-access"),
      }),
      "lib/public-auth-errors": () => ({
        PUBLIC_AUTH_ERRORS: {
          tooManyAttempts: "tooManyAttempts",
          authUnavailable: "authUnavailable",
          corporateEmailRequired: "corporateEmailRequired",
          accessRequestSubmitted: "Solicitacao enviada com sucesso.",
        },
      }),
    });

    const response = await route.POST(createRequest({
      method: "POST",
      body: { email: "novo@sasi.com.br" },
    }));
    const payload = await readJsonResponse(response);

    expect(payload.status).toBe(200);
    expect(payload.body).toEqual({
      ok: true,
      message: "Solicitacao enviada com sucesso.",
    });
  });

  it("returns the first-access contract", async () => {
    const route = await loadModule("../app/api/auth/first-access/route.js", {
      "lib/auth-flows": () => ({
        normalizeEmail: vi.fn((value) => String(value || "").trim().toLowerCase()),
      }),
      "lib/auth-logging": () => ({
        logAuthRouteError: vi.fn(),
        logRateLimitEvent: vi.fn(),
        logSecurityEvent: vi.fn(),
      }),
      "lib/access-requests-store": () => ({
        queueAccessRequest: vi.fn(async () => ({
          ok: true,
        })),
      }),
      "lib/supabase/shared": () => ({
        getSuperAdminEmails: vi.fn(() => ["admin@sasi.com.br"]),
        hasSupabaseAdminEnv: vi.fn(() => true),
        hasSupabaseEnv: vi.fn(() => true),
        isCorporateEmail: vi.fn(() => true),
      }),
      "lib/auth-rate-limit": () => ({
        consumeRateLimit: vi.fn(async () => ({ ok: true, remaining: 3, retryAfter: 0 })),
        getRequestClientKey: vi.fn(() => "client-first-access"),
      }),
      "lib/public-auth-errors": () => ({
        PUBLIC_AUTH_ERRORS: {
          tooManyAttempts: "tooManyAttempts",
          authUnavailable: "authUnavailable",
          corporateEmailRequired: "corporateEmailRequired",
          accessRequestSubmitted: "Solicitacao enviada com sucesso.",
        },
      }),
    });

    const response = await route.POST(createRequest({
      method: "POST",
      body: { email: "primeiro@sasi.com.br" },
    }));
    const payload = await readJsonResponse(response);

    expect(payload.status).toBe(200);
    expect(payload.body).toEqual({
      ok: true,
      message: "Solicitacao enviada com sucesso.",
    });
  });

  it("returns the forgot-password contract", async () => {
    const route = await loadModule("../app/api/auth/forgot-password/route.js", {
      "lib/auth-flows": () => ({
        buildLoginRedirectUrl: vi.fn(() => "https://opssales.com.br/login"),
        normalizeEmail: vi.fn((value) => String(value || "").trim().toLowerCase()),
      }),
      "lib/auth-logging": () => ({
        logAuthRouteError: vi.fn(),
        logRateLimitEvent: vi.fn(),
        logSecurityEvent: vi.fn(),
      }),
      "lib/supabase/server": () => ({
        createClient: vi.fn(async () => ({
          auth: {
            resetPasswordForEmail: vi.fn(async () => ({ error: null })),
          },
        })),
      }),
      "lib/auth-rate-limit": () => ({
        consumeRateLimit: vi.fn(async () => ({ ok: true, remaining: 3, retryAfter: 0 })),
        getRequestClientKey: vi.fn(() => "client-forgot"),
      }),
      "lib/public-auth-errors": () => ({
        PUBLIC_AUTH_ERRORS: {
          tooManyAttempts: "tooManyAttempts",
          corporateEmailRequired: "corporateEmailRequired",
          forgotPasswordSubmitted: "Instrucoes enviadas.",
        },
      }),
      "lib/supabase/shared": () => ({
        isCorporateEmail: vi.fn(() => true),
      }),
    });

    const response = await route.POST(createRequest({
      method: "POST",
      body: { email: "redefinir@sasi.com.br" },
    }));
    const payload = await readJsonResponse(response);

    expect(payload.status).toBe(200);
    expect(payload.body).toEqual({
      ok: true,
      message: "Instrucoes enviadas.",
    });
  });

  it("returns the admin access-requests listing contract", async () => {
    const route = await loadModule("../app/api/admin/access-requests/route.js", {
      "lib/access-requests-store": () => ({
        approveAccessRequest: vi.fn(),
        listPendingAccessRequests: vi.fn(async () => ([{ id: "req-1", email: "qa@sasi.com.br" }])),
        rejectAccessRequest: vi.fn(),
      }),
      "lib/admin-access": () => ({
        requireSuperAdmin: vi.fn(async () => ({
          ok: true,
          user: { id: "admin-1", email: "admin@sasi.com.br", name: "Admin", role: "Admin" },
        })),
      }),
      "lib/auth-rate-limit": () => ({
        consumeRateLimit: vi.fn(async () => ({ ok: true, remaining: 19, retryAfter: 0 })),
        getRequestClientKey: vi.fn(() => "client-admin-list"),
      }),
      "lib/auth-logging": () => ({
        logAuthRouteError: vi.fn(),
        logRateLimitEvent: vi.fn(),
      }),
    });

    const response = await route.GET(createRequest());
    const payload = await readJsonResponse(response);

    expect(payload.status).toBe(200);
    expect(payload.body).toEqual({
      ok: true,
      requests: [{ id: "req-1", email: "qa@sasi.com.br" }],
    });
  });

  it("returns the admin access-requests resolution contract", async () => {
    const route = await loadModule("../app/api/admin/access-requests/route.js", {
      "lib/access-requests-store": () => ({
        approveAccessRequest: vi.fn(async () => ({
          ok: true,
          request: { id: "req-1", status: "approved" },
        })),
        listPendingAccessRequests: vi.fn(),
        rejectAccessRequest: vi.fn(),
      }),
      "lib/admin-access": () => ({
        requireSuperAdmin: vi.fn(async () => ({
          ok: true,
          user: { id: "admin-1", email: "admin@sasi.com.br", name: "Admin", role: "Admin" },
        })),
      }),
      "lib/auth-rate-limit": () => ({
        consumeRateLimit: vi.fn(async () => ({ ok: true, remaining: 11, retryAfter: 0 })),
        getRequestClientKey: vi.fn(() => "client-admin-resolve"),
      }),
      "lib/auth-logging": () => ({
        logAuthRouteError: vi.fn(),
        logRateLimitEvent: vi.fn(),
      }),
    });

    const response = await route.POST(createRequest({
      method: "POST",
      body: { requestId: "req-1", decision: "approved" },
    }));
    const payload = await readJsonResponse(response);

    expect(payload.status).toBe(200);
    expect(payload.body).toMatchObject({
      ok: true,
      message: "Solicitacao aprovada. O email de primeiro acesso foi enviado.",
      request: { id: "req-1", status: "approved" },
    });
  });

  it("returns the admin system-users listing contract", async () => {
    const route = await loadModule("../app/api/admin/system-users/route.js", {
      "lib/admin-access": () => ({
        requireSuperAdmin: vi.fn(async () => ({
          ok: true,
          user: { id: "admin-1", email: "admin@sasi.com.br", role: "Admin" },
        })),
      }),
      "lib/audit-log-store": () => ({
        writeAuditLog: vi.fn().mockResolvedValue(null),
        writeSystemEvent: vi.fn().mockResolvedValue(null),
      }),
      "lib/auth-rate-limit": () => ({
        consumeRateLimit: vi.fn(async () => ({ ok: true, remaining: 19, retryAfter: 0 })),
        getRequestClientKey: vi.fn(() => "client-system-users-list"),
      }),
      "lib/auth-logging": () => ({
        logAuthRouteError: vi.fn(),
        logRateLimitEvent: vi.fn(),
      }),
      "lib/system-users": () => ({
        listSystemUsers: vi.fn(async () => ([{ id: "user-1", email: "ana@sasi.com.br" }])),
        MANAGED_ROLE_OPTIONS: ["Admin", "Gerente", "Supervisor", "Vendedor"],
        saveSystemUserRole: vi.fn(),
      }),
    });

    const response = await route.GET(createRequest());
    const payload = await readJsonResponse(response);

    expect(payload.status).toBe(200);
    expect(payload.body).toEqual({
      ok: true,
      users: [{ id: "user-1", email: "ana@sasi.com.br" }],
      roleOptions: ["Admin", "Gerente", "Supervisor", "Vendedor"],
    });
  });

  it("returns the admin system-users save contract", async () => {
    const route = await loadModule("../app/api/admin/system-users/route.js", {
      "lib/admin-access": () => ({
        requireSuperAdmin: vi.fn(async () => ({
          ok: true,
          user: { id: "admin-1", email: "admin@sasi.com.br", role: "Admin" },
        })),
      }),
      "lib/audit-log-store": () => ({
        writeAuditLog: vi.fn().mockResolvedValue(null),
        writeSystemEvent: vi.fn().mockResolvedValue(null),
      }),
      "lib/auth-rate-limit": () => ({
        consumeRateLimit: vi.fn(async () => ({ ok: true, remaining: 11, retryAfter: 0 })),
        getRequestClientKey: vi.fn(() => "client-system-users-save"),
      }),
      "lib/auth-logging": () => ({
        logAuthRouteError: vi.fn(),
        logRateLimitEvent: vi.fn(),
      }),
      "lib/system-users": () => ({
        listSystemUsers: vi.fn(),
        MANAGED_ROLE_OPTIONS: ["Admin", "Gerente", "Supervisor", "Vendedor"],
        saveSystemUserRole: vi.fn(async () => ({
          userId: "user-1",
          email: "ana@sasi.com.br",
          role: "Gerente",
        })),
      }),
    });

    const response = await route.POST(createRequest({
      method: "POST",
      body: { userId: "user-1", email: "ana@sasi.com.br", role: "Gerente" },
    }));
    const payload = await readJsonResponse(response);

    expect(payload.status).toBe(200);
    expect(payload.body).toEqual({
      ok: true,
      message: "Cargo atualizado com sucesso.",
      user: {
        userId: "user-1",
        email: "ana@sasi.com.br",
        role: "Gerente",
      },
    });
  });

  it("returns the notifications contract", async () => {
    const route = await loadModule("../app/api/notifications/route.js", {
      "lib/admin-access": () => ({
        requireSuperAdmin: vi.fn(async () => ({
          ok: true,
          user: { id: "admin-1", email: "admin@sasi.com.br", role: "Admin" },
        })),
      }),
      "lib/access-requests-store": () => ({
        listNotificationsForUser: vi.fn(async () => ([{ id: "notif-1", title: "Nova solicitacao" }])),
      }),
      "lib/auth-rate-limit": () => ({
        consumeRateLimit: vi.fn(async () => ({ ok: true, remaining: 39, retryAfter: 0 })),
        getRequestClientKey: vi.fn(() => "client-notifications"),
      }),
      "lib/auth-logging": () => ({
        logAuthRouteError: vi.fn(),
        logRateLimitEvent: vi.fn(),
      }),
    });

    const response = await route.GET(createRequest());
    const payload = await readJsonResponse(response);

    expect(payload.status).toBe(200);
    expect(payload.body).toEqual({
      ok: true,
      notifications: [{ id: "notif-1", title: "Nova solicitacao" }],
    });
  });

  it("returns the deal stage update contract", async () => {
    const route = await loadModule("../app/api/deals/stage/route.js", {
      "lib/admin-access": () => ({
        requireAuthenticatedUser: vi.fn(async () => ({
          ok: true,
          user: { id: "seller-1", email: "seller@sasi.com.br", role: "Vendedor" },
        })),
      }),
      "lib/auth-rate-limit": () => ({
        consumeRateLimit: vi.fn(async () => ({ ok: true, remaining: 18, retryAfter: 0 })),
        getRequestClientKey: vi.fn(() => "client-deal-stage"),
      }),
      "lib/auth-logging": () => ({
        logAuthRouteError: vi.fn(),
        logRateLimitEvent: vi.fn(),
      }),
      "lib/hubspot": () => ({
        updateHubSpotDealStage: vi.fn(async () => ({ id: "deal-1" })),
      }),
      "lib/audit-log-store": () => ({
        writeAuditLog: vi.fn().mockResolvedValue(null),
        writeSystemEvent: vi.fn().mockResolvedValue(null),
      }),
    });

    const response = await route.POST(createRequest({
      method: "POST",
      body: { dealId: "deal-1", stageId: "proposal", stageLabel: "Proposta Enviada" },
    }));
    const payload = await readJsonResponse(response);

    expect(payload.status).toBe(200);
    expect(payload.body).toEqual({
      ok: true,
      message: "Etapa atualizada para Proposta Enviada.",
      deal: {
        id: "deal-1",
        stageId: "proposal",
        stageLabel: "Proposta Enviada",
      },
    });
  });

  it("returns the meetings creation contract", async () => {
    const route = await loadModule("../app/api/meetings/route.js", {
      "lib/admin-access": () => ({
        requireAuthenticatedUser: vi.fn(async () => ({
          ok: true,
          user: { id: "seller-1", email: "seller@sasi.com.br", role: "Vendedor" },
        })),
      }),
      "lib/auth-rate-limit": () => ({
        consumeRateLimit: vi.fn(async () => ({ ok: true, remaining: 11, retryAfter: 0 })),
        getRequestClientKey: vi.fn(() => "client-meetings"),
      }),
      "lib/auth-logging": () => ({
        logAuthRouteError: vi.fn(),
        logRateLimitEvent: vi.fn(),
      }),
      "lib/operational-data": () => ({
        createOperationalMeeting: vi.fn(async () => ({
          id: "meeting-1",
          title: "Ritual semanal",
          owner: "Ana Souza",
          ownerEmail: "ana@sasi.com.br",
        })),
        listPersistedMeetingsForUser: vi.fn(async () => []),
      }),
      "lib/audit-log-store": () => ({
        writeAuditLog: vi.fn().mockResolvedValue(null),
        writeSystemEvent: vi.fn().mockResolvedValue(null),
      }),
    });

    const response = await route.POST(createRequest({
      method: "POST",
      body: {
        title: "Ritual semanal",
        summary: "Resumo",
        meetingAt: new Date().toISOString(),
        ownerName: "Ana Souza",
        ownerEmail: "ana@sasi.com.br",
      },
    }));
    const payload = await readJsonResponse(response);

    expect(payload.status).toBe(200);
    expect(payload.body).toMatchObject({
      ok: true,
      message: "Reuniao registrada com sucesso.",
      meeting: {
        id: "meeting-1",
        title: "Ritual semanal",
        owner: "Ana Souza",
      },
    });
  });

  it("returns the dashboard contract for the HubSpot endpoint", async () => {
    const dashboard = {
      configured: true,
      integration: {
        status: "Ativa",
        source: "hubspot",
        owners: 1,
        deals: 1,
        pipelineAmount: 50000,
      },
      summary: {
        sellersActive: 1,
        totalPipeline: 50000,
        wonThisMonth: 10000,
        stalledDeals: 0,
      },
      sellers: [],
      alerts: [],
      deals: [],
      reports: [],
    };

    const route = await loadModule("../app/api/hubspot/dashboard/route.js", {
      "lib/admin-access": () => ({
        requireAuthenticatedUser: vi.fn(async () => ({
          ok: true,
          user: { id: "seller-1", email: "seller@sasi.com.br", role: "Vendedor" },
        })),
      }),
      "lib/auth-rate-limit": () => ({
        consumeRateLimit: vi.fn(async () => ({ ok: true, remaining: 59, retryAfter: 0 })),
        getRequestClientKey: vi.fn(() => "client-dashboard"),
      }),
      "lib/hubspot": () => ({
        getHubSpotDashboardData: vi.fn(async () => dashboard),
      }),
      "lib/operational-data": () => ({
        enrichDashboardWithOperationalData: vi.fn(async (value) => ({
          ...value,
          meetings: [],
          auditLogs: [],
          syncLogs: [],
          notifications: [],
        })),
      }),
      "lib/auth-logging": () => ({
        logAuthRouteError: vi.fn(),
        logRateLimitEvent: vi.fn(),
      }),
      "lib/dashboard-contracts": () => ({
        assertDashboardData: vi.fn((value) => value),
      }),
      "lib/dashboard-fallback": () => ({
        createDashboardFallbackData: vi.fn((value) => value),
      }),
    });

    const response = await route.GET(createRequest());
    const payload = await readJsonResponse(response);

    expect(payload.status).toBe(200);
    expect(payload.body).toEqual({
      ...dashboard,
      meetings: [],
      auditLogs: [],
      syncLogs: [],
      notifications: [],
    });
  });
});
