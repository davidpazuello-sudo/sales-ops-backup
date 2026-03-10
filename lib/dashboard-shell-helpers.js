export const STORAGE_KEY = "salesops-personalization";
export const PROFILE_PHOTO_KEY = "salesops-profile-photo";

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

export function meetingToSlug(title) {
  return sellerToSlug(title);
}

export function getInternalMeetingsForSeller(seller) {
  if (!seller) {
    return [];
  }

  const sellerSlug = sellerToSlug(seller.name);

  return [
    {
      id: `${sellerSlug}-weekly-forecast`,
      title: "Weekly forecast comercial",
      date: "09 Mar 2026",
      time: "09:00",
      type: "Ritual semanal",
      owner: "Lider comercial",
      summary: "Revisao de forecast, riscos por conta e definicao de proximos passos no HubSpot.",
      audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      audioLabel: "Audio da reuniao semanal",
      notes: [
        "Alinhar prioridades da semana com foco em propostas abertas.",
        "Revisar contas sem atividade acima do SLA.",
        "Atualizar comprometimento de receita no HubSpot.",
      ],
    },
    {
      id: `${sellerSlug}-coaching-1-1`,
      title: "Coaching 1:1",
      date: "11 Mar 2026",
      time: "15:00",
      type: "Coaching",
      owner: "Supervisor",
      summary: "Checkpoint individual sobre conversao, postura comercial e execucao do pipeline.",
      audioUrl: "",
      audioLabel: "",
      notes: [
        "Revisar postura em discovery e qualificacao.",
        "Mapear objecoes recorrentes nas ultimas oportunidades.",
        "Definir um plano curto de melhoria para a semana.",
      ],
    },
    {
      id: `${sellerSlug}-retrospectiva-pipeline`,
      title: "Retrospectiva de pipeline",
      date: "14 Mar 2026",
      time: "17:30",
      type: "Operacao",
      owner: "Sales Ops",
      summary: "Analise de gargalos operacionais, tempos de etapa e consistencia de atualizacao na HubSpot.",
      audioUrl: "",
      audioLabel: "",
      notes: [
        "Verificar tempo medio por etapa.",
        "Conferir campos obrigatorios pendentes.",
        "Padronizar proximo passo em todos os negocios ativos.",
      ],
    },
  ];
}

export function buildMainSectionRoute(section) {
  const routeMap = {
    reports: "/relatorios",
    sellers: "/vendedores",
    deals: "/negocios",
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
    if (notificationTab === "unread") return !item.read && !item.trash;
    if (notificationTab === "trash") return item.trash;
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
