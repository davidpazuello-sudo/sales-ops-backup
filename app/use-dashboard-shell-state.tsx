"use client";

import { startTransition, useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  buildMainSectionRoute,
  getAiSearchHint,
  getAppliedPersonalization,
  getGlobalSearchResults,
  getNotificationAction,
  getNotificationDisplayTitle,
  getVisibleNotifications,
  personalizationDefaults,
  PROFILE_PHOTO_KEY,
  STORAGE_KEY,
} from "lib/dashboard-shell-helpers";
import { globalSearchIndex } from "./dashboard-shell-config";

const SESSION_USER_STORAGE_KEY = "salesops:session-user";
const SESSION_USER_CACHE_KEY = "salesops:session-user-cache";
const BROWSER_NOTIFICATION_IDS_KEY = "salesops:browser-notification-ids";
const NOTIFICATIONS_CACHE_KEY = "salesops:admin-notifications-cache";
const SESSION_USER_CACHE_TTL_MS = 5 * 60 * 1000;
const NOTIFICATIONS_CACHE_TTL_MS = 30 * 1000;

interface SessionUser {
  name: string;
  role: string;
  email: string;
  isSuperAdmin: boolean;
  twoFactorEnabled: boolean;
  twoFactorLevel: string | null;
}

interface MfaState {
  hasTotpFactor?: boolean;
  currentLevel?: string | null;
}

interface AdminNotification {
  id: string;
  title?: string;
  body?: string;
  tag?: string;
  type?: string;
  createdAt?: string;
  read?: boolean;
  trash?: boolean;
  requestId?: string;
  route?: string;
}

interface TimedCacheEntry<T> {
  cachedAt: number;
  payload: T;
}

const defaultSessionUser: SessionUser = {
  name: "Usuario",
  role: "Cargo",
  email: "",
  isSuperAdmin: false,
  twoFactorEnabled: false,
  twoFactorLevel: null,
};

function readStoredSessionUser(): SessionUser {
  if (typeof window === "undefined") return defaultSessionUser;
  try {
    const storedValue = window.sessionStorage.getItem(SESSION_USER_STORAGE_KEY);
    if (!storedValue) return defaultSessionUser;
    const parsedValue = JSON.parse(storedValue) as Partial<SessionUser>;
    return {
      ...defaultSessionUser,
      ...parsedValue,
      isSuperAdmin: Boolean(parsedValue?.isSuperAdmin),
      twoFactorEnabled: Boolean(parsedValue?.twoFactorEnabled),
      twoFactorLevel: parsedValue?.twoFactorLevel ?? null,
    };
  } catch {
    window.sessionStorage.removeItem(SESSION_USER_STORAGE_KEY);
    return defaultSessionUser;
  }
}

function readTimedSessionCache<T>(storageKey: string, ttlMs: number): T | null {
  if (typeof window === "undefined") return null;
  try {
    const storedValue = window.sessionStorage.getItem(storageKey);
    if (!storedValue) return null;
    const parsedValue = JSON.parse(storedValue) as TimedCacheEntry<T>;
    const cachedAt = Number(parsedValue?.cachedAt ?? 0);
    if (!cachedAt || Date.now() - cachedAt > ttlMs) {
      window.sessionStorage.removeItem(storageKey);
      return null;
    }
    return parsedValue?.payload ?? null;
  } catch {
    window.sessionStorage.removeItem(storageKey);
    return null;
  }
}

function writeTimedSessionCache<T>(storageKey: string, payload: T): void {
  if (typeof window === "undefined" || !payload) return;
  window.sessionStorage.setItem(storageKey, JSON.stringify({ cachedAt: Date.now(), payload }));
}

function scheduleDeferredBrowserTask(callback: () => void, timeoutMs = 250): () => void {
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

function getBrowserNotificationSupport(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

function readShownBrowserNotificationIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const storedValue = window.localStorage.getItem(BROWSER_NOTIFICATION_IDS_KEY);
    const parsedValue = JSON.parse(storedValue ?? "[]") as unknown;
    return Array.isArray(parsedValue) ? (parsedValue as string[]) : [];
  } catch {
    window.localStorage.removeItem(BROWSER_NOTIFICATION_IDS_KEY);
    return [];
  }
}

