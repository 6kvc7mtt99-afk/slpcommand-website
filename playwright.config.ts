import { defineConfig, devices } from "@playwright/test";

const skipWebServer = process.env.PLAYWRIGHT_SKIP_WEBSERVER === "1";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  ...(skipWebServer
    ? {}
    : {
        webServer: [
          {
            command: "node tests/e2e/mock-backend.mjs",
            url: "http://127.0.0.1:3999/api/health",
            reuseExistingServer: !process.env.CI,
            timeout: 30_000,
          },
          {
            command: "npm run dev",
            url: "http://127.0.0.1:3000",
            reuseExistingServer: !process.env.CI,
            timeout: 120_000,
            env: {
              ...process.env,
              BACKEND_URL: "http://127.0.0.1:3999",
              MOCK_BACKEND: "1",
            },
          },
        ],
      }),
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
