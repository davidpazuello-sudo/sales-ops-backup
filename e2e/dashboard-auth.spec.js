const { test, expect } = require("@playwright/test");

function buildRoleCookies(role) {
  return [
    {
      name: "salesops-e2e-role",
      value: role,
      url: "http://127.0.0.1:3005",
      httpOnly: false,
      sameSite: "Lax",
    },
    {
      name: "salesops-e2e-role",
      value: role,
      url: "http://localhost:3005",
      httpOnly: false,
      sameSite: "Lax",
    },
  ];
}

const adminSessionUser = {
  id: "e2e-admin",
  name: "Admin E2E",
  role: "Admin",
  email: "admin-e2e@sasi.com.br",
  isSuperAdmin: true,
  twoFactorEnabled: false,
  twoFactorLevel: null,
};

const sellerSessionUser = {
  id: "e2e-seller",
  name: "Vendedor E2E",
  role: "Vendedor",
  email: "vendedor-e2e@sasi.com.br",
  isSuperAdmin: false,
  twoFactorEnabled: false,
  twoFactorLevel: null,
};

const dashboardPayload = {
  configured: true,
  integration: {
    status: "Conectado",
    source: "hubspot",
    owners: 2,
    deals: 3,
    pipelineAmount: 125000,
    ownerDirectory: [],
    profileEmail: "admin-e2e@sasi.com.br",
    profileRole: "Admin",
  },
  summary: {
    sellersActive: 2,
    totalPipeline: 125000,
    wonThisMonth: 42000,
    stalledDeals: 1,
  },
  states: {
    source: "hubspot",
    loading: "ready",
    empty: {
      sellers: false,
      deals: false,
      alerts: false,
    },
    errors: [],
  },
  pipeline: {
    stages: [
      { id: "opportunity", label: "Oportunidade", count: 1, totalAmount: 41000, totalLabel: "R$ 41.000", isClosed: false },
      { id: "proposal", label: "Proposta Enviada", count: 1, totalAmount: 62000, totalLabel: "R$ 62.000", isClosed: false },
      { id: "closed", label: "Negocio Fechado", count: 1, totalAmount: 22000, totalLabel: "R$ 22.000", isClosed: true },
    ],
    totalOpenDeals: 2,
    totalClosedDeals: 1,
  },
  sellers: [
    {
      id: "seller-1",
      name: "Ana Souza",
      email: "ana@sasi.com.br",
      team: "Publico",
      initials: "AS",
      openDeals: 2,
      wonDeals: 1,
      stalledDeals: 0,
      pipelineAmount: 103000,
      pipelineLabel: "R$ 103.000",
      compactPipeline: "R$ 103k",
      metaPercent: 92,
      health: "Quente",
      status: "Estavel",
      note: "Boa evolucao no pipeline.",
    },
  ],
  alerts: [["Pipeline", "1 negocio parado", "Atencao"]],
  deals: [
    { id: "deal-1", name: "Piloto Atlas", owner: "Ana Souza", stage: "Oportunidade", amountLabel: "R$ 41.000", staleLabel: "2d sem touch", amount: 41000, stageId: "opportunity", lastTouchDays: 2 },
    { id: "deal-2", name: "Expansao Solaris", owner: "Ana Souza", stage: "Proposta Enviada", amountLabel: "R$ 62.000", staleLabel: "1d sem touch", amount: 62000, stageId: "proposal", lastTouchDays: 1 },
    { id: "deal-3", name: "Renovacao Aurora", owner: "Carlos Lima", stage: "Negocio Fechado", amountLabel: "R$ 22.000", staleLabel: "Hoje", amount: 22000, stageId: "closed", lastTouchDays: 0 },
  ],
  tasks: [
    {
      id: "meeting-1",
      externalId: "meeting-1",
      objectType: "meeting",
      kind: "meeting",
      kindLabel: "Reuniao",
      title: "Reuniao com Secretaria de Educacao",
      description: "Revisar proximos passos da licitacao.",
      ownerId: "seller-1",
      ownerName: "Ana Souza",
      ownerEmail: "ana@sasi.com.br",
      ownerTeam: "Publico",
      status: "SCHEDULED",
      statusLabel: "Agendada",
      isCompleted: false,
      isOverdue: false,
      dueAt: "2026-03-12T14:00:00.000Z",
      dueLabel: "12/03/2026 11:00",
      priority: "Alta",
      taskTypeLabel: "Reuniao",
      updatedAt: "2026-03-12T10:00:00.000Z",
      source: "hubspot",
    },
    {
      id: "call-1",
      externalId: "call-1",
      objectType: "call",
      kind: "call",
      kindLabel: "Chamada",
      title: "Ligacao de follow-up",
      description: "Follow-up com o cliente.",
      ownerId: "seller-1",
      ownerName: "Ana Souza",
      ownerEmail: "ana@sasi.com.br",
      ownerTeam: "Publico",
      status: "NOT_STARTED",
      statusLabel: "Nao iniciada",
      isCompleted: false,
      isOverdue: false,
      dueAt: "2026-03-12T15:00:00.000Z",
      dueLabel: "12/03/2026 12:00",
      priority: "Media",
      taskTypeLabel: "Chamada",
      updatedAt: "2026-03-12T10:30:00.000Z",
      source: "hubspot",
    },
  ],
  campaigns: [
    {
      id: "educacao-2026",
      name: "Educacao 2026",
      source: "hubspot",
      prospecting: {
        callsDaily: 11,
        callsWeekly: 38,
        connectionsDaily: 5,
        connectionsWeekly: 19,
        dailyCallTarget: 15,
        dailyConnectionTarget: 7,
      },
      qualification: {
        mqlCount: 24,
        sqlCount: 18,
        conversionRate: 75,
        targetSqls: 40,
      },
      sales: {
        proposalCount: 6,
        closedWonCount: 2,
        conversionRate: 33,
        targetClosedWon: 15,
      },
      smartGoals: [
        { id: "sqls", label: "Leads qualificados (SQLs)", current: 18, target: 40, progress: 45, remaining: 22, status: "Em andamento" },
        { id: "meetings", label: "Reunioes agendadas", current: 21, target: 70, progress: 30, remaining: 49, status: "Em andamento" },
        { id: "closed-won", label: "Contratos fechados", current: 2, target: 15, progress: 13, remaining: 13, status: "Em andamento" },
        { id: "qualified-opportunities", label: "Oportunidades qualificadas", current: 24, target: 65, progress: 37, remaining: 41, status: "Em andamento" },
      ],
      meetingCount: 21,
      qualifiedOpportunityCount: 24,
      lastActivityAt: "2026-03-12T11:00:00.000Z",
    },
  ],
  reports: [["Diretoria", "Resumo semanal", "PDF"]],
};

