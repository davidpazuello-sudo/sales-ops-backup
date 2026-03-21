import fs from 'fs';
import path from 'path';

const sourceFile = path.join(process.cwd(), 'lib', 'hubspot.js');
const sourceContent = fs.readFileSync(sourceFile, 'utf8');

const hubspotDir = path.join(process.cwd(), 'lib', 'hubspot');
if (!fs.existsSync(hubspotDir)) {
  fs.mkdirSync(hubspotDir);
}

// 1. Create client.js
const clientContent = `import { writeSystemEvent } from "../audit-log-store";
import { logSecurityEvent } from "../auth-logging";
import { getAppEnvironment, getHubSpotToken, getHubSpotTokenSource } from "../hubspot-runtime";

export const HUBSPOT_BASE_URL = "https://api.hubapi.com";
const HUBSPOT_MAX_ATTEMPTS = 3;
const HUBSPOT_BASE_BACKOFF_MS = 400;
const HUBSPOT_MAX_CONCURRENT_REQUESTS = 4;

let activeHubSpotRequests = 0;
const hubSpotRequestQueue = [];

export function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function sanitizeHubSpotPath(path) {
  return String(path || "").split("?")[0];
}

export function shouldRetryHubSpotRequest(status) {
  return status === 429 || status >= 500;
}

export function parseRetryAfterMs(response) {
  const retryAfter = response.headers.get("retry-after");
  const retryAfterSeconds = Number(retryAfter || 0);
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return retryAfterSeconds * 1000;
  }
  return 0;
}

export function computeHubSpotBackoffMs(attempt, response) {
  const retryAfterMs = parseRetryAfterMs(response);
  if (retryAfterMs > 0) { return retryAfterMs; }
  const exponential = HUBSPOT_BASE_BACKOFF_MS * (2 ** Math.max(0, attempt - 1));
  const jitter = Math.floor(Math.random() * 120);
  return exponential + jitter;
}

export async function acquireHubSpotRequestSlot() {
  if (activeHubSpotRequests < HUBSPOT_MAX_CONCURRENT_REQUESTS) {
    activeHubSpotRequests += 1;
    return;
  }
  await new Promise((resolve) => { hubSpotRequestQueue.push(resolve); });
  activeHubSpotRequests += 1;
}

export function releaseHubSpotRequestSlot() {
  activeHubSpotRequests = Math.max(0, activeHubSpotRequests - 1);
  const next = hubSpotRequestQueue.shift();
  if (next) { next(); }
}

export function logHubSpotObservation(level, event, meta = {}) {
  return logSecurityEvent(level, \`hubspot.\${event}\`, {
    integration: "hubspot",
    environment: getAppEnvironment(),
    tokenSource: getHubSpotTokenSource(),
    ...meta,
  });
}

export async function hubspotFetch(path, init = {}) {
  const token = getHubSpotToken();
  const operation = String(init.operation || "request");
  const sanitizedPath = sanitizeHubSpotPath(path);

  if (!token) {
    logHubSpotObservation("error", "token_missing", { operation, path: sanitizedPath });
    throw new Error("HUBSPOT_TOKEN_MISSING");
  }

  for (let attempt = 1; attempt <= HUBSPOT_MAX_ATTEMPTS; attempt += 1) {
    const startedAt = Date.now();
    await acquireHubSpotRequestSlot();

    let response;
    try {
      response = await fetch(\`\${HUBSPOT_BASE_URL}\${path}\`, {
        ...init,
        headers: {
          Authorization: \`Bearer \${token}\`,
          "Content-Type": "application/json",
          ...(init.headers || {}),
        },
        cache: "no-store",
      });
    } finally {
      releaseHubSpotRequestSlot();
    }

    const durationMs = Math.max(0, Date.now() - startedAt);

    if (response.ok) {
      logHubSpotObservation("info", "request_completed", { operation, path: sanitizedPath, status: response.status, durationMs, attempt });
      return response.json();
    }

    const body = await response.text();
    const meta = { operation, path: sanitizedPath, status: response.status, durationMs, attempt, errorBody: body };

    if (shouldRetryHubSpotRequest(response.status) && attempt < HUBSPOT_MAX_ATTEMPTS) {
      const retryAfterMs = computeHubSpotBackoffMs(attempt, response);
      logHubSpotObservation("warn", "request_retry_scheduled", { ...meta, retryAfterMs });
      if (response.status === 429) {
        void writeSystemEvent({
          event: "hubspot.rate_limited",
          level: "warn",
          route: "lib/hubspot",
          message: \`HubSpot rate limit em \${operation}. Retry em \${retryAfterMs}ms.\`,
          meta: { ...meta, retryAfterMs },
        }).catch(() => null);
      }
      await wait(retryAfterMs);
      continue;
    }

    logHubSpotObservation(response.status >= 500 ? "error" : "warn", "request_failed", meta);
    void writeSystemEvent({
      event: "hubspot.request_failed",
      level: response.status >= 500 ? "error" : "warn",
      route: "lib/hubspot",
      message: \`HubSpot falhou em \${operation} (\${response.status}).\`,
      meta,
    }).catch(() => null);

    throw new Error(\`HUBSPOT_API_ERROR:\${response.status}:\${body}\`);
  }
  throw new Error("HUBSPOT_API_ERROR:UNKNOWN");
}

export async function fetchPagedCollection(path, options = {}) {
  const results = [];
  let after = "";
  let pageCount = 0;
  const maxPages = Number.isFinite(options.maxPages) ? Number(options.maxPages) : 10;
  const maxRecords = Number.isFinite(options.maxRecords) ? Number(options.maxRecords) : 200;

  while (true) {
    const separator = path.includes("?") ? "&" : "?";
    const url = after ? \`\${path}\${separator}after=\${after}\` : path;
    const data = await hubspotFetch(url, { operation: options.operation || "fetch_paged_collection" });

    if (Array.isArray(data?.results)) {
      results.push(...data.results);
    }

    if (!data?.paging?.next?.after) {
      break;
    }

    after = data.paging.next.after;
    pageCount += 1;

    if (pageCount >= maxPages || results.length >= maxRecords) {
      break;
    }
  }

  return results.slice(0, maxRecords);
}
`;

