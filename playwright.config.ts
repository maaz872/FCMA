import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for FCMA E2E tests.
 *
 * Runs against a local Next.js dev server on http://localhost:3000.
 * Uses Chromium only in CI and local development.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false, // DB-mutating tests run serially
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
