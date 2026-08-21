import { expect, test } from "@playwright/test";
import { E2E_BASE_URL } from "./baseUrl";

/**
 * PR-20 — the product Coach at /speaking/coach.
 *
 * The live conversation itself needs a real microphone, a real WebRTC hop and
 * real minutes, so it is validated by hand (see docs/SLP-COMMAND-PR20-COACH.md).
 * What is asserted here is everything that must hold before a single minute is
 * spent: the route is behind auth, the screen states the backend's own
 * objective, plan and both minute pools, and the conversation token never
 * reaches the page.
 */

const AUTH = (url: string) => [
  { name: "slp_at", value: "test-access", url },
  { name: "slp_rt", value: "test-refresh", url },
  { name: "slp_uid", value: "user-1", url },
  { name: "slp_em", value: "learner@example.com", url },
];

test("unauthenticated Coach redirects to login", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/speaking/coach");
  await expect(page).toHaveURL(/\/login/);
  await context.close();
});

test("the pre-session states the objective, the plan and both minute pools", async ({ page, context }) => {
  await context.addCookies(AUTH(E2E_BASE_URL));
  await page.addInitScript(() => localStorage.setItem("onboarding_completed:user-1", "1"));
  await page.goto("/speaking/coach");

  await expect(page.getByText("Sustain an argument under pressure")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("Your last three recordings lost the claim when challenged.")).toBeVisible();

  // The plan is the server's, rendered as an arc — never as a progress bar.
  await expect(page.getByText("Orientation → Practice → Close")).toBeVisible();

  // Two pools, named. Never one ambiguous total.
  await expect(page.getByText("Included this month")).toBeVisible();
  await expect(page.getByText("Purchased credits")).toBeVisible();
  await expect(page.getByText("Total available")).toBeVisible();

  await expect(page.getByRole("button", { name: /Start Coach · up to 1 min/ })).toBeVisible();
});

test("the conversation token never reaches the page", async ({ page, context }) => {
  await context.addCookies(AUTH(E2E_BASE_URL));
  await page.addInitScript(() => localStorage.setItem("onboarding_completed:user-1", "1"));
  await page.goto("/speaking/coach");
  await expect(page.getByText("Sustain an argument under pressure")).toBeVisible({ timeout: 20_000 });

  await expect(page.locator("body")).not.toContainText("spike-fake-token-do-not-render");
  const storage = await page.evaluate(() => ({
    local: JSON.stringify(window.localStorage),
    session: JSON.stringify(window.sessionStorage),
  }));
  expect(storage.local).not.toContain("spike-fake-token-do-not-render");
  expect(storage.session).not.toContain("spike-fake-token-do-not-render");
});

test("Speaking offers the Coach only when the backend says it is available", async ({ page, context }) => {
  await context.addCookies(AUTH(E2E_BASE_URL));
  await page.addInitScript(() => localStorage.setItem("onboarding_completed:user-1", "1"));
  await page.goto("/speaking");
  const coach = page.locator("a[href='/speaking/coach']");
  await expect(coach.first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("AI Coach").first()).toBeVisible();
});

test("a phone is told the Coach is desktop-only before it spends minutes", async ({ browser }) => {
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  await context.addCookies(AUTH(E2E_BASE_URL));
  const page = await context.newPage();
  await page.addInitScript(() => localStorage.setItem("onboarding_completed:user-1", "1"));
  await page.goto("/speaking/coach");

  await expect(page.getByRole("heading", { name: "The live Coach runs on a computer" })).toBeVisible({
    timeout: 20_000,
  });
  // The dead end names a real alternative, and the start affordance is gone
  // entirely — not greyed out beneath a sentence that contradicts it.
  await expect(page.getByRole("link", { name: "Open Speaking Practice" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Start Coach/ })).toHaveCount(0);
  await context.close();
});

