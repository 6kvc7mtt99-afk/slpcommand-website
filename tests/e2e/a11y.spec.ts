import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("login and a legal page have no serious axe violations", async ({ page }) => {
  await page.goto("/login");
  const login = await new AxeBuilder({ page }).disableRules(["color-contrast"]).analyze();
  expect(login.violations.filter((item) => item.impact === "critical" || item.impact === "serious")).toEqual([]);

  await page.goto("/privacy");
  const privacy = await new AxeBuilder({ page }).disableRules(["color-contrast", "link-in-text-block"]).analyze();
  expect(privacy.violations.filter((item) => item.impact === "critical" || item.impact === "serious")).toEqual([]);
});
