import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45000,
  outputDir: "runtime/browser-results",
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4180",
    browserName: "chromium",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "node server/index.mjs",
    url: "http://127.0.0.1:4180/api/health",
    reuseExistingServer: false,
    timeout: 30000,
    env: { PORT: "4180", DATABASE_MEMORY: "1", DATABASE_URL: "" },
  },
});
