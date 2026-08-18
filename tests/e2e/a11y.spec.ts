import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

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

/**
 * The authority cluster is the site's public face for organic search and the
 * surface most likely to be read on a phone, yet it had no accessibility
 * coverage at all. One page per template shape: the pillar, a Spanish page
 * (different `lang`), the index, and a guide.
 */
const AUTHORITY = ["/stanag-6001", "/es/slp-3", "/guides", "/guides/writing"];

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