/**
 * PRE-FLIGHT ORDER — the master plan's one mandatory rule for this screen:
 *
 *   1. Engine available. 2. Microphone not denied. 3. THEN POST /session.
 *   "Reverse order leaks charged empty sessions."
 *
 * A session is authorized — and a budget snapshotted — the moment that POST
 * lands. If the microphone was never going to work, that session can only ever
 * be reconciled as a failure. So the assertion is not "the order looks right"
 * but "the request never happens at all".
 */
test("a denied microphone never authorizes a session", async ({ page, context }) => {
  await context.addCookies(AUTH(E2E_BASE_URL));
  await page.addInitScript(() => {
    localStorage.setItem("onboarding_completed:user-1", "1");
    // Both doors the pre-flight can knock on report a refusal.
    Object.defineProperty(navigator, "permissions", {
      configurable: true,
      value: { query: async () => ({ state: "denied" }) },
    });
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: async () => {
          throw new Error("Permission denied");
        },
      },
    });
  });

  const sessionPosts: string[] = [];
  page.on("request", (req) => {
    if (req.method() === "POST" && req.url().includes("/speaking/coach/session")) sessionPosts.push(req.url());
  });

  await page.goto("/speaking/coach");
  await page.getByRole("button", { name: /Start Coach/ }).click();

  await expect(page.getByText("The Coach needs your microphone. Enable it in the browser settings.")).toBeVisible();
  expect(sessionPosts).toEqual([]);
});

test("the microphone is settled before the session is authorized", async ({ page, context }) => {
  await context.addCookies(AUTH(E2E_BASE_URL));
  await page.addInitScript(() => {
    localStorage.setItem("onboarding_completed:user-1", "1");
    (window as unknown as { __order: string[] }).__order = [];
    Object.defineProperty(navigator, "permissions", {
      configurable: true,
      value: {
        query: async () => {
          (window as unknown as { __order: string[] }).__order.push("mic");
          return { state: "granted" };
        },
      },
    });
  });

  page.on("request", (req) => {
    if (req.method() === "POST" && req.url().includes("/speaking/coach/session")) {
      void page.evaluate(() => (window as unknown as { __order: string[] }).__order.push("session"));
    }
  });

  await page.goto("/speaking/coach");
  await page.getByRole("button", { name: /Start Coach/ }).click();
  // The SDK cannot connect to a fake token, so the screen lands on the honest
  // dead end — which is itself the right outcome for an impossible call.
  await expect(page.getByRole("heading", { name: "The live Coach could not start" })).toBeVisible({
    timeout: 20_000,
  });

  const order = await page.evaluate(() => (window as unknown as { __order: string[] }).__order);
  expect(order[0]).toBe("mic");
  expect(order).toContain("session");
});

/**
 * The token, through a real start attempt.
 *
 * The earlier token test covers a page that never started a session. This one
 * actually calls `POST /session`, takes the real token into the real SDK, and
 * watches everything the page says out loud on the way — console included,
 * because the SDK is third-party code and its logging is not ours to assume.
 */
test("a real start attempt never speaks the token — DOM, storage or console", async ({ page, context }) => {
  const TOKEN = "spike-fake-token-do-not-render";
  await context.addCookies(AUTH(E2E_BASE_URL));
  await page.addInitScript(() => {
    localStorage.setItem("onboarding_completed:user-1", "1");
    Object.defineProperty(navigator, "permissions", {
      configurable: true,
      value: { query: async () => ({ state: "granted" }) },
    });
  });

  const spoken: string[] = [];
  page.on("console", (msg) => spoken.push(msg.text()));
  page.on("pageerror", (err) => spoken.push(String(err?.stack ?? err)));

  await page.goto("/speaking/coach");
  await page.getByRole("button", { name: /Start Coach/ }).click();
  await expect(page.getByRole("heading", { name: "The live Coach could not start" })).toBeVisible({
    timeout: 20_000,
  });

  expect(spoken.join("\n")).not.toContain(TOKEN);
  await expect(page.locator("body")).not.toContainText(TOKEN);
  const stored = await page.evaluate(() => JSON.stringify(window.localStorage) + JSON.stringify(window.sessionStorage));
  expect(stored).not.toContain(TOKEN);
});
