export const STORAGE_KEY = "sales-ops-backup-personalization";
export const PROFILE_PHOTO_KEY = "sales-ops-backup-profile-photo";

export const personalizationDefaults = {
  theme: "Claro ativo",
  font: "Manrope",
  fontSize: "Média",
  density: "Confortável",
  highContrast: false,
  animations: true,
  collapseSidebarOnOpen: false,
  reinforcedCards: false,
  showShortcuts: true,
  instantPreview: true,
};

export const personalizationToggles = [
  { id: "highContrast", label: "Contraste elevado", description: "Melhora a legibilidade de textos e bordas." },
  { id: "animations", label: "Animações sutis", description: "Liga ou reduz transições visuais do painel." },
  { id: "collapseSidebarOnOpen", label: "Sidebar recolhida ao abrir", description: "Inicia a navegação lateral recolhida." },
  { id: "reinforcedCards", label: "Cards com borda reforçada", description: "Dá mais destaque visual aos containers." },
  { id: "showShortcuts", label: "Mostrar atalhos de teclado", description: "Exibe dicas curtas de navegação quando disponíveis." },
  { id: "instantPreview", label: "Prévia instantânea", description: "Aplica as alterações assim que você seleciona." },
];

export function sellerToSlug(name) {
  return String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function dealToSlug(deal) {
  return `${sellerToSlug(deal?.name)}-${deal?.id}`;
}

export function findDealByRouteId(deals, routeId) {
  const normalizedRoute = String(routeId || "").toLowerCase();
  return deals.find((deal) => {
    if (String(deal.id).toLowerCase() === normalizedRoute) {
      return true;
    }

    if (sellerToSlug(deal.name) === normalizedRoute) {
      return true;
    }

    return dealToSlug(deal) === normalizedRoute;
  });
}

export function meetingToSlug(meetingOrTitle, id = "") {
  if (!meetingOrTitle || typeof meetingOrTitle === "string") {
    return sellerToSlug(`${meetingOrTitle || ""}-${id || ""}`);
  }

  return sellerToSlug(`${meetingOrTitle.title || ""}-${meetingOrTitle.externalId || meetingOrTitle.id || ""}`);
}

export function getMeetingsForSeller(dashboardData, seller) {
  if (!seller) {
    return [];
  }

  const sellerName = sellerToSlug(seller.name);
  const sellerEmail = String(seller.email || "").trim().toLowerCase();
  const sellerOwnerId = String(seller.id || "").trim();
  const meetings = Array.isArray(dashboardData?.meetings) ? dashboardData.meetings : [];

  return meetings.filter((meeting) => {
    const ownerSlug = sellerToSlug(meeting.owner || "");
    const ownerEmail = String(meeting.ownerEmail || "").trim().toLowerCase();
    const hubspotOwnerId = String(meeting.hubspotOwnerId || "").trim();

    return ownerSlug === sellerName || ownerEmail === sellerEmail || (sellerOwnerId && hubspotOwnerId === sellerOwnerId);
  });
}

export function buildMainSectionRoute(section) {
  const routeMap = {
    reports: "/relatorios",
    sellers: "/vendedores",
    deals: "/negocios",
    campaigns: "/campanhas",
    tasks: "/tarefas",
    access: "/permissoes-e-acessos",
    settings: "/configuracoes",
    profile: "/perfil",
  };

  return routeMap[section] || "/relatorios";
}

export function getCurrentSection({ activeNav, activeConfig, accountSection, configSections }) {
  return activeNav === "profile"
    ? accountSection
    : configSections.find((item) => item.id === activeConfig);
}

export function getVisibleNotifications(items, notificationTab) {
  return items.filter((item) => {
    if (notificationTab === "unread") {
      return !item.read && !item.trash;
    }

    if (notificationTab === "trash") {
      return item.trash;
    }

    return !item.trash;
  });
}

export function getAppliedPersonalization(personalization, systemDark) {
  const theme = personalization.theme === "Automático"
    ? (systemDark ? "dark" : "light")
    : (personalization.theme === "Escuro" ? "dark" : "light");

  const fontMap = {
    Manrope: "manrope",
    "IBM Plex Sans": "ibm-plex-sans",
    "Source Sans 3": "source-sans-3",
    Montserrat: "montserrat",
    "Nunito Sans": "nunito-sans",
    "Work Sans": "work-sans",
  };

  const fontVariableMap = {
    Manrope: "var(--font-manrope)",
    "IBM Plex Sans": "var(--font-ibm-plex-sans)",
    "Source Sans 3": "var(--font-source-sans)",
    Montserrat: "var(--font-montserrat)",
    "Nunito Sans": "var(--font-nunito-sans)",
    "Work Sans": "var(--font-work-sans)",
  };

  const fontSizeMap = {
    Pequena: "small",
    Média: "medium",
    Grande: "large",
  };

  const densityMap = {
    Compacta: "compact",
    Confortável: "comfortable",
    Expandida: "expanded",
  };

  return {
    theme,
    font: fontMap[personalization.font],
    fontVariable: fontVariableMap[personalization.font] || "var(--font-manrope)",
    fontSize: fontSizeMap[personalization.fontSize],
    density: densityMap[personalization.density],
    contrast: personalization.highContrast ? "high" : "normal",
    cards: personalization.reinforcedCards ? "reinforced" : "standard",
    animations: personalization.animations ? "on" : "off",
    shortcuts: personalization.showShortcuts ? "on" : "off",
    preview: personalization.instantPreview ? "instant" : "manual",
  };
}

export function getGlobalSearchResults(query, index) {
  const normalizedQuery = String(query || "").trim().toLowerCase();
  if (!normalizedQuery) {
    return index.slice(0, 6);
  }

  return [...index]
    .map((item) => {
      const haystack = `${item.label} ${item.description} ${item.keywords}`.toLowerCase();
      let score = 0;

      if (item.label.toLowerCase().includes(normalizedQuery)) {
        score += 3;
      }

      if (item.description.toLowerCase().includes(normalizedQuery)) {
        score += 2;
      }

      if (haystack.includes(normalizedQuery)) {
        score += 1;
      }

      return { ...item, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 7);
}

export function getAiSearchHint(query, results) {
  const normalizedQuery = String(query || "").trim().toLowerCase();
  if (!normalizedQuery) {
    return "Digite um tema (ex.: pipeline, vendedor, alertas) para a IA sugerir o melhor atalho.";
  }

  if (!results.length) {
    return "Não achei um atalho direto. Tente termos como: pipeline, vendedores, relatórios ou integração.";
  }

  if (normalizedQuery.includes("risco") || normalizedQuery.includes("estagn")) {
    return "Sugestão IA: abra a NORA para diagnostico e depois valide no quadro de Negocios.";
  }

  if (normalizedQuery.includes("meta") || normalizedQuery.includes("kpi") || normalizedQuery.includes("receita")) {
    return "Sugestão IA: comece por Relatórios para visão macro, depois detalhe por Vendedores.";
  }

  if (normalizedQuery.includes("alert") || normalizedQuery.includes("notifica")) {
    return "Sugestão IA: abra Notificações para triagem rápida e priorize os itens não lidos.";
  }

  if (
    normalizedQuery.includes("tarefa")
    || normalizedQuery.includes("reuniao")
    || normalizedQuery.includes("chamada")
    || normalizedQuery.includes("ligacao")
    || normalizedQuery.includes("call")
  ) {
    return "Sugestao IA: abra Tarefas para filtrar por vendedor, tipo e status das atividades vindas da HubSpot.";
  }

  return `Sugestão IA: o melhor ponto de entrada agora é "${results[0].label}".`;
}

function normalizeNotificationText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function getNotificationDisplayTitle(item) {
  const tag = normalizeNotificationText(item?.tag);
  const title = normalizeNotificationText(item?.title);
  const body = normalizeNotificationText(item?.body);
  const type = normalizeNotificationText(item?.type);
  const content = `${tag} ${title} ${body} ${type}`;

  if (content.includes("solicitacao de acesso") || item?.requestId || type === "request-access") {
    return "Solicitação de acesso";
  }

  if (content.includes("primeiro acesso") || type === "first-access") {
    return "Primeiro acesso";
  }

  if (content.includes("reuniao")) {
    return "Próxima reunião";
  }

  if (content.includes("chamada") || content.includes("ligacao") || content.includes("call")) {
    return "Próxima chamada";
  }

  if (content.includes("tarefa")) {
    return "Tarefa pendente";
  }

  if (content.includes("proposta")) {
    return "Próxima proposta";
  }

  return item?.title || "Notificação";
}

export function getNotificationAction(item) {
  if (!item) {
    return { route: "", label: "" };
  }

  const content = `${normalizeNotificationText(item?.tag)} ${normalizeNotificationText(item?.title)} ${normalizeNotificationText(item?.body)} ${normalizeNotificationText(item?.type)}`;

  if (item.requestId || item.tag === "Solicitacao de acesso" || item.tag === "Primeiro acesso") {
    return {
      route: "/permissoes-e-acessos",
      label: "Abrir Permissões e Acessos",
    };
  }

  if (
    content.includes("reuniao")
    || content.includes("chamada")
    || content.includes("ligacao")
    || content.includes("call")
    || content.includes("tarefa")
  ) {
    return {
      route: "/tarefas",
      label: "Abrir Tarefas",
    };
  }

  return {
    route: "",
    label: "",
  };
}
