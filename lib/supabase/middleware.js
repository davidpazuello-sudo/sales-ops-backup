import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { logAuthRouteError, logAuthorizationFailure } from "lib/auth-logging";
import { readE2EUserFromCookies } from "lib/e2e-auth";
import { hasMinimumRole } from "lib/role-access";
import { getSupabasePublishableKey, getSupabaseUrl, hasSupabaseEnv, mapSupabaseUser } from "./shared";
import { readMfaState } from "./mfa";
import { resolveAuthorizedRole } from "lib/user-roles";

const PUBLIC_PATHS = ["/login", "/auth/callback"];
const PROTECTED_ROLE_PATHS = [
  { path: "/permissoes-e-acessos", minimumRole: "Admin" },
];

function isPublicPath(pathname) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function getProtectedPathRule(pathname) {
  return PROTECTED_ROLE_PATHS.find(({ path }) => pathname === path || pathname.startsWith(`${path}/`));
}

export async function updateSession(request) {
  const { pathname, search } = request.nextUrl;
  const e2eUser = readE2EUserFromCookies(request.cookies);
  const protectedPathRule = getProtectedPathRule(pathname);

  if (pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  if (e2eUser) {
    if (isPublicPath(pathname)) {
      return NextResponse.redirect(new URL("/relatorios", request.url));
    }

    if (protectedPathRule && !hasMinimumRole(e2eUser, protectedPathRule.minimumRole)) {
      logAuthorizationFailure("middleware", {
        ok: false,
        status: 403,
        error: `Acesso restrito a ${protectedPathRule.minimumRole} ou superior.`,
        user: e2eUser,
      }, {
        action: "page-navigation",
        path: pathname,
        minimumRole: protectedPathRule.minimumRole,
      });
      return NextResponse.redirect(new URL("/relatorios", request.url));
    }

    return NextResponse.next({ request });
  }

  if (!hasSupabaseEnv()) {
    if (isPublicPath(pathname)) {
      return NextResponse.next({ request });
    }

    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Supabase nao configurado neste ambiente." },
        { status: 503 },
      );
    }

    const redirectUrl = new URL("/login", request.url);
    if (pathname !== "/") {
      redirectUrl.searchParams.set("redirect", `${pathname}${search}`);
    }
    redirectUrl.searchParams.set("config", "supabase");
    return NextResponse.redirect(redirectUrl);
  }

  let response = NextResponse.next({
    request,
  });

  try {
    const supabase = createServerClient(
      getSupabaseUrl(),
      getSupabasePublishableKey(),
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const role = user ? await resolveAuthorizedRole(supabase, user) : "";
    const mappedUser = user ? mapSupabaseUser(user, role) : null;
    const hasAuthorizedAccess = Boolean(role);

    if (isPublicPath(pathname)) {
      if (user && hasAuthorizedAccess) {
        return NextResponse.redirect(new URL("/relatorios", request.url));
      }
      return response;
    }

    if (!user) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
      }

      const redirectUrl = new URL("/login", request.url);
      if (pathname !== "/") {
        redirectUrl.searchParams.set("redirect", `${pathname}${search}`);
      }
      return NextResponse.redirect(redirectUrl);
    }

    if (!hasAuthorizedAccess) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Acesso ao workspace ainda nao liberado." }, { status: 403 });
      }

      const redirectUrl = new URL("/login", request.url);
      if (pathname !== "/") {
        redirectUrl.searchParams.set("redirect", `${pathname}${search}`);
      }
      redirectUrl.searchParams.set("access", "request");
      return NextResponse.redirect(redirectUrl);
    }

    const mfa = await readMfaState(supabase);
    if (mfa.requiresTwoFactor) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Segundo fator pendente.", requiresTwoFactor: true }, { status: 401 });
      }

      const redirectUrl = new URL("/login", request.url);
      redirectUrl.searchParams.set("mfa", "required");
      if (pathname !== "/") {
        redirectUrl.searchParams.set("redirect", `${pathname}${search}`);
      }
      return NextResponse.redirect(redirectUrl);
    }

    if (protectedPathRule && !hasMinimumRole(mappedUser, protectedPathRule.minimumRole)) {
      logAuthorizationFailure("middleware", {
        ok: false,
        status: 403,
        error: `Acesso restrito a ${protectedPathRule.minimumRole} ou superior.`,
        user: mappedUser,
      }, {
        action: "page-navigation",
        path: pathname,
        minimumRole: protectedPathRule.minimumRole,
      });
      return NextResponse.redirect(new URL("/relatorios", request.url));
    }

    return response;
  } catch (error) {
    logAuthRouteError("middleware", "update-session", error, { path: pathname });
    if (isPublicPath(pathname)) {
      return NextResponse.next({ request });
    }

    const redirectUrl = new URL("/login", request.url);
    if (pathname !== "/") {
      redirectUrl.searchParams.set("redirect", `${pathname}${search}`);
    }
    redirectUrl.searchParams.set("authError", "middleware");
    return NextResponse.redirect(redirectUrl);
  }
}
