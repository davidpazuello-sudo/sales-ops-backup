"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createDashboardFallbackData } from "lib/dashboard-fallback";
import {
  buildMainSectionRoute,
  getAiSearchHint,
  getAppliedPersonalization,
  getCurrentSection,
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

export function useDashboardShellState({
  initialNav,
  initialConfig,
  initialProfileView,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const lastPathnameRef = useRef(pathname);
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
  const [sessionUser, setSessionUser] = useState(defaultSessionUser);
  const [adminNotifications, setAdminNotifications] = useState([]);

  useEffect(() => {
    if (!pathname || lastPathnameRef.current === pathname) {
      return;
    }

    lastPathnameRef.current = pathname;
    window.location.reload();
  }, [pathname]);

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

    async function loadHubSpotData() {
      try {
        const response = await fetch("/api/hubspot/dashboard", { cache: "no-store" });
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
        setHubspotMessage("Dados da HubSpot sincronizados.");
      } catch {
        if (cancelled) {
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

    loadHubSpotData();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadSessionUser() {
      const response = await fetch("/api/auth/session", { cache: "no-store" }).catch(() => null);
      if (!response?.ok || cancelled) {
        return;
      }

      const payload = await response.json().catch(() => null);
      if (!payload?.user || cancelled) {
        return;
      }

      setSessionUser({
        name: payload.user.name || "Usuario",
        role: payload.user.role || "Cargo",
        email: payload.user.email || "",
        isSuperAdmin: Boolean(payload.user.isSuperAdmin),
        twoFactorEnabled: Boolean(payload.twoFactorEnabled),
        twoFactorLevel: payload.twoFactorLevel || null,
      });
    }

    loadSessionUser();

    return () => {
      cancelled = true;
    };
  }, []);

  const refreshNotifications = useCallback(async (currentUser = sessionUser) => {
    if (!currentUser?.isSuperAdmin) {
      setAdminNotifications([]);
      return;
    }

    const response = await fetch("/api/notifications", { cache: "no-store" }).catch(() => null);
    const payload = await response?.json().catch(() => null);
    setAdminNotifications(Array.isArray(payload?.notifications) ? payload.notifications : []);
  }, [sessionUser]);

  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

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
    router.push(buildMainSectionRoute(section));
  }

  function navigateToPath(path) {
    router.push(path);
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
    handleTwoFactorStatusChange,
    openGlobalSearchResult,
    handleLogout,
    openNotificationAction,
  };
}
