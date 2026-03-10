import { describe, expect, it } from "vitest";
import {
  buildLoginRedirectUrl,
  FIRST_ACCESS_MODE,
  isAlreadyRegisteredError,
  normalizeEmail,
} from "../lib/auth-flows";

describe("auth flows helpers", () => {
  it("normalizes emails before sending them to auth endpoints", () => {
    expect(normalizeEmail("  Usuario@Empresa.com  ")).toBe("usuario@empresa.com");
  });

  it("builds login redirects with the requested auth mode", () => {
    const request = { url: "https://salesops.app.br/login" };

    expect(buildLoginRedirectUrl(request)).toBe("https://salesops.app.br/login");
    expect(buildLoginRedirectUrl(request, FIRST_ACCESS_MODE)).toBe(
      "https://salesops.app.br/login?mode=first-access",
    );
  });

  it("detects already registered Supabase errors", () => {
    expect(isAlreadyRegisteredError({ message: "User already registered" })).toBe(true);
    expect(isAlreadyRegisteredError({ message: "Unexpected auth failure" })).toBe(false);
  });
});
