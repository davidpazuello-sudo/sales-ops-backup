// @ts-nocheck
"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublishableKey, getSupabaseUrl } from "./shared";

let browserClient;
let browserClientCacheKey;

export function createClient(config) {
  const url = config?.url || getSupabaseUrl();
  const publishableKey = config?.publishableKey || getSupabasePublishableKey();
  const cacheKey = `${url}::${publishableKey}`;

  if (!browserClient || browserClientCacheKey !== cacheKey) {
    browserClient = createBrowserClient(url, publishableKey);
    browserClientCacheKey = cacheKey;
  }

  return browserClient;
}
