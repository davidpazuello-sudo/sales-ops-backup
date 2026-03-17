"use client";

import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createDashboardFallbackData } from "lib/dashboard-fallback";
import {
  buildMainSectionRoute,
  getAiSearchHint,
  getAppliedPersonalization,
  getCurrentSection,
  getNotificationDisplayTitle,
  getGlobalSearchResults,
  getNotificationAction,
  getVisibleNotifications,
  personalizationDefaults,
  PROFILE_PHOTO_KEY,
  STORAGE_KEY,
} from "lib/dashboard-shell-helpers";
import {
  accountSection,
  configSections,
  globalSearchIndex,
} from "./dashboard-shell-config";

const SESSION_USER_STORAGE_KEY = "salesops:session-user";
const SESSION_USER_CACHE_KEY = "salesops:session-user-cache";
const BROWSER_NOTIFICATION_IDS_KEY = "salesops:browser-notification-ids";
const NOTIFICATIONS_CACHE_KEY = "salesops:admin-notifications-cache";
const DASHBOARD_SCOPE_CACHE_PREFIX = "salesops:dashboard-scope:";
const DASHBOARD_SCOPE_CACHE_TTL_MS = 60 * 1000;
const SESSION_USER_CACHE_TTL_MS = 5 * 60 * 1000;
const NOTIFICATIONS_CACHE_TTL_MS = 30 * 1000;

const defaultDashboardData = createDashboardFallbackData({
  loading: "loading",
  status: "Carregando HubSpot",
});

const defaultSessionUser = {
  name: "Usuario",
  role: "Cargo",
  email: "",
  isSuperAdmin: false,
  twoFactorEnabled: false,
  twoFactorLevel: null,
};

function readStoredSessionUser() {
  if (typeof window === "undefined") {
    return defaultSessionUser;
  }

  try {
    const storedValue = window.sessionStorage.getItem(SESSION_USER_STORAGE_KEY);
    if (!storedValue) {
      return defaultSessionUser;
    }

    const parsedValue = JSON.parse(storedValue);
    return {
      ...defaultSessionUser,
      ...parsedValue,
      isSuperAdmin: Boolean(parsedValue?.isSuperAdmin),
      twoFactorEnabled: Boolean(parsedValue?.twoFactorEnabled),
      twoFactorLevel: parsedValue?.twoFactorLevel || null,
    };
  } catch {
    window.sessionStorage.removeItem(SESSION_USER_STORAGE_KEY);
    return defaultSessionUser;
  }
}

function readTimedSessionCache(storageKey, ttlMs) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const storedValue = window.sessionStorage.getItem(storageKey);
    if (!storedValue) {
      return null;
    }

    const parsedValue = JSON.parse(storedValue);
    const cachedAt = Number(parsedValue?.cachedAt || 0);
    if (!cachedAt || (Date.now() - cachedAt) > ttlMs) {
      window.sessionStorage.removeItem(storageKey);
      return null;
    }

    return parsedValue?.payload || null;
  } catch {
    window.sessionStorage.removeItem(storageKey);
    return null;
  }
}

function writeTimedSessionCache(storageKey, payload) {
  if (typeof window === "undefined" || !payload) {
    return;
  }

  window.sessionStorage.setItem(storageKey, JSON.stringify({
    cachedAt: Date.now(),
    payload,
  }));
}

function scheduleDeferredBrowserTask(callback, timeoutMs = 250) {
  if (typeof window === "undefined") {
    callback();
    return () => {};
  }

  if (typeof window.requestIdleCallback === "function") {
    const idleId = window.requestIdleCallback(callback, { timeout: timeoutMs });
    return () => window.cancelIdleCallback?.(idleId);
  }

  const timeoutId = window.setTimeout(callback, timeoutMs);
  return () => window.clearTimeout(timeoutId);
}

function getBrowserNotificationSupport() {
  return typeof window !== "undefined" && "Notification" in window;
}

