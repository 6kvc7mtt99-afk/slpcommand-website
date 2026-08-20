import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { E2E_BASE_URL } from "./baseUrl";

test.beforeEach(async ({ context }) => {
  const url = E2E_BASE_URL;
  await context.addCookies([
    { name: "slp_at", value: "test-access", url },
    { name: "slp_rt", value: "test-refresh", url },
    { name: "slp_uid", value: "user-1", url },
    { name: "slp_em", value: "learner@example.com", url },
  ]);
  await context.addInitScript(() => localStorage.setItem("onboarding_completed:user-1", "1"));
});

test("speaking home has practice and exam but not coach", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (req) => requests.push(req.url()));
  await page.goto("/speaking");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 20_000 });
  // Practice and Exam are each reachable from two places now — the hero CTA
  // and the destination panel — so these assert the panels specifically
  // rather than a bare accessible name that matches both.
  await expect(page.locator('a.p-dest[href="/speaking/practice"]')).toBeVisible();
  await expect(page.locator('a.p-dest[href="/speaking/exam"]')).toBeVisible();
  await expect(page.getByRole("link", { name: "Start practice", exact: true })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("ElevenLabs");
  expect(requests.some((url) => url.includes("/speaking/coach"))).toBe(false);
});

test("microphone permission failure is explained", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("speaking_ai_consent_given:user-1", "1");
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: async () => {
          throw new Error("Permission denied");
        },
      },
    });
  });
  await page.goto("/speaking/practice");
  await expect(page.getByRole("button", { name: "Start recording" })).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Start recording" }).click();
  await expect(page.locator("p.err")).toContainText("Microphone permission was denied");
});

test("speaking practice has no serious axe violations", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("speaking_ai_consent_given:user-1", "1"));
  await page.goto("/speaking/practice");
  const results = await new AxeBuilder({ page }).disableRules(["color-contrast"]).analyze();
  expect(results.violations.filter((item) => item.impact === "critical" || item.impact === "serious")).toEqual([]);
});
