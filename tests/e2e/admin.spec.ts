import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { E2E_BASE_URL } from "./baseUrl";

test("unauthorized visitors see admin login and stay off the console", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (req) => requests.push(req.url()));
  const res = await page.goto("/admin");
  expect(res?.ok()).toBeTruthy();
  await expect(page.getByRole("heading", { name: "Admin access" })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("SLP Command · Operations");
  expect(requests.some((url) => url.includes("onrender.com"))).toBe(false);
  const robots = await page.locator('meta[name="robots"]').getAttribute("content");
  expect(robots ?? "").toMatch(/noindex/i);
});

test("admin login form has no serious axe violations", async ({ page }) => {
  await page.goto("/admin");
  const results = await new AxeBuilder({ page }).disableRules(["color-contrast"]).analyze();
  expect(results.violations.filter((item) => item.impact === "critical" || item.impact === "serious")).toEqual([]);
});

test.describe("admin session via proxy", () => {
  test("authenticated non-admin cannot open the console", async ({ page, context }) => {
    await context.addCookies([
      { name: "slp_at", value: "test-access", url: E2E_BASE_URL },
      { name: "slp_rt", value: "test-refresh", url: E2E_BASE_URL },
      { name: "slp_uid", value: "user-1", url: E2E_BASE_URL },
      { name: "slp_em", value: "learner@example.com", url: E2E_BASE_URL },
    ]);
    const requests: string[] = [];
    page.on("request", (req) => requests.push(req.url()));
    await page.goto("/admin");
    await expect(page.locator(".admin-err")).toContainText("This account is not an administrator.");
    await expect(page.locator("body")).not.toContainText("SLP Command · Operations");
    expect(requests.some((url) => url.includes("onrender.com"))).toBe(false);
    expect(requests.some((url) => url.includes("/api/backend/admin/"))).toBe(true);
  });

  test("admin access works through the same-origin proxy", async ({ page, context }) => {
    await context.addCookies([
      { name: "slp_at", value: "admin-access", url: E2E_BASE_URL },
      { name: "slp_rt", value: "admin-refresh", url: E2E_BASE_URL },
      { name: "slp_uid", value: "admin-1", url: E2E_BASE_URL },
      { name: "slp_em", value: "admin@example.com", url: E2E_BASE_URL },
    ]);
    const requests: string[] = [];
    page.on("request", (req) => requests.push(req.url()));
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "SLP Command · Operations" })).toBeVisible();
    await expect(page.locator("body")).toContainText("Total users");
    await expect(page.locator("body")).toContainText("12");
    expect(requests.some((url) => url.includes("onrender.com"))).toBe(false);
    expect(requests.some((url) => url.includes("/api/backend/admin/metrics/users"))).toBe(true);
  });
});
