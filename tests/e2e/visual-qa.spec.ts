import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { E2E_BASE_URL } from "./baseUrl";

const cookies = [
  { name: "slp_at", value: "test-access", url: E2E_BASE_URL },
  { name: "slp_rt", value: "test-refresh", url: E2E_BASE_URL },
  { name: "slp_uid", value: "user-1", url: E2E_BASE_URL },
  { name: "slp_em", value: "learner@example.com", url: E2E_BASE_URL },
];

const shots = path.join(process.cwd(), "docs", "visual-qa");

/**
 * The 23-route capture sweep is opt-in: `VISUAL_QA=1`.
 *
 * WHY. Every worker shares one Next server (see playwright.config.ts). This
 * sweep walks 23 routes at 1440, one at 1024 and nine at 390, settling each
 * before it shoots — minutes of continuous load. Run alongside the functional
 * suite it starved the other four workers and produced 34 phantom
 * `page.goto` timeouts in academy/admin/auth-dashboard/coach-spike, every one
 * of which passes in isolation. Raising navigationTimeout to 60s halved them;
 * it did not remove the cause.
 *
 * Regenerating docs/visual-qa rewrites 40 committed PNGs, so it should be a
 * deliberate act rather than a side effect of running the tests:
 *
 *   VISUAL_QA=1 PLAYWRIGHT_PORT=3131 npx playwright test tests/e2e/visual-qa.spec.ts
 *
 * Nothing is hidden — the cheap assertions (login/signup ceremony, the Coach
 * dead ends, and their no-horizontal-overflow checks) still run every time.
 * Only the heavy sweep is gated.
 */
const CAPTURE_SWEEP = process.env.VISUAL_QA === "1";

/**
 * Settle the page before capturing it.
 *
 * THE PROBLEM THIS FIXES. Every committed capture in docs/visual-qa was
 * unreviewable, in two independent ways:
 *
 *  1. MID-ANIMATION. Entrances use `animation: p-rise … both`, and
 *     `animation-fill-mode: both` holds the from-state (opacity 0) before the
 *     animation starts. Screenshotting during those 520ms produced pages at
 *     roughly 20% opacity — /subscription and the exam disclaimer gate are
 *     legible only as ghosts.
 *  2. EVERYTHING BELOW THE FOLD MISSING. `data-reveal` sections are hidden
 *     until an IntersectionObserver marks them `.is-in`, and Reveal.tsx only
 *     reveals what is already within 0.92 × innerHeight on load. A fullPage
 *     screenshot captures the whole document but never scrolls, so on a
 *     1440×900 viewport the four skill doors and every section under them
 *     stayed invisible — on mobile, over half the page.
 *
 * The net effect was that the lower half of the authenticated product had
 * never actually been looked at, while a folder of PNGs implied it had.
 *
 * Forcing `.is-in` here is legitimate for QA: it asserts the END state of a
 * reveal, which is what a human sees a moment after arriving. It does not mask
 * a layout bug — it exposes the layout that was previously never captured.
 */
async function settle(page: Page) {
  await page.evaluate(() => {
    /**
     * Kill the choreography, then force the reveal end state. In that order.
     *
     * Two DIFFERENT mechanisms hide content before it animates in, and chasing
     * them selector by selector kept producing captures that looked like broken
     * pages:
     *
     *  1. ANIMATION with `animation-fill-mode: both`. `[data-enter]` and each of
     *     its choreographed children (.p-eyebrow, .p-hero-title, .p-lead,
     *     .p-mission-blocks, .p-hero-actions, .p-status, .p-instrument-bay,
     *     .p-dial) and separately `.task-stage`'s `task-enter` all hold
     *     opacity 0 until their own delay elapses. Disabling animation globally
     *     reverts every one of them to its natural computed opacity — no need
     *     to enumerate them, and nothing is forced to a value the design did
     *     not intend.
     *  2. A REAL RULE. `.reveal-armed .app-shell [data-reveal] { opacity: 0 }`
     *     is plain CSS, not an animation, so it survives (1). It is cleared by
     *     `.is-in`, which normally rides a 640ms transition with a
     *     `calc(var(--i) * 70ms)` stagger — up to ~1060ms for a six-panel
     *     section. Killing transitions first makes that class apply instantly,
     *     so the capture is deterministic rather than a race against a timer.
     *
     * This asserts the state a human sees a moment after arriving. It does not
     * mask a layout bug — it exposes layout that was never captured before. It
     * caught 132px of real horizontal overflow on the home the first time it
     * worked properly.
     */
    const kill = document.createElement("style");
    kill.textContent = "*,*::before,*::after{animation:none!important;transition:none!important}";
    document.head.appendChild(kill);
    document.querySelectorAll("[data-reveal]").forEach((n) => n.classList.add("is-in"));
  });
  await page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null)))),
  );
  await page.evaluate(() => document.fonts?.ready);
}

