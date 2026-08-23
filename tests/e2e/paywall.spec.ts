import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { E2E_BASE_URL } from "./baseUrl";

/**
 * MODEL B, end to end.
 *
 * The mock backend serves a Free plan. These tests take the position of
 * someone who wants premium content without paying for it, and check that
 * every route they could take ends at the server saying no — not at a hidden
 * element, a disabled button or a client-side flag.
 *
 * `reasoning` is a Pro-only Listening Academy topic; `inference` is in the free
 * set. Both are real catalog entries, so the difference between them is the
 * plan and nothing else.
 */

/**
 * A JWT-shaped access token whose `sub` is a real UUID.
 *
 * The checkout route derives the buyer from this claim rather than from
 * `slp_uid`, so a session that only carries an opaque string never reaches the
 * flag gate — which is correct, and is why the billing tests below need a
 * realistic token rather than the suite's placeholder one.
 */
const REAL_UID = "11111111-2222-3333-4444-555555555555";
function jwt(sub: string): string {
  const seg = (o: unknown) =>
    Buffer.from(JSON.stringify(o)).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${seg({ alg: "HS256", typ: "JWT" })}.${seg({ sub, aud: "authenticated", role: "authenticated" })}.sig`;
}

const JWT_AUTH = (url: string) => [
  { name: "slp_at", value: jwt(REAL_UID), url },
  { name: "slp_rt", value: "test-refresh", url },
  { name: "slp_uid", value: REAL_UID, url },
  { name: "slp_em", value: "learner@example.com", url },
];

const AUTH = (url: string) => [
  { name: "slp_at", value: "test-access", url },
  { name: "slp_rt", value: "test-refresh", url },
  { name: "slp_uid", value: "user-1", url },
  { name: "slp_em", value: "learner@example.com", url },
];

test.beforeEach(async ({ context }) => {
  await context.addCookies(AUTH(E2E_BASE_URL));
  await context.addInitScript(() => localStorage.setItem("onboarding_completed:user-1", "1"));
});

test("a free learner sees the plan boundary, and the lesson never reaches the browser", async ({ page }) => {
  await page.goto("/listening/academy/topic/reasoning");
  await expect(page.getByText("This topic is part of the complete Academy, included in SLP Command Pro.")).toBeVisible({
    timeout: 20_000,
  });

  // The decisive assertion: the locked lesson's own content is absent from the
  // served HTML, not merely hidden. A CSS rule or a React branch can be
  // defeated in DevTools; content the server never sent cannot.
  const html = await page.content();
  expect(html).not.toContain("Losing the connection between premise and conclusion");
  expect(html).not.toContain("Trace because / therefore / so links");

  // And the boundary offers the real next step.
  await expect(page.locator("a[href='/subscription']").first()).toBeVisible();
});

test("a free topic in the same catalog does open — the gate is the plan, not the route", async ({ page }) => {
  await page.goto("/listening/academy/topic/inference");
  await expect(page.getByRole("heading", { name: "Inference & Hidden Meaning" })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("This topic is part of the complete Academy", { exact: false })).toHaveCount(0);
});

test("a client that declares itself premium is still refused", async ({ page }) => {
  // Every lever a browser actually has: storage, a cookie, a query string, and
  // a global. None of them is an input to the decision.
  await page.addInitScript(() => {
    localStorage.setItem("plan", "pro");
    localStorage.setItem("isPro", "true");
    localStorage.setItem("entitlements", JSON.stringify({ plan: { key: "pro" } }));
    sessionStorage.setItem("subscription", "active");
    document.cookie = "plan=pro; path=/";
    document.cookie = "slp_plan=pro; path=/";
    (window as unknown as Record<string, unknown>).__SLP_IS_PRO = true;
  });

  await page.goto("/listening/academy/topic/reasoning?plan=pro&isPro=true&premium=1");
  await expect(page.getByText("This topic is part of the complete Academy, included in SLP Command Pro.")).toBeVisible({
    timeout: 20_000,
  });
  const html = await page.content();
  expect(html).not.toContain("Losing the connection between premise and conclusion");
});

test("mutating the plan in the running page changes a label, never access", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.locator("body")).toContainText("SLP Command Free", { timeout: 20_000 });

  // Even if a determined user rewrote the rendered label, the server-gated
  // route is unaffected — which is the whole point of Model B.
  await page.evaluate(() => {
    document.querySelectorAll("*").forEach((el) => {
      if (el.childNodes.length === 1 && el.textContent === "SLP Command Free") el.textContent = "SLP Command Pro";
    });
  });
  await page.goto("/listening/academy/topic/reasoning");
  await expect(page.getByText("This topic is part of the complete Academy", { exact: false })).toBeVisible();
});

test("the commercial surface is honest and has no checkout", async ({ page }) => {
  await page.goto("/subscription");
  await expect(page.getByRole("heading", { level: 1, name: "SLP Command Free" })).toBeVisible({ timeout: 20_000 });

  // Real allowances from the account, not a price list. Reading and Listening
  // both carry the same weekly allowance, so this asserts the shape, not a
  // unique string.
  await expect(page.getByText("Reading practice")).toBeVisible();
  await expect(page.getByText("4 of 10 left this week").first()).toBeVisible();

  // Declared-but-not-included features say so rather than being hidden.
  await expect(page.getByText("Adaptive Coach")).toBeVisible();

  // No purchase rail exists until Q4, and none is faked. The invariant is
  // about CONTROLS and PRICES, not vocabulary: the page is allowed — required,
  // even — to say in prose that there is no web checkout yet.
  const controls = await page.locator("button, a, input, form").allInnerTexts();
  for (const label of controls) {
    expect(label).not.toMatch(/\b(Subscribe|Buy now|Buy |Checkout|Pay|Upgrade now|Start trial|Card)\b/i);
  }
  await expect(page.locator("form")).toHaveCount(0);
  await expect(page.locator("input")).toHaveCount(0);
  // And no price is quoted where nothing can be paid.
  const body = await page.locator("body").innerText();
  expect(body).not.toMatch(/[€$£]\s?\d|\d+[.,]\d{2}\s?(EUR|USD|GBP)|per month for/i);
  await expect(page.getByRole("button", { name: "Check my plan again" })).toBeEnabled();
});

test("the recheck reports the server's answer, not the learner's hope", async ({ page }) => {
  await page.goto("/subscription");
  await expect(page.getByRole("heading", { level: 1, name: "SLP Command Free" })).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Check my plan again" }).click();
  await expect(page.getByText("The server still reports this account as", { exact: false })).toBeVisible({
    timeout: 20_000,
  });
  // The page title is the plan. Five reads later it still says Free, because
  // that is what the backend said five times.
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("SLP Command Free");
  await expect(page.locator(".app-plan")).toHaveText("SLP Command Free");
});

test("the commercial surface is behind auth and out of the index", async ({ browser, request }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/subscription");
  await expect(page).toHaveURL(/\/login/);
  await context.close();

  const robots = await request.get("/robots.txt");
  expect(await robots.text()).toContain("/subscription");
});

test("the commercial surface is keyboard-reachable and has no serious axe violations", async ({ page }) => {
  await page.goto("/subscription");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 20_000 });

  // A commercial screen a keyboard user cannot operate is a commercial screen
  // that does not work.
  const recheck = page.getByRole("button", { name: "Check my plan again" });
  await recheck.focus();
  await expect(recheck).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByText("The server still reports this account as", { exact: false })).toBeVisible({
    timeout: 20_000,
  });

  const results = await new AxeBuilder({ page }).disableRules(["color-contrast"]).analyze();
  expect(results.violations.filter((v) => v.impact === "critical" || v.impact === "serious")).toEqual([]);
});

/**
 * THE KILL SWITCH, end to end.
 *
 * The test environment deliberately leaves `web_billing_enabled` off and the
 * offer unconfigured — the production posture. What is asserted is that this
 * state is genuinely closed rather than merely hidden: no button in the page,
 * and no way in through the endpoint either.
 */
test("with billing off there is no checkout in the page", async ({ page }) => {
  await page.goto("/subscription");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("button", { name: "Subscribe" })).toHaveCount(0);
  // The honest alternative is still offered.
  //
  // RE-POINTED, AND WHY. This asserted the literal "SLP Command Professional is
  // purchased in the iOS app", which was the copy when the test was written in
  // f25be3c. 4253dfc rewrote that block to name the web kill switch and give a
  // support address instead — a deliberate copy change that did not update this
  // test. The suite never reported it: 4253dfc also broke a SubscriptionView
  // unit test, CI stopped at vitest, and Playwright never ran. Fixing the unit
  // test is what finally let this one execute.
  //
  // The INTENT is unchanged and is what this now asserts: with checkout off the
  // page must still tell the learner where to go, rather than being a dead end.
  // Keyed on the heading rather than the sentence, because a heading is the part
  // a copy edit is least likely to reword.
  await expect(page.getByRole("heading", { name: "Web checkout is off on this account" })).toBeVisible();
  // `exact` matters: the address appears twice on this screen — once in the
  // section lead and once in the lock body — and a loose match is a strict-mode
  // violation rather than a passing assertion.
  await expect(page.getByText("Email support@slpcommand.com.", { exact: true })).toBeVisible();
});

test("with billing off there is nothing behind the page either", async ({ browser }) => {
  // A real-shaped session, so this request gets PAST the identity gate and is
  // actually testing the kill switch rather than the login check.
  const context = await browser.newContext();
  await context.addCookies(JWT_AUTH(E2E_BASE_URL));
  const origin = E2E_BASE_URL.replace("127.0.0.1", "localhost");
  const res = await context.request.post(`${E2E_BASE_URL}/api/billing/checkout`, { headers: { Origin: origin } });
  expect(res.status()).toBe(404);
  expect(await res.text()).not.toContain("app_user_id");
  await context.close();
});

test("a session whose token carries no usable subject cannot start a checkout", async ({ browser }) => {
  // The suite's placeholder session: an opaque `slp_at` and a `slp_uid` that
  // is not a UUID. There is no identity to bind a purchase to, so the route
  // refuses before it considers anything else.
  const context = await browser.newContext();
  await context.addCookies(AUTH(E2E_BASE_URL));
  const origin = E2E_BASE_URL.replace("127.0.0.1", "localhost");
  const res = await context.request.post(`${E2E_BASE_URL}/api/billing/checkout`, { headers: { Origin: origin } });
  expect(res.status()).toBe(401);
  await context.close();
});

test("an edited slp_uid cannot redirect a purchase to another account", async ({ browser }) => {
  // The attack: a signed-in learner points `slp_uid` at someone else's UUID
  // from DevTools — httpOnly stops scripts, not the person at the keyboard —
  // hoping their own payment lands on that account. The route reads the
  // token's `sub`, sees the two disagree, and refuses.
  const context = await browser.newContext();
  const victim = "99999999-8888-7777-6666-555555555555";
  await context.addCookies([
    ...JWT_AUTH(E2E_BASE_URL).filter((c) => c.name !== "slp_uid"),
    { name: "slp_uid", value: victim, url: E2E_BASE_URL },
  ]);
  const origin = E2E_BASE_URL.replace("127.0.0.1", "localhost");
  const res = await context.request.post(`${E2E_BASE_URL}/api/billing/checkout`, { headers: { Origin: origin } });
  expect(res.status()).toBe(401);
  expect(await res.text()).not.toContain(victim);
  await context.close();
});

test("the checkout endpoint refuses an unauthenticated caller", async ({ browser }) => {
  // A fresh context: no session cookie, so no identity to bind a purchase to.
  const context = await browser.newContext();
  const origin = E2E_BASE_URL.replace("127.0.0.1", "localhost");
  const res = await context.request.post(`${E2E_BASE_URL}/api/billing/checkout`, { headers: { Origin: origin } });
  expect([401, 404]).toContain(res.status());
  expect(await res.text()).not.toContain("app_user_id");
  await context.close();
});

test("the checkout endpoint is not reachable cross-site", async ({ request }) => {
  // The existing CSRF rule covers it: a state-changing /api call from an
  // origin we do not recognise is rejected before any of this runs.
  const res = await request.post("/api/billing/checkout", { headers: { Origin: "https://evil.example" } });
  expect(res.status()).toBe(403);
});
