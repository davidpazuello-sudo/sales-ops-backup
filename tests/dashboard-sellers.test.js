import { describe, expect, it } from "vitest";
import { getPendingSellerTasks, getSellerDeals } from "../lib/services/dashboard-sellers";

describe("dashboard sellers services", () => {
  it("matches seller deals by ownerId before display name", () => {
    const dashboardData = {
      deals: [
        {
          id: "deal-1",
          owner: "Thiago Benzecry",
          ownerId: "owner-1",
          ownerEmail: "thiago@sasi.com.br",
          staleLabel: "1d sem touch",
        },
      ],
      tasks: [],
    };

    const deals = getSellerDeals(dashboardData, {
      id: "owner-1",
      name: "Thiago Benzecry AM",
      email: "thiago@sasi.com.br",
    });

    expect(deals).toHaveLength(1);
    expect(deals[0].id).toBe("deal-1");
  });

  it("uses real pending activities before stale-deal fallback", () => {
    const dashboardData = {
      deals: [
        {
          id: "deal-1",
          owner: "Jeniffer Gonzales",
          ownerId: "owner-2",
          ownerEmail: "jeniffer@sasi.com.br",
          staleLabel: "7d sem touch",
        },
      ],
      tasks: [
        {
          id: "meeting-1",
          ownerName: "Jeniffer Gonzales",
          hubspotOwnerId: "owner-2",
          ownerEmail: "jeniffer@sasi.com.br",
          isCompleted: false,
        },
        {
          id: "meeting-2",
          ownerName: "Jeniffer Gonzales",
          hubspotOwnerId: "owner-2",
          ownerEmail: "jeniffer@sasi.com.br",
          isCompleted: true,
        },
      ],
    };

    expect(getPendingSellerTasks(dashboardData, { id: "owner-2", name: "Jeniffer Gonzales" })).toBe(1);
  });
});
