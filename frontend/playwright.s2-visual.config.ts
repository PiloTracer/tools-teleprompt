import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4173";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /s2-home-editor-(visual|a11y)\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  reporter: "list",
  outputDir: "../tmp/playwright-results",
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    trace: "off",
    bypassCSP: true,
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run build && npm run preview -- --host 127.0.0.1 --port 4173",
        url: "http://127.0.0.1:4173",
        reuseExistingServer: true,
        timeout: 180_000,
      },
});
