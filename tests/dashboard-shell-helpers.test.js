import { describe, expect, it } from "vitest";
import {
  buildMainSectionRoute,
  getAppliedPersonalization,
  getCurrentSection,
  getVisibleNotifications,
  personalizationDefaults,
  sellerToSlug,
} from "../lib/dashboard-shell-helpers";

describe("dashboard shell helpers", () => {
  it("normalizes seller names into stable slugs", () => {
    expect(sellerToSlug("Ana Souza")).toBe("ana-souza");
    expect(sellerToSlug("José da Silva")).toBe("jose-da-silva");
  });

  it("filters notifications by selected tab", () => {
    const items = [
      { id: "1", read: false, trash: false },
      { id: "2", read: true, trash: false },
      { id: "3", read: true, trash: true },
    ];

    expect(getVisibleNotifications(items, "unread")).toHaveLength(1);
    expect(getVisibleNotifications(items, "all")).toHaveLength(2);
    expect(getVisibleNotifications(items, "trash")).toHaveLength(1);
  });

  it("returns the correct main route for each top-level section", () => {
    expect(buildMainSectionRoute("reports")).toBe("/relatorios");
    expect(buildMainSectionRoute("sellers")).toBe("/vendedores");
    expect(buildMainSectionRoute("deals")).toBe("/negocios");
    expect(buildMainSectionRoute("unknown")).toBe("/relatorios");
  });

  it("resolves the current section based on nav and config state", () => {
    const accountSection = { id: "account", label: "Conta" };
    const configSections = [{ id: "hubspot", label: "HubSpot" }];

    expect(getCurrentSection({
      activeNav: "profile",
      activeConfig: "hubspot",
      accountSection,
      configSections,
    })).toEqual(accountSection);

    expect(getCurrentSection({
      activeNav: "settings",
      activeConfig: "hubspot",
      accountSection,
      configSections,
    })).toEqual(configSections[0]);
  });

  it("maps personalization to root dataset values", () => {
    const applied = getAppliedPersonalization(personalizationDefaults, false);

    expect(applied.theme).toBe("light");
    expect(applied.font).toBe("manrope");
    expect(applied.fontSize).toBe("medium");
    expect(applied.density).toBe("comfortable");
  });
});