function writeShownBrowserNotificationIds(ids: string[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(BROWSER_NOTIFICATION_IDS_KEY, JSON.stringify(ids));
}

export function useDashboardShellState() {
  const router = useRouter();
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);
  const [personalization, setPersonalization] = useState(personalizationDefaults);
  const [profilePhoto, setProfilePhoto] = useState("");
  const [collapsed, setCollapsed] = useState(personalizationDefaults.collapseSidebarOnOpen);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutPromptOpen, setLogoutPromptOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationTab, setNotificationTab] = useState("unread");
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [sessionUser, setSessionUser] = useState<SessionUser>(readStoredSessionUser);
  const [adminNotifications, setAdminNotifications] = useState<AdminNotification[]>([]);
  const [browserNotificationPermission, setBrowserNotificationPermission] = useState(
    getBrowserNotificationSupport() ? window.Notification.permission : "unsupported",
  );

  // Prefetch routes after idle
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
      if (sessionUser?.isSuperAdmin) routesToPrefetch.push("/permissoes-e-acessos");
      routesToPrefetch.forEach((route) => router.prefetch(route));
    }, 1200);
    return cancelDeferredPrefetch;
  }, [router, sessionUser?.isSuperAdmin]);

  // Close menu on outside click / Escape
  useEffect(() => {
    function closeOnOutside(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
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

  // Persist session user to sessionStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!sessionUser?.email) {
      window.sessionStorage.removeItem(SESSION_USER_STORAGE_KEY);
      return;
    }
    window.sessionStorage.setItem(SESSION_USER_STORAGE_KEY, JSON.stringify(sessionUser));
  }, [sessionUser]);

  // Load personalization from localStorage
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const next = { ...personalizationDefaults, ...JSON.parse(stored) };
      setPersonalization(next);
      setCollapsed(Boolean(next.collapseSidebarOnOpen));
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Load profile photo from localStorage
  useEffect(() => {
    const storedPhoto = window.localStorage.getItem(PROFILE_PHOTO_KEY);
    if (storedPhoto) setProfilePhoto(storedPhoto);
  }, []);

  // Load session user from API
  useEffect(() => {
    let cancelled = false;
    const abortController = new AbortController();

    const cachedUser = readTimedSessionCache<SessionUser>(SESSION_USER_CACHE_KEY, SESSION_USER_CACHE_TTL_MS);
    if (cachedUser) {
      setSessionUser({
        name: cachedUser.name ?? "Usuario",
        role: cachedUser.role ?? "Cargo",
        email: cachedUser.email ?? "",
        isSuperAdmin: Boolean(cachedUser.isSuperAdmin),
        twoFactorEnabled: Boolean(cachedUser.twoFactorEnabled),
        twoFactorLevel: cachedUser.twoFactorLevel ?? null,
      });
    }

    async function loadSessionUser() {
      const response = await fetch("/api/auth/session", {
        cache: "no-store",
        signal: abortController.signal,
      }).catch((error: unknown) => (error instanceof Error && error.name === "AbortError" ? null : null));
      if (!response?.ok || cancelled) return;
      const payload = await response.json().catch(() => null) as { user?: Partial<SessionUser>; twoFactorEnabled?: boolean; twoFactorLevel?: string | null } | null;
      if (!payload?.user || cancelled) return;
      const nextSessionUser: SessionUser = {
        name: payload.user.name ?? "Usuario",
        role: payload.user.role ?? "Cargo",
        email: payload.user.email ?? "",
        isSuperAdmin: Boolean(payload.user.isSuperAdmin),
        twoFactorEnabled: Boolean(payload.twoFactorEnabled),
        twoFactorLevel: payload.twoFactorLevel ?? null,
      };
      setSessionUser(nextSessionUser);
      writeTimedSessionCache(SESSION_USER_CACHE_KEY, nextSessionUser);
    }

    const cancelDeferredSessionLoad = scheduleDeferredBrowserTask(
      () => { loadSessionUser(); },
      cachedUser ? 1200 : 200,
    );

    return () => {
      cancelled = true;
      abortController.abort();
      cancelDeferredSessionLoad();
    };
  }, []);

  const refreshNotifications = useCallback(async (currentUser = sessionUser, signal?: AbortSignal) => {
    if (!currentUser?.isSuperAdmin) {
      setAdminNotifications([]);
      return;
    }
    const response = await fetch("/api/notifications", {
      cache: "no-store",
      ...(signal ? { signal } : {}),
    }).catch((error: unknown) => (error instanceof Error && error.name === "AbortError" ? null : null));
    const payload = await response?.json().catch(() => null) as { notifications?: AdminNotification[] } | null;
    const nextNotifications = Array.isArray(payload?.notifications) ? payload.notifications : [];
    setAdminNotifications(nextNotifications);
    writeTimedSessionCache(NOTIFICATIONS_CACHE_KEY, nextNotifications);
  }, [sessionUser]);

  // Load notifications for super admins
  useEffect(() => {
    if (!sessionUser?.isSuperAdmin) {
      setAdminNotifications([]);
      return undefined;
    }
    const abortController = new AbortController();
    const cachedNotifications = readTimedSessionCache<AdminNotification[]>(NOTIFICATIONS_CACHE_KEY, NOTIFICATIONS_CACHE_TTL_MS);
    if (Array.isArray(cachedNotifications)) setAdminNotifications(cachedNotifications);
    const cancelDeferredLoad = scheduleDeferredBrowserTask(
      () => { refreshNotifications(sessionUser, abortController.signal); },
      cachedNotifications ? 1400 : 350,
    );
    return () => {
      abortController.abort();
      cancelDeferredLoad();
    };
  }, [refreshNotifications, sessionUser, sessionUser?.isSuperAdmin]);

  // Sync browser notification permission
  useEffect(() => {
    if (!getBrowserNotificationSupport()) {
      setBrowserNotificationPermission("unsupported");
      return;
    }
    setBrowserNotificationPermission(window.Notification.permission);
  }, []);

  // Apply personalization to DOM
  useEffect(() => {
    const root = document.documentElement;
    const systemDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
    const applied = getAppliedPersonalization(personalization, systemDark);
    root.dataset.theme = applied.theme;
    root.dataset.font = applied.font;
    root.style.setProperty("--app-font", applied.fontVariable);
    root.dataset.fontSize = applied.fontSize;
    root.dataset.density = applied.density;
    root.dataset.contrast = applied.contrast;
    root.dataset.cards = applied.cards;
    root.dataset.animations = applied.animations;
    root.dataset.shortcuts = applied.shortcuts;
    root.dataset.preview = applied.preview;
    root.style.colorScheme = applied.theme;
    root.style.backgroundColor = applied.theme === "dark" ? "#0f1726" : "#f6f7fa";
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(personalization));
  }, [personalization]);

  function updatePersonalization(key: string, value: unknown) {
    setPersonalization((current) => {
      const next = { ...current, [key]: value };
      if (key === "collapseSidebarOnOpen") setCollapsed(Boolean(value));
      return next;
    });
  }

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) return;
      setProfilePhoto(result);
      window.localStorage.setItem(PROFILE_PHOTO_KEY, result);
    };
    reader.readAsDataURL(file);
  }

  function navigateToMainSection(section: string) {
    const route = buildMainSectionRoute(section);
    if (pathname === route) return;
    startTransition(() => { router.push(route); });
  }

  function navigateToPath(path: string) {
    if (pathname === path) return;
    startTransition(() => { router.push(path); });
  }

  const handleTwoFactorStatusChange = useCallback((mfaState: MfaState) => {
    setSessionUser((current) => ({
      ...current,
      twoFactorEnabled: Boolean(mfaState?.hasTotpFactor),
      twoFactorLevel: mfaState?.currentLevel ?? null,
    }));
  }, []);

  const allNotifications = sessionUser.isSuperAdmin
    ? adminNotifications.map((item) => ({
      ...item,
      title: getNotificationDisplayTitle(item),
      age: new Date(item.createdAt ?? "").toLocaleDateString("pt-BR"),
      ...getNotificationAction(item),
    }))
    : [];
  const visibleNotifications = getVisibleNotifications(allNotifications, notificationTab);
  const unreadNotificationsCount = allNotifications.filter((item) => !item.read && !item.trash).length;
  const globalSearchResults = getGlobalSearchResults(globalSearchQuery, globalSearchIndex);
  const globalSearchHint = getAiSearchHint(globalSearchQuery, globalSearchResults);

  const openGlobalSearchResult = useCallback((item: { id: string; route?: string }) => {
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

  const openNotificationAction = useCallback((item: { route?: string }) => {
    if (!item?.route) return;
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

  // Fire browser push notifications for unread items
  useEffect(() => {
    const notificationsForBrowser = sessionUser.isSuperAdmin
      ? adminNotifications.map((item) => ({
        ...item,
        title: getNotificationDisplayTitle(item),
        age: new Date(item.createdAt ?? "").toLocaleDateString("pt-BR"),
        ...getNotificationAction(item),
      }))
      : [];

    if (!sessionUser.isSuperAdmin || browserNotificationPermission !== "granted" || !notificationsForBrowser.length) return;

    const shownIds = new Set(readShownBrowserNotificationIds());
    const shownCountBefore = shownIds.size;
    const nextShownIds = [...shownIds];

    notificationsForBrowser
      .filter((item) => !item.read && item.id && !shownIds.has(item.id))
      .forEach((item) => {
        try {
          const browserNotification = new window.Notification(item.title, {
            body: item.body ?? item.tag ?? "Abra o SalesOps para ver os detalhes.",
            tag: `salesops-${item.id}`,
            icon: "/favicon.ico",
            badge: "/favicon.ico",
          });
          browserNotification.onclick = () => {
            window.focus();
            if (item.route) router.push(item.route);
            browserNotification.close();
          };
          shownIds.add(item.id);
          nextShownIds.push(item.id);
        } catch {
          // Ignore browser notification failures.
        }
      });

    if (shownIds.size !== shownCountBefore) {
      writeShownBrowserNotificationIds([...new Set(nextShownIds)]);
    }
  }, [adminNotifications, browserNotificationPermission, router, sessionUser.isSuperAdmin]);

  return {
    menuRef,
    personalization,
    profilePhoto,
    collapsed,
    menuOpen,
    logoutPromptOpen,
    notificationsOpen,
    notificationTab,
    globalSearchOpen,
    globalSearchQuery,
    sessionUser,
    visibleNotifications,
    unreadNotificationsCount,
    browserNotificationPermission,
    browserNotificationSupported: browserNotificationPermission !== "unsupported",
    globalSearchResults,
    globalSearchHint,
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
