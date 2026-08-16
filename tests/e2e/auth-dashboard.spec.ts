import { expect, test } from "@playwright/test";

const mock = process.env.MOCK_BACKEND === "1";

test.describe("authenticated dashboard", () => {
  test.skip(!mock, "Requires MOCK_BACKEND=1 and the local mock Express.");

  test.beforeEach(async ({ context }) => {
    await context.addCookies([
      { name: "slp_at", value: "test-access", url: "http://127.0.0.1:3000" },
      { name: "slp_rt", value: "test-refresh", url: "http://127.0.0.1:3000" },
      { name: "slp_uid", value: "user-1", url: "http://127.0.0.1:3000" },
      { name: "slp_em", value: "learner@example.com", url: "http://127.0.0.1:3000" },
    ]);
  });

  test("home v2 renders backend fields and hides passProbability", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("onboarding_completed:user-1", "1"));
    await page.goto("/dashboard");
    await expect(page.locator("body")).toContainText("Recover listening");
    await expect(page.locator("body")).not.toContainText("0.72");
    await expect(page.locator("body")).not.toContainText("72%");
  });

  test("reading practice is one question", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("onboarding_completed:user-1", "1"));
    await page.goto("/reading/practice");
    await expect(page.getByText("Where should they report?")).toBeVisible();
    await expect(page.getByText("Question 1 of 1")).toBeVisible();
    await expect(page.locator("body")).not.toContainText("Question 1 of 4");
  });
});