function readShownBrowserNotificationIds() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const storedValue = window.localStorage.getItem(BROWSER_NOTIFICATION_IDS_KEY);
    const parsedValue = JSON.parse(storedValue || "[]");
    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch {
    window.localStorage.removeItem(BROWSER_NOTIFICATION_IDS_KEY);
    return [];
  }
}

function writeShownBrowserNotificationIds(ids) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(BROWSER_NOTIFICATION_IDS_KEY, JSON.stringify(ids));
}

function buildDashboardScopeCacheKey(scope, options = {}) {
  if (!scope || scope === "none") {
    return "";
  }

  const pipelineId = String(options.pipelineId || "").trim();
  const ownerFilter = String(options.ownerFilter || "").trim();
  const activityWeeksFilter = String(options.activityWeeksFilter || "").trim();
  const campaignName = String(options.campaignName || "").trim();
  const sellerPage = String(options.sellerPage || "").trim();
  const sellerSearch = String(options.sellerSearch || "").trim();
  const suffixParts = [pipelineId, ownerFilter, activityWeeksFilter, campaignName, sellerPage, sellerSearch].filter(Boolean);
  return suffixParts.length ? `${scope}:${suffixParts.join(":")}` : scope;
}

function readDashboardScopeCache(scope, options = {}) {
  const cacheKey = buildDashboardScopeCacheKey(scope, options);
  if (typeof window === "undefined" || !cacheKey) {
    return null;
  }

  try {
    const storedValue = window.sessionStorage.getItem(`${DASHBOARD_SCOPE_CACHE_PREFIX}${cacheKey}`);
    if (!storedValue) {
      return null;
    }

    const parsedValue = JSON.parse(storedValue);
    const cachedAt = Number(parsedValue?.cachedAt || 0);
    if (!cachedAt || (Date.now() - cachedAt) > DASHBOARD_SCOPE_CACHE_TTL_MS) {
      window.sessionStorage.removeItem(`${DASHBOARD_SCOPE_CACHE_PREFIX}${cacheKey}`);
      return null;
    }

    return parsedValue?.payload || null;
  } catch {
    window.sessionStorage.removeItem(`${DASHBOARD_SCOPE_CACHE_PREFIX}${cacheKey}`);
    return null;
  }
}

function writeDashboardScopeCache(scope, payload, options = {}) {
  const cacheKey = buildDashboardScopeCacheKey(scope, options);
  if (typeof window === "undefined" || !cacheKey || !payload) {
    return;
  }

  window.sessionStorage.setItem(
    `${DASHBOARD_SCOPE_CACHE_PREFIX}${cacheKey}`,
    JSON.stringify({
      cachedAt: Date.now(),
      payload,
    }),
  );
}

function getDashboardHubSpotScope({ initialNav, initialProfileView }) {
  if (initialProfileView || initialNav === "profile" || initialNav === "settings") {
    return "settings";
  }

  if (initialNav === "access") {
    return "none";
  }

  const supportedScopes = new Set(["reports", "sellers", "presales", "deals", "campaigns", "tasks"]);
  return supportedScopes.has(initialNav) ? initialNav : "default";
}

