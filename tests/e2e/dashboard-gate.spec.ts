import { expect, test } from "@playwright/test";

test("document GET /dashboard is a login redirect, not 400", async ({ request }) => {
  const res = await request.get("/dashboard", { maxRedirects: 0 });
  expect(res.status()).toBe(307);
  expect(res.headers().location).toBe("/login");
});

test("anonymous dashboard visit lands on login", async ({ page }) => {
  const res = await page.goto("/dashboard");
  expect(res?.ok()).toBeTruthy();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator("h1")).toContainText("Log in");
});

test("login form shows credential copy and does not invent a dashboard", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("nobody@example.com");
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.locator("p.err")).toContainText("Incorrect email or password.");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator("body")).not.toContainText("passProbability");
  await expect(page.locator("body")).not.toContainText("Today’s mission");
});

test("app skill routes are gated and login stays usable on a phone viewport", async ({ page }) => {
  const reading = await page.request.get("/reading", { maxRedirects: 0 });
  expect(reading.status()).toBe(307);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
});
