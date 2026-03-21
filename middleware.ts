// @ts-nocheck
import { updateSession } from "lib/supabase/middleware";

export async function middleware(request) {
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|map)$).*)"],
};