fs.writeFileSync(path.join(hubspotDir, 'client.js'), clientContent);

// 2. We will import these from lib/hubspot/client.js back into lib/hubspot.js
let updatedSource = sourceContent;

// Remove the hardcoded networking block from lib/hubspot.js
const networkingBlockRegex = /const HUBSPOT_BASE_URL.*?async function fetchPagedCollection.*?return results\.slice.*?}/s;
updatedSource = updatedSource.replace(networkingBlockRegex, '');

// Since we moved logHubSpotObservation, it is exported from client.js
// Clean up old logHubSpotObservation block if the regex missed it
const logObsRegex = /function logHubSpotObservation.*?\n}/s;
updatedSource = updatedSource.replace(logObsRegex, '');

// Add imports at the top
updatedSource = 'import { hubspotFetch, fetchPagedCollection, wait } from "./hubspot/client";\n' + updatedSource;

// 3. Create cache.js
const cacheContent = `export const HUBSPOT_CACHE_TTL_MS = 60 * 1000;
export const HUBSPOT_CAMPAIGNS_CACHE_TTL_MS = 20 * 1000;
export const hubSpotDashboardCache = new Map();

export function getHubSpotCacheTtlMs(scope = "default") {
  return scope === "campaigns" ? HUBSPOT_CAMPAIGNS_CACHE_TTL_MS : HUBSPOT_CACHE_TTL_MS;
}
`;
fs.writeFileSync(path.join(hubspotDir, 'cache.js'), cacheContent);

const cacheVarsRegex = /const HUBSPOT_CACHE_TTL_MS = [^;]+;\nconst HUBSPOT_CAMPAIGNS_CACHE_TTL_MS = [^;]+;\n/s;
updatedSource = updatedSource.replace(cacheVarsRegex, '');
const mapRegex = /const hubSpotDashboardCache = new Map\(\);\n/s;
updatedSource = updatedSource.replace(mapRegex, '');
const getCacheTtlRegex = /function getHubSpotCacheTtlMs.*?\n}/s;
updatedSource = updatedSource.replace(getCacheTtlRegex, '');

// Don't extract readHubSpotDashboardCache perfectly yet since it relies on getHubSpotCacheKey which has domain coupling
updatedSource = 'import { hubSpotDashboardCache, getHubSpotCacheTtlMs } from "./hubspot/cache";\n' + updatedSource;

// Let's also check if there is an auth.js requirement:
// Actually lib/hubspot-runtime.js serves as auth.js, we don't need to rename it for now.

fs.writeFileSync(sourceFile, updatedSource);
console.log('Sprint 1 extraction done!');
