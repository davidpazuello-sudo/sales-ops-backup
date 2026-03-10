"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { isDashboardData } from "lib/dashboard-contracts";
import {
  buildMainSectionRoute,
  getAppliedPersonalization,
  getCurrentSection,
  getVisibleNotifications,
  personalizationDefaults,
  PROFILE_PHOTO_KEY,
  STORAGE_KEY,
} from "lib/dashboard-shell-helpers";

export function useDashboardShellState({
  initialNav,
  initialConfig,
  initialProfileView,
  defaultDashboardData,
  notificationItems,
  accountSection,
  configSections,
}) {
  const router = useRouter();
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
  const menuRef = useRef(null);

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
          setDashboardData(defaultDashboardData);
          setHubspotMessage(payload.error || "Nao foi possivel consultar a HubSpot.");
          return;
        }

        if (!isDashboardData(payload)) {
          setDashboardData(defaultDashboardData);
          setHubspotMessage("Os dados retornados pela HubSpot vieram em formato inesperado.");
          return;
        }

        setDashboardData(payload);
        setHubspotMessage("Dados da HubSpot sincronizados.");
      } catch {
        if (cancelled) {
          return;
        }

        setDashboardData(defaultDashboardData);
        setHubspotMessage("Nao foi possivel consultar a HubSpot.");
      }
    }

    loadHubSpotData();

    return () => {
      cancelled = true;
    };
  }, [defaultDashboardData]);

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

  return {
    router,
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
    currentSection: getCurrentSection({ activeNav, activeConfig, accountSection, configSections }),
    visibleNotifications: getVisibleNotifications(notificationItems, notificationTab),
    setActiveConfig,
    setCollapsed,
    setMenuOpen,
    setLogoutPromptOpen,
    setNotificationsOpen,
    setNotificationTab,
    updatePersonalization,
    handlePhotoChange,
    navigateToMainSection,
  };
}
