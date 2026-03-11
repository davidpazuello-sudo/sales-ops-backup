const { test, expect } = require("@playwright/test");

const adminCookie = {
  name: "salesops-e2e-role",
  value: "admin",
  domain: "127.0.0.1",
  path: "/",
  httpOnly: false,
  sameSite: "Lax",
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
      label: "Abrir permissões e acessos",
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

async function mockDashboardApis(page) {
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
        body: JSON.stringify({ ok: true, message: "Solicitacao aprovada. O email de primeiro acesso foi enviado." }),
      });
      return;
    }

    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(accessRequestsPayload) });
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
      }),
    });
  });

  await mockDashboardApis(page);
  await page.goto("/login");
  await context.addCookies([adminCookie]);

  await page.getByLabel("Email corporativo").fill("admin-e2e@sasi.com.br");
  await page.getByLabel("Senha").fill("Teste@123");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page).toHaveURL(/\/relatorios$/);
  await expect(page.getByRole("button", { name: /Permiss/i })).toBeVisible();
});

test("admin mantem permissoes e acessos visivel ao navegar", async ({ context, page }) => {
  await context.addCookies([adminCookie]);
  await mockDashboardApis(page);

  await page.goto("/negocios");
  await expect(page.getByRole("button", { name: /Permiss/i })).toBeVisible();
  await expect(page.getByText("Piloto Atlas")).toBeVisible();

  await page.getByRole("button", { name: /Relat/i }).click();
  await expect(page).toHaveURL(/\/relatorios$/);
  await expect(page.getByRole("button", { name: /Permiss/i })).toBeVisible();

  await page.getByRole("button", { name: /Vendedores/i }).click();
  await expect(page).toHaveURL(/\/vendedores$/);
  await expect(page.getByRole("button", { name: /Permiss/i })).toBeVisible();
});

test("admin abre notificacoes e acessa a fila de aprovacoes", async ({ context, page }) => {
  await context.addCookies([adminCookie]);
  await mockDashboardApis(page);

  await page.goto("/relatorios");
  await page.locator('button[aria-label*="Notifica"]').click();

  await expect(page.getByRole("dialog", { name: /Notifica/i })).toBeVisible();
  await expect(page.getByText("qa-admin@sasi.com.br solicitou acesso ao sistema.")).toBeVisible();

  await page.getByRole("button", { name: /qa-admin@sasi.com.br solicitou acesso/i }).click();
  await expect(page).toHaveURL(/\/permissoes-e-acessos$/);
  await expect(page.getByText("Solicitacoes em aberto")).toBeVisible();
  await expect(page.getByText("qa-admin@sasi.com.br")).toBeVisible();
});