const notificationsPayload = {
  ok: true,
  notifications: [
    {
      id: "notif-1",
      title: "qa-admin@sasi.com.br solicitou acesso ao sistema.",
      body: "A solicitacao de qa-admin@sasi.com.br aguarda aprovacao de um admin.",
      tag: "Solicitacao de acesso",
      createdAt: "2026-03-11T10:00:00.000Z",
      read: false,
      trash: false,
      route: "/permissoes-e-acessos",
      label: "Abrir Permissoes e Acessos",
    },
  ],
};

const accessRequestsPayload = {
  ok: true,
  requests: [
    {
      id: "request-1",
      email: "qa-admin@sasi.com.br",
      type: "request-access",
      status: "pending",
      requestedAt: "2026-03-11T10:00:00.000Z",
      resolvedAt: null,
      resolvedByEmail: "",
      resolvedByName: "",
      lastError: "",
      requestedRole: "Vendedor",
    },
  ],
};

const systemUsersPayload = {
  ok: true,
  users: [
    {
      id: "user-1",
      email: "admin-e2e@sasi.com.br",
      fullName: "Admin E2E",
      role: "Admin",
      status: "active",
    },
  ],
};

async function mockDashboardApis(page, sessionUser = adminSessionUser) {
  await page.route("**/api/auth/config", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        supabase: {
          url: "https://example.supabase.co",
          publishableKey: "sb_publishable_example",
        },
      }),
    });
  });

  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        user: sessionUser,
        requiresTwoFactor: false,
        twoFactorEnabled: Boolean(sessionUser.twoFactorEnabled),
        twoFactorLevel: sessionUser.twoFactorLevel || null,
      }),
    });
  });

  await page.route("**/api/auth/logout", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });

  await page.route("**/api/hubspot/dashboard", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(dashboardPayload) });
  });

  await page.route("**/api/notifications", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(notificationsPayload) });
  });

  await page.route("**/api/admin/access-requests", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          message: "Solicitacao aprovada. O email de primeiro acesso foi enviado.",
          request: { id: "request-1", status: "approved" },
        }),
      });
      return;
    }

    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(accessRequestsPayload) });
  });

  await page.route("**/api/admin/system-users", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(systemUsersPayload) });
  });
}

