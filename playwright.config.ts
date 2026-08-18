import { defineConfig, devices } from "@playwright/test";
import { E2E_BASE_URL, E2E_PORT } from "./tests/e2e/baseUrl";

const skipWebServer = process.env.PLAYWRIGHT_SKIP_WEBSERVER === "1";

/**
 * `localhost`, not `127.0.0.1`.
 *
 * `middleware.ts` rejects a state-changing /api request whose Origin is not in
 * `allowedOrigins`, which includes `request.nextUrl.origin`. Next normalises
 * that to `http://localhost:<port>` even when the request arrives with
 * `Host: 127.0.0.1:<port>`, so a `127.0.0.1` Origin can never match and every
 * such test gets 403 instead of the behaviour it is asserting. Verified against
 * a production server: an Origin of `http://localhost:3121` returns the expected
 * 410, `http://127.0.0.1:3121` returns 403.
 *
 * The fix belongs here, in the test environment. The CSRF rule is correct and
 * is deliberately left untouched.
 */
const PORT = E2E_PORT;
const BASE_URL = E2E_BASE_URL;

/**
 * E2E runs against a production build (`next build` + `next start`), not `next dev`.
 *
 * The dev server compiles each route on first request, so a cold run made
 * route-walking tests race a 30s timeout and failed non-deterministically —
 * 19 failures at 5 workers, 11 at 2, 2 at 1, and passing on retry. A prebuilt
 * server serves every route immediately and restores parallelism.
 */
const useDevServer = process.env.PLAYWRIGHT_DEV_SERVER === "1";
const appCommand = useDevServer
  ? `npm run dev -- --port ${PORT}`
  : `npx next build && npx next start --port ${PORT}`;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
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
            command: appCommand,
            url: BASE_URL,
            reuseExistingServer: !process.env.CI,
            // Building before serving takes materially longer than booting dev.
            timeout: useDevServer ? 120_000 : 300_000,
            env: {
              ...process.env,
              BACKEND_URL: "http://127.0.0.1:3999",
              MOCK_BACKEND: "1",
              // isCoachSpikeEnabled() defaults to off under NODE_ENV=production.
              // The spike specs exist to test that surface, so the test server
              // opts in explicitly. The production default is left untouched.
              COACH_SPIKE_ENABLED: "1",
            },
          },
        ],
      }),
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