async function capture(page: Page, name: string) {
  mkdirSync(shots, { recursive: true });
  await settle(page);
  await page.screenshot({ path: path.join(shots, `${name}.png`), fullPage: true });
}

async function noHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(8);
}

test.describe("visual QA — public and auth", () => {
  test("login and signup compose as a focused ceremony", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
    await capture(page, "login-desktop");
    await noHorizontalOverflow(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await capture(page, "login-mobile");
    await noHorizontalOverflow(page);

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/signup");
    await expect(page.getByRole("heading", { name: "Create an account" })).toBeVisible();
    await capture(page, "signup-desktop");
  });
});

test.describe("visual QA — workspace", () => {
  test.beforeEach(async ({ context }) => {
    await context.addCookies(cookies);
    await context.addInitScript(() => localStorage.setItem("onboarding_completed:user-1", "1"));
  });

  test("home and skill surfaces at desktop and mobile", async ({ page }) => {
    test.skip(!CAPTURE_SWEEP, "Capture sweep is opt-in — set VISUAL_QA=1. See note above.");
    // 33 captures, each settling reveal/entrance state before it shoots.
    test.setTimeout(240_000);
    const routes: Array<{ path: string; name: string; text: string }> = [
      { path: "/dashboard", name: "home", text: "Recover listening" },
      { path: "/reading", name: "reading-home", text: "Reading" },
      { path: "/reading/practice", name: "reading-practice", text: "Where should they report?" },
      { path: "/reading/exam", name: "reading-exam", text: "Educational simulation only" },
      { path: "/reading/academy", name: "reading-academy", text: "Recover inference" },
      { path: "/reading/intelligence", name: "reading-intelligence", text: "This is a readiness score, not Estimated SLP." },
      { path: "/listening", name: "listening-home", text: "Listening" },
      { path: "/listening/practice", name: "listening-practice", text: "What did the speaker ask for?" },
      { path: "/listening/academy", name: "listening-academy", text: "Specific Details" },
      { path: "/listening/intelligence", name: "listening-intelligence", text: "Listening Intelligence" },
      { path: "/writing", name: "writing-home", text: "Writing" },
      { path: "/writing/practice", name: "writing-practice", text: "Draft and evaluation" },
      { path: "/writing/exam", name: "writing-exam", text: "Exam" },
      { path: "/writing/tools", name: "writing-tools", text: "Fix the opening" },
      { path: "/speaking", name: "speaking-home", text: "Speaking" },
      { path: "/speaking/practice", name: "speaking-practice", text: "Audio is sent" },
      { path: "/speaking/exam", name: "speaking-exam", text: "Educational simulation only" },
      { path: "/speaking/coach", name: "speaking-coach", text: "Sustain an argument under pressure" },
      { path: "/progress", name: "progress", text: "You are at SLP 2.2." },
      { path: "/profile", name: "profile", text: "Profile" },
      { path: "/subscription", name: "subscription", text: "What your plan allows" },
      { path: "/listening/academy/topic/reasoning", name: "plan-boundary", text: "Plan boundary" },
      { path: "/admin", name: "admin", text: "Admin access" },
    ];

    await page.setViewportSize({ width: 1440, height: 900 });
    for (const route of routes) {
      await page.goto(route.path);
      await expect(page.locator("body")).toContainText(route.text, { timeout: 20_000 });
      await capture(page, `${route.name}-wide`);
      await noHorizontalOverflow(page);
    }

    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto("/dashboard");
    await expect(page.locator("body")).toContainText("Recover listening");
    await capture(page, "home-1024");
    await noHorizontalOverflow(page);

    await page.setViewportSize({ width: 390, height: 844 });
    for (const route of ["/dashboard", "/reading", "/reading/practice", "/listening/practice", "/writing", "/speaking", "/speaking/coach", "/subscription", "/progress"]) {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      await capture(page, `${route.replaceAll("/", "").replace(/^\s*$/, "root") || "page"}-mobile`);
      await noHorizontalOverflow(page);
    }
  });
});

