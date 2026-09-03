import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { allMarketingPages } from "../../lib/site";

/**
 * Visual QA for the public site: full-page captures of every marketing page
 * and one page per public template at phone, tablet, laptop and wide widths,
 * with a hard check that nothing overflows horizontally. Captures land in
 * docs/visual-qa/public/ and are inspected by a person, not asserted pixel-by-pixel.
 */
const shots = path.join(process.cwd(), "docs", "visual-qa", "public");

const VIEWPORTS = [
  { name: "phone", width: 390, height: 844 },
  { name: "tablet", width: 820, height: 1180 },
  { name: "laptop", width: 1280, height: 800 },
  { name: "wide", width: 1680, height: 1000 },
];

const PAGES = [
  ...allMarketingPages().map((page) => page.path),
  "/stanag-6001",
  "/guides/writing",
  "/glossary",
  "/privacy",
  "/trust-center",
  "/es/examen-slp",
];

async function capture(page: Page, name: string) {
  mkdirSync(shots, { recursive: true });
  await page.screenshot({ path: path.join(shots, `${name}.png`), fullPage: true });
}

async function noHorizontalOverflow(page: Page, label: string) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, `${label} overflows horizontally by ${overflow}px`).toBeLessThanOrEqual(0);
}

test.describe("visual QA — public site", () => {
  for (const viewport of VIEWPORTS) {
    test(`public pages at ${viewport.name} (${viewport.width}px)`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.emulateMedia({ reducedMotion: "reduce" });
      for (const route of PAGES) {
        await page.goto(route);
        await expect(page.locator("main")).toHaveCount(1);
        const name = `${route === "/" ? "home" : route.replace(/^\//, "").replace(/\//g, "-")}-${viewport.name}`;
        await capture(page, name);
        await noHorizontalOverflow(page, `${route} @ ${viewport.name}`);
      }
    });
  }

  test("the phone header opens and closes its menu", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const toggle = page.getByRole("button", { name: "Open menu" });
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(page.getByRole("navigation", { name: "Primary, mobile" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Pricing" }).last()).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("navigation", { name: "Primary, mobile" })).toBeHidden();
    await capture(page, "home-phone-menu");
  });
});
