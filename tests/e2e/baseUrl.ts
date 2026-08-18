/**
 * Single source of truth for the E2E origin, shared by playwright.config.ts and
 * any spec that needs the origin as a literal — cookie `url`, an explicit
 * `Origin` header, absolute-URL assertions.
 *
 * It must stay `localhost` rather than `127.0.0.1`: the CSRF check in
 * middleware.ts compares the request Origin against `request.nextUrl.origin`,
 * which Next normalises to `http://localhost:<port>`. They are also distinct
 * cookie hosts, so a cookie seeded for one is never sent to the other.
 */
export const E2E_PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3000);
export const E2E_BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${E2E_PORT}`;