/**
 * The eight-viewport overflow sweep.
 *
 * The capture sweep shoots at 1440, 1024 and 390 — enough to review, not enough
 * to prove the layout holds. This runs the cheap half (the assertion, no
 * screenshots) at every width the brief names, so a regression at 820 or 1680
 * cannot hide between two captured sizes. It runs on EVERY `npx playwright
 * test`, not only under VISUAL_QA, because it is fast and it is the check that
 * actually catches things — it is what found 132px of overflow on the home.
 */
const VIEWPORTS = [390, 430, 768, 820, 1024, 1280, 1440, 1680];
const RESPONSIVE_ROUTES = [
  "/dashboard",
  "/reading",
  "/reading/practice",
  "/writing/practice",
  "/subscription",
  "/progress",
];

/**
 * ONE test, deliberately.
 *
 * This began as six tests (one per route) and took the full suite from 45s to
 * 2.6m with six phantom `page.goto` timeouts in academy/coach/coach-spike —
 * every one of which passed in isolation. `fullyParallel` with five workers
 * means six long-running tests occupy the pool and everything else queues
 * behind them; the server was never the bottleneck, the worker slots were.
 * That is the same mistake the capture sweep made, so it gets the same
 * treatment: keep the coverage, stop competing for the pool.
 *
 * Settling once per route rather than once per viewport is safe — the injected
 * stylesheet and the `.is-in` classes both survive a resize, and no new nodes
 * appear. 6 navigations, 6 settles, 48 assertions, one worker slot.
 */
test.describe("responsive — no horizontal overflow at any supported width", () => {
  test("every supported width holds on the surfaces that carry layout", async ({ context, browser }) => {
    test.setTimeout(120_000);
    await context.addCookies(cookies);
    await context.addInitScript(() => localStorage.setItem("onboarding_completed:user-1", "1"));
    const page = await context.newPage();
    void browser;

    for (const route of RESPONSIVE_ROUTES) {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      await settle(page);
      for (const width of VIEWPORTS) {
        await page.setViewportSize({ width, height: 900 });
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow, `${route} overflows by ${overflow}px at ${width}px`).toBeLessThanOrEqual(8);
      }
    }
    await page.close();
  });
});

test.describe("visual QA — Coach on a phone", () => {
  test("the desktop-only notice is a real screen, not a disabled button", async ({ browser }) => {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    await context.addCookies(cookies);
    const page = await context.newPage();
    await page.addInitScript(() => localStorage.setItem("onboarding_completed:user-1", "1"));
    await page.goto("/speaking/coach");
    await expect(page.getByRole("heading", { name: "The live Coach runs on a computer" })).toBeVisible({
      timeout: 20_000,
    });
    await capture(page, "speaking-coach-desktop-only-mobile");
    await noHorizontalOverflow(page);
    await context.close();
  });
});

test.describe("visual QA — Coach dead ends", () => {
  test.beforeEach(async ({ context }) => {
    await context.addCookies(cookies);
    await context.addInitScript(() => localStorage.setItem("onboarding_completed:user-1", "1"));
  });

  test("a refused microphone is explained, and no session is authorized", async ({ page }) => {
    // Headless Chrome refuses the microphone on its own, which is exactly the
    // learner whose browser has the permission blocked.
    await page.goto("/speaking/coach");
    await page.getByRole("button", { name: /Start Coach/ }).click();
    await expect(page.getByText("The Coach needs your microphone. Enable it in the browser settings.")).toBeVisible();
    await capture(page, "speaking-coach-mic-denied-wide");
    await noHorizontalOverflow(page);
  });

  test("a call that cannot open is a real screen with a real way out", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "permissions", {
        configurable: true,
        value: { query: async () => ({ state: "granted" }) },
      });
    });
    await page.goto("/speaking/coach");
    await page.getByRole("button", { name: /Start Coach/ }).click();
    // The mock token cannot open a WebRTC leg, which is exactly the state
    // this screen exists for.
    await expect(page.getByRole("heading", { name: "The live Coach could not start" })).toBeVisible({
      timeout: 20_000,
    });
    await capture(page, "speaking-coach-unavailable-wide");
    await noHorizontalOverflow(page);
  });
});
