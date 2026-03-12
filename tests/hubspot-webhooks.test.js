import { describe, expect, it } from "vitest";
import {
  buildHubSpotSignatureSource,
  computeHubSpotSignature,
  getHubSpotWebhookEventKey,
  parseHubSpotWebhookEvents,
  validateHubSpotWebhookSignature,
} from "../lib/hubspot-webhooks";

describe("hubspot webhook helpers", () => {
  it("builds the v3 signature source using method, uri, body and timestamp", () => {
    const source = buildHubSpotSignatureSource({
      method: "POST",
      url: "https://opssales.com.br/api/hubspot/webhooks?test=1",
      body: "[{\"eventId\":1}]",
      timestamp: "1710000000000",
    });

    expect(source).toBe("POSThttps://opssales.com.br/api/hubspot/webhooks?test=1[{\"eventId\":1}]1710000000000");
  });

  it("accepts a valid v3 signature inside the allowed time window", () => {
    const timestamp = String(Date.now());
    const signature = computeHubSpotSignature({
      clientSecret: "client-secret",
      method: "POST",
      url: "https://opssales.com.br/api/hubspot/webhooks",
      body: "[{\"eventId\":1}]",
      timestamp,
    });

    const result = validateHubSpotWebhookSignature({
      clientSecret: "client-secret",
      method: "POST",
      url: "https://opssales.com.br/api/hubspot/webhooks",
      body: "[{\"eventId\":1}]",
      signature,
      timestamp,
    });

    expect(result).toEqual({ ok: true });
  });

  it("rejects expired signatures", () => {
    const timestamp = String(Date.now() - (6 * 60 * 1000));
    const signature = computeHubSpotSignature({
      clientSecret: "client-secret",
      method: "POST",
      url: "https://opssales.com.br/api/hubspot/webhooks",
      body: "[]",
      timestamp,
    });

    const result = validateHubSpotWebhookSignature({
      clientSecret: "client-secret",
      method: "POST",
      url: "https://opssales.com.br/api/hubspot/webhooks",
      body: "[]",
      signature,
      timestamp,
      nowMs: Date.now(),
    });

    expect(result).toEqual({
      ok: false,
      reason: "timestamp_expired",
    });
  });

  it("parses payloads and generates stable webhook event keys", () => {
    const [event] = parseHubSpotWebhookEvents("[{\"eventId\":42,\"subscriptionType\":\"deal.propertyChange\"}]");

    expect(event).toMatchObject({
      eventId: 42,
      subscriptionType: "deal.propertyChange",
    });
    expect(getHubSpotWebhookEventKey(event, 0)).toBe("event:42");
  });
});
