import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const HUBSPOT_WEBHOOK_MAX_AGE_MS = 5 * 60 * 1000;
const HUBSPOT_URI_DECODE_MAP = {
  "%3A": ":",
  "%2F": "/",
  "%3F": "?",
  "%40": "@",
  "%21": "!",
  "%24": "$",
  "%27": "'",
  "%28": "(",
  "%29": ")",
  "%2A": "*",
  "%2C": ",",
  "%3B": ";",
};
const HUBSPOT_URI_DECODE_PATTERN = /%3A|%2F|%3F|%40|%21|%24|%27|%28|%29|%2A|%2C|%3B/gi;

function normalizeText(value) {
  return String(value || "").trim();
}

function decodeHubSpotUri(value) {
  return String(value || "").replace(HUBSPOT_URI_DECODE_PATTERN, (match) => HUBSPOT_URI_DECODE_MAP[match.toUpperCase()] || match);
}

function getHubSpotRequestUri(url) {
  try {
    const parsed = new URL(url);
    return decodeHubSpotUri(`${parsed.origin}${parsed.pathname}${parsed.search}`);
  } catch {
    return decodeHubSpotUri(String(url || ""));
  }
}

function buildComparableBuffer(value) {
  return Buffer.from(String(value || ""), "utf8");
}

export function buildHubSpotSignatureSource({ method = "POST", url = "", body = "", timestamp = "" } = {}) {
  return `${normalizeText(method).toUpperCase()}${getHubSpotRequestUri(url)}${String(body || "")}${normalizeText(timestamp)}`;
}

export function computeHubSpotSignature({ clientSecret = "", method = "POST", url = "", body = "", timestamp = "" } = {}) {
  return createHmac("sha256", String(clientSecret || ""))
    .update(buildHubSpotSignatureSource({ method, url, body, timestamp }))
    .digest("base64");
}

export function validateHubSpotWebhookSignature({
  clientSecret = "",
  method = "POST",
  url = "",
  body = "",
  signature = "",
  timestamp = "",
  nowMs = Date.now(),
} = {}) {
  const normalizedSecret = normalizeText(clientSecret);
  const normalizedSignature = normalizeText(signature);
  const normalizedTimestamp = normalizeText(timestamp);

  if (!normalizedSecret) {
    return { ok: false, reason: "secret_missing" };
  }

  if (!normalizedSignature) {
    return { ok: false, reason: "signature_missing" };
  }

  if (!normalizedTimestamp) {
    return { ok: false, reason: "timestamp_missing" };
  }

  const timestampMs = Number(normalizedTimestamp);

  if (!Number.isFinite(timestampMs)) {
    return { ok: false, reason: "timestamp_invalid" };
  }

  if (Math.abs(nowMs - timestampMs) > HUBSPOT_WEBHOOK_MAX_AGE_MS) {
    return { ok: false, reason: "timestamp_expired" };
  }

  const expectedSignature = computeHubSpotSignature({
    clientSecret: normalizedSecret,
    method,
    url,
    body,
    timestamp: normalizedTimestamp,
  });

  const providedBuffer = buildComparableBuffer(normalizedSignature);
  const expectedBuffer = buildComparableBuffer(expectedSignature);

  if (providedBuffer.length !== expectedBuffer.length) {
    return { ok: false, reason: "signature_mismatch" };
  }

  if (!timingSafeEqual(providedBuffer, expectedBuffer)) {
    return { ok: false, reason: "signature_mismatch" };
  }

  return { ok: true };
}

export function parseHubSpotWebhookEvents(rawBody = "") {
  const text = String(rawBody || "").trim();

  if (!text) {
    return [];
  }

  const parsed = JSON.parse(text);

  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (parsed && typeof parsed === "object") {
    return [parsed];
  }

  return [];
}

export function getHubSpotWebhookEventKey(event = {}, index = 0) {
  const eventId = normalizeText(event.eventId || event.id);

  if (eventId) {
    return `event:${eventId}`;
  }

  const composite = [
    normalizeText(event.subscriptionId),
    normalizeText(event.portalId),
    normalizeText(event.appId),
    normalizeText(event.subscriptionType || event.eventType),
    normalizeText(event.objectId),
    normalizeText(event.objectType),
    normalizeText(event.propertyName),
    normalizeText(event.changeSource),
    normalizeText(event.attemptNumber),
    normalizeText(event.occurredAt),
    index,
  ].join(":");

  if (composite.replace(/:/g, "")) {
    return `composite:${composite}`;
  }

  return `hash:${createHash("sha256").update(JSON.stringify(event)).digest("hex")}`;
}
