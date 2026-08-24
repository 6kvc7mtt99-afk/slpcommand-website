import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { E2E_BASE_URL } from "./baseUrl";

test("the authenticated home has no serious axe violations, with or without reduced motion", async ({
  page,
  context,
}) => {
  await context.addCookies([
    { name: "slp_at", value: "test-access", url: E2E_BASE_URL },
    { name: "slp_rt", value: "test-refresh", url: E2E_BASE_URL },
    { name: "slp_uid", value: "user-1", url: E2E_BASE_URL },
    { name: "slp_em", value: "learner@example.com", url: E2E_BASE_URL },
  ]);
  await page.addInitScript(() => localStorage.setItem("onboarding_completed:user-1", "1"));

  await page.goto("/dashboard");
  const result = await new AxeBuilder({ page }).disableRules(["color-contrast"]).analyze();
  expect(result.violations.filter((item) => item.impact === "critical" || item.impact === "serious")).toEqual([]);

  // The instrument's stage panel, the doors' live pointer-tilt, and the
  // legend's target-gap chip are all new surface area — re-run under
  // reduced motion, where the tilt hook must never attach at all.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  const isLiveTilt = await page.locator("a.p-dest").first().evaluate((el) => el.classList.contains("is-live-tilt"));
  expect(isLiveTilt).toBe(false);
  const reduced = await new AxeBuilder({ page }).disableRules(["color-contrast"]).analyze();
  expect(reduced.violations.filter((item) => item.impact === "critical" || item.impact === "serious")).toEqual([]);
});

test("the public landing page has no serious axe violations, with or without reduced motion", async ({ page }) => {
  await page.goto("/");
  const result = await new AxeBuilder({ page }).disableRules(["color-contrast"]).analyze();
  expect(result.violations.filter((item) => item.impact === "critical" || item.impact === "serious")).toEqual([]);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  const reduced = await new AxeBuilder({ page }).disableRules(["color-contrast"]).analyze();
  expect(reduced.violations.filter((item) => item.impact === "critical" || item.impact === "serious")).toEqual([]);
});

test("login and a legal page have no serious axe violations", async ({ page }) => {
  await page.goto("/login");
  const login = await new AxeBuilder({ page }).disableRules(["color-contrast"]).analyze();
  expect(login.violations.filter((item) => item.impact === "critical" || item.impact === "serious")).toEqual([]);

  await page.goto("/privacy");
  const privacy = await new AxeBuilder({ page }).disableRules(["color-contrast", "link-in-text-block"]).analyze();
  expect(privacy.violations.filter((item) => item.impact === "critical" || item.impact === "serious")).toEqual([]);

  await page.goto("/admin");
  const admin = await new AxeBuilder({ page }).disableRules(["color-contrast"]).analyze();
  expect(admin.violations.filter((item) => item.impact === "critical" || item.impact === "serious")).toEqual([]);
});

// TEACHER-UX-POLISH-001 — the staff nav link and the new signup/confirmation
// feedback screens, in every state that renders without a real backend.
test("the staff Teacher nav link has no serious axe violations", async ({ page, context }) => {
  await context.addCookies([
    { name: "slp_at", value: "test-access-teacher", url: E2E_BASE_URL },
    { name: "slp_rt", value: "test-refresh", url: E2E_BASE_URL },
    { name: "slp_uid", value: "teacher-a11y-1", url: E2E_BASE_URL },
    { name: "slp_em", value: "teacher@example.com", url: E2E_BASE_URL },
  ]);
  await page.addInitScript(() => localStorage.setItem("onboarding_completed:teacher-a11y-1", "1"));
  await page.goto("/dashboard");
  await expect(page.getByRole("link", { name: "SLP Command Teacher" })).toBeVisible();
  const result = await new AxeBuilder({ page }).disableRules(["color-contrast"]).analyze();
  expect(result.violations.filter((item) => item.impact === "critical" || item.impact === "serious")).toEqual([]);
});

test("signup and the email-confirmation states have no serious axe violations", async ({ page }) => {
  await page.goto("/signup");
  const signup = await new AxeBuilder({ page }).disableRules(["color-contrast"]).analyze();
  expect(signup.violations.filter((item) => item.impact === "critical" || item.impact === "serious")).toEqual([]);

  await page.goto("/auth/confirmed");
  const neutral = await new AxeBuilder({ page }).disableRules(["color-contrast"]).analyze();
  expect(neutral.violations.filter((item) => item.impact === "critical" || item.impact === "serious")).toEqual([]);

  await page.goto("/auth/confirmed?error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired");
  const errorState = await new AxeBuilder({ page }).disableRules(["color-contrast"]).analyze();
  expect(errorState.violations.filter((item) => item.impact === "critical" || item.impact === "serious")).toEqual([]);
});

/**
 * The authority cluster is the site's public face for organic search and the
 * surface most likely to be read on a phone, yet it had no accessibility
 * coverage at all. One page per template shape: the pillar, a Spanish page
 * (different `lang`), the index, and a guide.
 */
const AUTHORITY = [
  "/stanag-6001",
  "/es/slp-3",
  "/guides",
  "/guides/writing",
  // The glossary is its own template shape — a definition list with status
  // badges and per-term anchors — so it needs its own check rather than
  // inheriting confidence from the article pages.
  "/glossary",
];

test("authority pages have no serious axe violations", async ({ page }) => {
  for (const path of AUTHORITY) {
    await page.goto(path);
    const result = await new AxeBuilder({ page }).disableRules(["color-contrast"]).analyze();
    const serious = result.violations.filter(
      (item) => item.impact === "critical" || item.impact === "serious",
    );
    expect(serious.map((v) => `${path}: ${v.id}`), path).toEqual([]);
  }
});

test("authority pages keep one h1 and a labelled breadcrumb", async ({ page }) => {
  for (const path of AUTHORITY) {
    await page.goto(path);
    await expect(page.locator("h1"), path).toHaveCount(1);
    await expect(page.locator('nav[aria-label="Breadcrumb"]'), path).toBeVisible();
  }
});

test("every authority page offers the free signup", async ({ page }) => {
  // The conversion path regressed to zero once already: twelve indexable pages
  // whose CTAs all pointed at anchors while /signup sat unlinked.
  for (const path of AUTHORITY) {
    await page.goto(path);
    await expect(page.locator('a[href="/signup"]').first(), path).toBeVisible();
  }
});
