import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { E2E_BASE_URL } from "./baseUrl";

const cookies = [
  { name: "slp_at", value: "test-access", url: E2E_BASE_URL },
  { name: "slp_rt", value: "test-refresh", url: E2E_BASE_URL },
  { name: "slp_uid", value: "user-1", url: E2E_BASE_URL },
  { name: "slp_em", value: "learner@example.com", url: E2E_BASE_URL },
];

test.beforeEach(async ({ context }) => {
  await context.addCookies(cookies);
  await context.addInitScript(() => localStorage.setItem("onboarding_completed:user-1", "1"));
});

test("academy, intelligence and writing tools render backend copy", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (req) => requests.push(req.url()));
  await page.goto("/reading/academy");
  await expect(page.locator("body")).toContainText("Recover inference");
  await page.goto("/reading/intelligence");
  await expect(page.locator("body")).toContainText("This is a readiness score, not Estimated SLP.");
  await expect(page.locator("body")).not.toContainText("passProbability");
  await page.goto("/listening/academy");
  await expect(page.getByRole("link", { name: "Specific Details" })).toBeVisible();
  await expect(page.locator("body")).toContainText("Pro");
  await page.goto("/listening/academy/topic/reasoning");
  await expect(page.locator("body")).toContainText("complete Academy");
  await page.goto("/writing/tools");
  await expect(page.getByRole("link", { name: "Open transformer" })).toBeVisible();
  await expect(page.locator("body")).toContainText("Fix the opening");
  expect(requests.some((url) => url.includes("writing/intelligence/readiness"))).toBe(false);
  expect(requests.some((url) => url.includes("writing/drill-feedback"))).toBe(false);
  expect(requests.some((url) => url.includes("onrender.com"))).toBe(false);
});

test("academy pages have no serious axe violations", async ({ page }) => {
  await page.goto("/writing/tools");
  const results = await new AxeBuilder({ page }).disableRules(["color-contrast"]).analyze();
  expect(results.violations.filter((item) => item.impact === "critical" || item.impact === "serious")).toEqual([]);
});
