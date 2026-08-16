import { expect, test } from "@playwright/test";

const PAGES = [
  "/",
  "/privacy",
  "/terms",
  "/ai-usage",
  "/security",
  "/cookies",
  "/data-retention",
  "/delete-account",
  "/disclaimer",
  "/intellectual-property",
  "/legal-notice",
  "/subprocessors",
  "/support",
  "/contact",
  "/trust-center",
];

test("public pages return 200 and keep legal titles", async ({ page }) => {
  for (const path of PAGES) {
    const res = await page.goto(path);
    expect(res?.ok(), path).toBeTruthy();
  }
  await page.goto("/privacy");
  await expect(page.locator("h1")).toContainText("Privacy Policy");
  await page.goto("/cookies");
  await expect(page.locator("body")).toContainText("slp_at");
});

test(".html URLs redirect to extensionless", async ({ request }) => {
  const res = await request.get("/privacy.html", { maxRedirects: 0 });
  expect([301, 308]).toContain(res.status());
});

test("robots disallows admin and app", async ({ request }) => {
  const res = await request.get("/robots.txt");
  const body = await res.text();
  expect(body).toContain("Disallow: /admin");
  expect(body).toContain("Disallow: /dashboard");
});
