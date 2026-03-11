import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { getSupabasePublishableKey, getSupabaseUrl, hasSupabaseEnv, mapSupabaseUser } from "./shared";
import { readMfaState } from "./mfa";
import { resolveAuthorizedRole } from "lib/user-roles";

const PUBLIC_PATHS = ["/login"];
const SUPER_ADMIN_PATHS = ["/permissoes-e-acessos"];

function isPublicPath(pathname) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export async function updateSession(request) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
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

    if (isPublicPath(pathname)) {
      if (user) {
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

    if (SUPER_ADMIN_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`)) && !mappedUser?.isSuperAdmin) {
      return NextResponse.redirect(new URL("/relatorios", request.url));
    }

    return response;
  } catch {
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
