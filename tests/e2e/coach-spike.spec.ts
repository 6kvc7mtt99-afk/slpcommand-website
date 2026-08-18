import { expect, test } from "@playwright/test";
import { E2E_BASE_URL } from "./baseUrl";

test("unauthenticated spike redirects to login", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/spike/coach");
  await expect(page).toHaveURL(/\/login/);
  await context.close();
});

test("authenticated spike is noindex, has no product nav, and never shows a raw token", async ({ page, context }) => {
  const url = E2E_BASE_URL;
  await context.addCookies([
    { name: "slp_at", value: "test-access", url },
    { name: "slp_rt", value: "test-refresh", url },
    { name: "slp_uid", value: "user-1", url },
    { name: "slp_em", value: "learner@example.com", url },
  ]);
  await page.goto("/spike/coach");
  await expect(page.getByRole("heading", { name: "ElevenLabs Web Coach spike" })).toBeVisible({ timeout: 20_000 });
  const robots = await page.locator('meta[name="robots"]').getAttribute("content");
  expect(robots ?? "").toMatch(/noindex/i);
  await expect(page.getByRole("navigation")).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText("spike-fake-token-do-not-render");
  await expect(page.getByRole("button", { name: "2. POST /session + startSession" })).toBeVisible();
  await expect(page.locator("a[href='/speaking/coach']")).toHaveCount(0);
});

test("coach webhook stays gone and session is allowlisted", async ({ request }) => {
  const origin = (E2E_BASE_URL).replace(
    "127.0.0.1",
    "localhost",
  );
  const webhook = await request.post("/api/backend/speaking/coach/webhook", {
    headers: { "X-SLP-Client": "web", Origin: origin },
  });
  expect(webhook.status()).toBe(410);

  const session = await request.post("/api/backend/speaking/coach/session", {
    headers: { "X-SLP-Client": "web", Origin: origin, "Content-Type": "application/json" },
    data: { objective: "Spike only" },
  });
  expect(session.status()).not.toBe(404);
  expect(session.status()).not.toBe(410);
});