test("login redireciona para relatorios com auth valida", async ({ context, page }) => {
  await page.route("**/api/auth/login", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        user: {
          name: "Admin E2E",
          role: "Admin",
          email: "admin-e2e@sasi.com.br",
          isSuperAdmin: true,
        },
        requiresTwoFactor: false,
        twoFactorEnabled: false,
      }),
    });
  });

  await mockDashboardApis(page);
  await page.goto("/login");
  await context.addCookies(buildRoleCookies("admin"));

  await page.getByLabel("Email corporativo").fill("admin-e2e@sasi.com.br");
  await page.getByLabel("Senha").fill("Teste@123");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page).toHaveURL(/\/relatorios$/);
  await expect(page.getByRole("button", { name: /Permiss/i })).toBeVisible();
});

test("fluxo de MFA exibe a etapa de segundo fator", async ({ page }) => {
  await mockDashboardApis(page);

  await page.goto("/login?mfa=required");

  await expect(page.getByText("Confirmar segundo fator")).toBeVisible();
  await expect(page.getByLabel("Codigo de 2FA")).toBeVisible();
  await expect(page.getByRole("button", { name: "Validar e entrar" })).toBeVisible();
});

test("vendedor nao acessa permissoes e acessos", async ({ context, page }) => {
  await context.addCookies(buildRoleCookies("seller"));
  await mockDashboardApis(page, sellerSessionUser);

  await page.goto("/permissoes-e-acessos");

  await expect(page).toHaveURL(/\/relatorios$/);
  await expect(page.locator('nav[aria-label="Principal"]').getByRole("button", { name: /Relat/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Permiss/i })).toHaveCount(0);
});

test("admin aprova uma solicitacao pendente pela tela de acessos", async ({ context, page }) => {
  await context.addCookies(buildRoleCookies("admin"));
  await mockDashboardApis(page);

  await page.goto("/permissoes-e-acessos");

  await expect(page.getByText("Solicitacoes em aberto")).toBeVisible();
  await expect(page.getByText("qa-admin@sasi.com.br")).toBeVisible();
  await page.getByRole("button", { name: "Aprovar" }).click();
  await expect(page.getByText("Solicitacao aprovada. O email de primeiro acesso foi enviado.")).toBeVisible();
});

test("main navigation smoke covers relatorios, negocios, campanhas, tarefas e vendedores", async ({ context, page }) => {
  await context.addCookies(buildRoleCookies("admin"));
  await mockDashboardApis(page);

  await page.goto("/relatorios");
  await expect(page.getByText("KPIs comerciais")).toBeVisible();

  await page.getByRole("button", { name: /Neg/i }).click();
  await expect(page).toHaveURL(/\/negocios$/);
  await expect(page.getByText("Piloto Atlas")).toBeVisible();
  await expect(page.getByText("Proposta Enviada")).toBeVisible();

  await page.getByRole("button", { name: /Campanhas/i }).click();
  await expect(page).toHaveURL(/\/campanhas$/);
  await expect(page.getByText("Relatorios de qualificacao e conversao")).toBeVisible();
  await expect(page.getByText("Acompanhamento macro da campanha")).toBeVisible();

  await page.getByRole("button", { name: /Tarefas/i }).click();
  await expect(page).toHaveURL(/\/tarefas$/);
  await expect(page.getByText("Reuniao com Secretaria de Educacao")).toBeVisible();

  await page.getByRole("button", { name: /Vend/i }).click();
  await expect(page).toHaveURL(/\/vendedores$/);
  await expect(page.getByText("Ana Souza")).toBeVisible();
});

test("admin abre notificacoes e acessa a fila de aprovacoes", async ({ context, page }) => {
  await context.addCookies(buildRoleCookies("admin"));
  await mockDashboardApis(page);

  await page.goto("/relatorios");
  await page.locator('button[aria-label*="Notifica"]').click();

  await expect(page.getByRole("dialog", { name: /Notifica/i })).toBeVisible();
  await expect(page.getByText("Solicitacao de acesso")).toBeVisible();
  await expect(page.getByText("A solicitacao de qa-admin@sasi.com.br aguarda aprovacao de um admin.")).toBeVisible();

  await page.getByRole("button", { name: /Solicitacao de acesso/i }).click();
  await expect(page).toHaveURL(/\/permissoes-e-acessos$/);
  await expect(page.getByText("Solicitacoes em aberto")).toBeVisible();
  await expect(page.getByText("qa-admin@sasi.com.br")).toBeVisible();
});