export function useDashboardShellState({
  initialNav,
  initialConfig,
  initialProfileView,
  initialPipelineId = "",
  initialOwnerFilter = "todos",
  initialActivityWeeksFilter = "1",
  initialCampaignName = "",
  initialSellerPage = "1",
  initialSellerSearch = "",
}) {
  const router = useRouter();
  const pathname = usePathname();
  const menuRef = useRef(null);
  const [personalization, setPersonalization] = useState(personalizationDefaults);
  const [dashboardData, setDashboardData] = useState(defaultDashboardData);
  const [hubspotMessage, setHubspotMessage] = useState("Carregando dados da HubSpot...");
  const [activeNav] = useState(initialNav);
  const [activeConfig, setActiveConfig] = useState(initialConfig);
  const [profileViewOpen] = useState(initialProfileView);
  const [profilePhoto, setProfilePhoto] = useState("");
  const [collapsed, setCollapsed] = useState(personalizationDefaults.collapseSidebarOnOpen);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutPromptOpen, setLogoutPromptOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationTab, setNotificationTab] = useState("unread");
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [sessionUser, setSessionUser] = useState(readStoredSessionUser);
  const [adminNotifications, setAdminNotifications] = useState([]);
  const [browserNotificationPermission, setBrowserNotificationPermission] = useState(
    getBrowserNotificationSupport() ? window.Notification.permission : "unsupported",
  );

  useEffect(() => {
    const cancelDeferredPrefetch = scheduleDeferredBrowserTask(() => {
      const routesToPrefetch = [
        "/relatorios",
        "/vendedores",
        "/negocios",
        "/campanhas",
        "/tarefas",
        "/configuracoes",
        "/perfil",
        "/ai-agent",
      ];

      if (sessionUser?.isSuperAdmin) {
        routesToPrefetch.push("/permissoes-e-acessos");
      }

      routesToPrefetch.forEach((route) => {
        router.prefetch(route);
      });
    }, 1200);

    return cancelDeferredPrefetch;
  }, [router, sessionUser?.isSuperAdmin]);

  useEffect(() => {
    function closeOnOutside(event) {
      if (!menuRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    }

    function closeOnEscape(event) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setLogoutPromptOpen(false);
        setNotificationsOpen(false);
        setGlobalSearchOpen(false);
      }
    }

    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!sessionUser?.email) {
      window.sessionStorage.removeItem(SESSION_USER_STORAGE_KEY);
      return;
    }

    window.sessionStorage.setItem(SESSION_USER_STORAGE_KEY, JSON.stringify(sessionUser));
  }, [sessionUser]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return;
      }

      const next = { ...personalizationDefaults, ...JSON.parse(stored) };
      setPersonalization(next);
      setCollapsed(Boolean(next.collapseSidebarOnOpen));
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    const storedPhoto = window.localStorage.getItem(PROFILE_PHOTO_KEY);
    if (storedPhoto) {
      setProfilePhoto(storedPhoto);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const abortController = new AbortController();
    const hubspotScope = getDashboardHubSpotScope({ initialNav, initialProfileView });
    const pipelineId = hubspotScope === "deals" ? String(initialPipelineId || "").trim() : "";
    const ownerFilter = hubspotScope === "deals" || hubspotScope === "campaigns" || hubspotScope === "presales"
      ? String(initialOwnerFilter || "todos").trim()
      : "";
    const activityWeeksFilter = hubspotScope === "deals" ? String(initialActivityWeeksFilter || "1").trim() : "";
    const campaignName = hubspotScope === "campaigns" || hubspotScope === "presales"
      ? String(initialCampaignName || "").trim()
      : "";
    const sellerPage = hubspotScope === "sellers" ? String(initialSellerPage || "1").trim() : "";
    const sellerSearch = hubspotScope === "sellers" ? String(initialSellerSearch || "").trim() : "";

    async function loadHubSpotData() {
      if (hubspotScope === "none") {
        setDashboardData(createDashboardFallbackData());
        setHubspotMessage("Sem consulta HubSpot nesta pagina.");
        return;
      }

        const cachedPayload = readDashboardScopeCache(hubspotScope, {
          pipelineId,
          ownerFilter,
          activityWeeksFilter,
          campaignName,
          sellerPage,
          sellerSearch,
        });
      if (cachedPayload) {
        setDashboardData(cachedPayload);
        setHubspotMessage("Dados recentes da HubSpot carregados.");
        return;
      }

      try {
        const searchParams = new URLSearchParams({ scope: hubspotScope });
        if (pipelineId) {
          searchParams.set("pipelineId", pipelineId);
        }
        if (ownerFilter) {
          searchParams.set("owner", ownerFilter);
        }
        if (activityWeeksFilter) {
          searchParams.set("activityWeeks", activityWeeksFilter);
        }
        if (campaignName) {
          searchParams.set("campaign", campaignName);
        }
        if (sellerPage) {
          searchParams.set("sellerPage", sellerPage);
        }
        if (sellerSearch) {
          searchParams.set("sellerSearch", sellerSearch);
        }

        const response = await fetch(`/api/hubspot/dashboard?${searchParams.toString()}`, {
          signal: abortController.signal,
          cache: "no-store",
        });
        const payload = await response.json();
        if (cancelled) {
          return;
        }

        if (!response.ok) {
          const errorMessage = payload.error || "Nao foi possivel consultar a HubSpot.";
          setDashboardData(
            createDashboardFallbackData({
              loading: response.status === 503 ? "config_required" : "error",
              status: response.status === 503 ? "Configuracao pendente" : "Falha na sincronizacao",
              error: errorMessage,
            }),
          );
          setHubspotMessage(errorMessage);
          return;
        }

        setDashboardData(payload);
        writeDashboardScopeCache(hubspotScope, payload, {
          pipelineId,
          ownerFilter,
          activityWeeksFilter,
          campaignName,
          sellerPage,
          sellerSearch,
        });
        setHubspotMessage("Dados da HubSpot sincronizados.");
      } catch (error) {
        if (cancelled || error?.name === "AbortError") {
          return;
        }

        const errorMessage = "Nao foi possivel consultar a HubSpot.";
        setDashboardData(
          createDashboardFallbackData({
            loading: "error",
            status: "Falha na sincronizacao",
            error: errorMessage,
          }),
        );
        setHubspotMessage(errorMessage);
      }
    }

    const cancelDeferredLoad = scheduleDeferredBrowserTask(() => {
      loadHubSpotData();
    }, 160);

    return () => {
      cancelled = true;
      abortController.abort();
      cancelDeferredLoad();
    };
  }, [initialActivityWeeksFilter, initialCampaignName, initialNav, initialOwnerFilter, initialPipelineId, initialProfileView, initialSellerPage, initialSellerSearch]);

  useEffect(() => {
    let cancelled = false;
    const abortController = new AbortController();

    const cachedUser = readTimedSessionCache(SESSION_USER_CACHE_KEY, SESSION_USER_CACHE_TTL_MS);
    if (cachedUser) {
      setSessionUser({
        name: cachedUser.name || "Usuario",
        role: cachedUser.role || "Cargo",
        email: cachedUser.email || "",
        isSuperAdmin: Boolean(cachedUser.isSuperAdmin),
        twoFactorEnabled: Boolean(cachedUser.twoFactorEnabled),
        twoFactorLevel: cachedUser.twoFactorLevel || null,
      });
    }

    async function loadSessionUser() {
      const response = await fetch("/api/auth/session", {
        cache: "no-store",
        signal: abortController.signal,
      }).catch((error) => (error?.name === "AbortError" ? null : null));
      if (!response?.ok || cancelled) {
        return;
      }

      const payload = await response.json().catch(() => null);
      if (!payload?.user || cancelled) {
        return;
      }

      const nextSessionUser = {
        name: payload.user.name || "Usuario",
        role: payload.user.role || "Cargo",
        email: payload.user.email || "",
        isSuperAdmin: Boolean(payload.user.isSuperAdmin),
        twoFactorEnabled: Boolean(payload.twoFactorEnabled),
        twoFactorLevel: payload.twoFactorLevel || null,
      };

      setSessionUser(nextSessionUser);
      writeTimedSessionCache(SESSION_USER_CACHE_KEY, nextSessionUser);
    }

    const cancelDeferredSessionLoad = scheduleDeferredBrowserTask(() => {
      loadSessionUser();
    }, cachedUser ? 1200 : 200);

    return () => {
      cancelled = true;
      abortController.abort();
      cancelDeferredSessionLoad();
    };
  }, []);

  const refreshNotifications = useCallback(async (currentUser = sessionUser, signal) => {
    if (!currentUser?.isSuperAdmin) {
      setAdminNotifications([]);
      return;
    }

    const response = await fetch("/api/notifications", {
      cache: "no-store",
      ...(signal ? { signal } : {}),
    }).catch((error) => (error?.name === "AbortError" ? null : null));
    const payload = await response?.json().catch(() => null);
    const nextNotifications = Array.isArray(payload?.notifications) ? payload.notifications : [];
    setAdminNotifications(nextNotifications);
    writeTimedSessionCache(NOTIFICATIONS_CACHE_KEY, nextNotifications);
  }, [sessionUser]);

  useEffect(() => {
    if (!sessionUser?.isSuperAdmin) {
      setAdminNotifications([]);
      return undefined;
    }

    const abortController = new AbortController();
    const cachedNotifications = readTimedSessionCache(NOTIFICATIONS_CACHE_KEY, NOTIFICATIONS_CACHE_TTL_MS);
    if (Array.isArray(cachedNotifications)) {
      setAdminNotifications(cachedNotifications);
    }

    const cancelDeferredNotificationsLoad = scheduleDeferredBrowserTask(() => {
      refreshNotifications(sessionUser, abortController.signal);
    }, cachedNotifications ? 1400 : 350);

    return () => {
      abortController.abort();
      cancelDeferredNotificationsLoad();
    };
  }, [refreshNotifications, sessionUser, sessionUser?.isSuperAdmin]);

  useEffect(() => {
    if (!getBrowserNotificationSupport()) {
      setBrowserNotificationPermission("unsupported");
      return;
    }

    setBrowserNotificationPermission(window.Notification.permission);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const systemDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
    const appliedPersonalization = getAppliedPersonalization(personalization, systemDark);

    root.dataset.theme = appliedPersonalization.theme;
    root.dataset.font = appliedPersonalization.font;
    root.style.setProperty("--app-font", appliedPersonalization.fontVariable);
    root.dataset.fontSize = appliedPersonalization.fontSize;
    root.dataset.density = appliedPersonalization.density;
    root.dataset.contrast = appliedPersonalization.contrast;
    root.dataset.cards = appliedPersonalization.cards;
    root.dataset.animations = appliedPersonalization.animations;
    root.dataset.shortcuts = appliedPersonalization.shortcuts;
    root.dataset.preview = appliedPersonalization.preview;
    root.style.colorScheme = appliedPersonalization.theme;
    root.style.backgroundColor = appliedPersonalization.theme === "dark" ? "#0f1726" : "#f6f7fa";

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(personalization));
  }, [personalization]);

  function updatePersonalization(key, value) {
    setPersonalization((current) => {
      const next = { ...current, [key]: value };
      if (key === "collapseSidebarOnOpen") {
        setCollapsed(Boolean(value));
      }
      return next;
    });
  }

  function handlePhotoChange(event) {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) {
        return;
      }

      setProfilePhoto(result);
      window.localStorage.setItem(PROFILE_PHOTO_KEY, result);
    };
    reader.readAsDataURL(file);
  }

  function navigateToMainSection(section) {
    const route = buildMainSectionRoute(section);
    if (pathname === route) {
      return;
    }

    startTransition(() => {
      router.push(route);
    });
  }

  function navigateToPath(path) {
    if (pathname === path) {
      return;
    }

    startTransition(() => {
      router.push(path);
    });
  }

  const handleTwoFactorStatusChange = useCallback((mfaState) => {
    setSessionUser((current) => ({
      ...current,
      twoFactorEnabled: Boolean(mfaState?.hasTotpFactor),
      twoFactorLevel: mfaState?.currentLevel || null,
    }));
  }, []);

  const allNotifications = sessionUser.isSuperAdmin
    ? adminNotifications.map((item) => ({
      ...item,
      title: getNotificationDisplayTitle(item),
      age: new Date(item.createdAt).toLocaleDateString("pt-BR"),
      ...getNotificationAction(item),
    }))
    : [];
  const visibleNotifications = getVisibleNotifications(allNotifications, notificationTab);
  const unreadNotificationsCount = allNotifications.filter((item) => !item.read && !item.trash).length;
  const globalSearchResults = getGlobalSearchResults(globalSearchQuery, globalSearchIndex);
  const globalSearchHint = getAiSearchHint(globalSearchQuery, globalSearchResults);

  const openGlobalSearchResult = useCallback((item) => {
    if (item.id === "notifications") {
      setNotificationsOpen(true);
    } else if (item.route) {
      router.push(item.route);
    }

    setGlobalSearchOpen(false);
    setGlobalSearchQuery("");
  }, [router]);

  const handleLogout = useCallback(async () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(SESSION_USER_STORAGE_KEY);
    }
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    router.replace("/login");
  }, [router]);

  const openNotificationAction = useCallback((item) => {
    if (!item?.route) {
      return;
    }

    setNotificationsOpen(false);
    router.push(item.route);
  }, [router]);

  const requestBrowserNotificationPermission = useCallback(async () => {
    if (!getBrowserNotificationSupport()) {
      setBrowserNotificationPermission("unsupported");
      return "unsupported";
    }

    const permission = await window.Notification.requestPermission();
    setBrowserNotificationPermission(permission);
    return permission;
  }, []);

  useEffect(() => {
    const notificationsForBrowser = sessionUser.isSuperAdmin
      ? adminNotifications.map((item) => ({
        ...item,
        title: getNotificationDisplayTitle(item),
        age: new Date(item.createdAt).toLocaleDateString("pt-BR"),
        ...getNotificationAction(item),
      }))
      : [];

    if (!sessionUser.isSuperAdmin || browserNotificationPermission !== "granted" || !notificationsForBrowser.length) {
      return;
    }

    const shownIds = new Set(readShownBrowserNotificationIds());
    const shownCountBefore = shownIds.size;
    const nextShownIds = [...shownIds];

    notificationsForBrowser
      .filter((item) => !item.read && item.id && !shownIds.has(item.id))
      .forEach((item) => {
        try {
          const browserNotification = new window.Notification(item.title, {
            body: item.body || item.tag || "Abra o SalesOps para ver os detalhes.",
            tag: `salesops-${item.id}`,
            icon: "/favicon.ico",
            badge: "/favicon.ico",
          });

          browserNotification.onclick = () => {
            window.focus();
            if (item.route) {
              router.push(item.route);
            }
            browserNotification.close();
          };

          shownIds.add(item.id);
          nextShownIds.push(item.id);
        } catch {
          // Ignore browser notification failures and keep the in-app center working.
        }
      });

    if (shownIds.size !== shownCountBefore) {
      writeShownBrowserNotificationIds([...new Set(nextShownIds)]);
    }
  }, [adminNotifications, browserNotificationPermission, router, sessionUser.isSuperAdmin]);

  return {
    menuRef,
    personalization,
    dashboardData,
    hubspotMessage,
    activeNav,
    activeConfig,
    profileViewOpen,
    profilePhoto,
    collapsed,
    menuOpen,
    logoutPromptOpen,
    notificationsOpen,
    notificationTab,
    globalSearchOpen,
    globalSearchQuery,
    sessionUser,
    currentSection: getCurrentSection({ activeNav, activeConfig, accountSection, configSections }),
    visibleNotifications,
    unreadNotificationsCount,
    browserNotificationPermission,
    browserNotificationSupported: browserNotificationPermission !== "unsupported",
    globalSearchResults,
    globalSearchHint,
    setActiveConfig,
    setCollapsed,
    setMenuOpen,
    setLogoutPromptOpen,
    setNotificationsOpen,
    setNotificationTab,
    setGlobalSearchOpen,
    setGlobalSearchQuery,
    updatePersonalization,
    handlePhotoChange,
    navigateToMainSection,
    navigateToPath,
    refreshNotifications,
    requestBrowserNotificationPermission,
    handleTwoFactorStatusChange,
    openGlobalSearchResult,
    handleLogout,
    openNotificationAction,
  };
}
