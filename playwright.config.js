const { defineConfig, devices } = require("@playwright/test");

const PORT = 3005;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const nextBin = "./node_modules/next/dist/bin/next";

module.exports = defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  webServer: {
    command: `"${process.execPath}" ${nextBin} dev --hostname 127.0.0.1 --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    env: {
      E2E_AUTH_BYPASS: "true",
    },
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
});
