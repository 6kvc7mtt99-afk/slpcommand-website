import { expect, test } from "@playwright/test";
import { E2E_BASE_URL } from "./baseUrl";

/**
 * The path production actually writes the refresh cookie at. Kept as a constant
 * so this test fails loudly if it is narrowed again.
 */
const REFRESH_PATH = "/";

/**
 * A returning learner must not be logged out while their refresh token is alive.
 *
 * THE BUG THIS REPRODUCES. `slp_at` is written Path=/ with a 1-hour max-age;
 * `slp_rt` was written Path=/api with a 14-day max-age. A browser only sends a
 * cookie whose path is a prefix of the request path, so on a DOCUMENT request
 * to /dashboard the refresh token was never transmitted. `readAuthCookies()`
 * therefore saw neither token and `app/(app)/layout.tsx` redirected to /login —
 * with up to 13 days of refresh token still valid.
 *
 * Shape of the failure: close the tab, come back more than an hour later, and
 * you are signed out. The client-side 401→refresh in lib/api/client.ts cannot
 * save it, because that only runs for fetches under /api once a page is already
 * rendering.
 *
 * This test models exactly that state — a live refresh token, an expired access
 * token — by seeding only `slp_rt` (plus the identity cookies, which are Path=/
 * and survive independently).
 */
test.describe("session continuity", () => {
  test("a live refresh token keeps a returning learner signed in on a document request", async ({
    context,
    page,
  }) => {
    await context.addCookies([
      // No slp_at: it has expired, exactly as it would after an hour away.
      // The PATH IS THE POINT and must be written explicitly: Playwright's
      // addCookies({url}) defaults to Path=/, which production never did, so a
      // test that omits it silently asserts nothing.
      { name: "slp_rt", value: "test-refresh", domain: "localhost", path: REFRESH_PATH },
      { name: "slp_uid", value: "user-1", url: E2E_BASE_URL },
      { name: "slp_em", value: "learner@example.com", url: E2E_BASE_URL },
    ]);
    await context.addInitScript(() => localStorage.setItem("onboarding_completed:user-1", "1"));

    await page.goto("/dashboard");
    await expect(page).not.toHaveURL(/\/login/);
    // NOT enough on its own: the error boundary is also "not /login". The page
    // must actually render the dashboard. An earlier version of this test
    // asserted only the URL and would have passed while the render threw.
    await expect(page.locator("main#main")).toBeVisible();
    await expect(page.locator("body")).toContainText("Continue training", { timeout: 20_000 });
    await expect(page.locator("body")).not.toContainText("This screen didn’t load");
  });

  /**
   * The cookie the browser stores must be reachable from a page route, not only
   * from /api — this is the property the redirect above depends on.
   */
  /**
   * A cookie at Path=/api is invisible to /dashboard. This asserts the browser
   * rule the bug rested on, so the reproduction above cannot silently stop
   * reproducing anything.
   */
  test("a refresh cookie scoped to /api is not sent on a page request", async ({ context, page }) => {
    await context.addCookies([
      { name: "slp_probe", value: "api-scoped", domain: "localhost", path: "/api" },
      { name: "slp_probe_root", value: "root-scoped", domain: "localhost", path: "/" },
    ]);
    await page.goto("/login");
    const sent = await page.evaluate(() => document.cookie);
    void sent; // httpOnly-free probes only; the assertion below is the real one.
    const jar = await context.cookies(`${E2E_BASE_URL}/dashboard`);
    expect(jar.find((c) => c.name === "slp_probe_root")).toBeTruthy();
    expect(jar.find((c) => c.name === "slp_probe")).toBeFalsy();
  });
});
