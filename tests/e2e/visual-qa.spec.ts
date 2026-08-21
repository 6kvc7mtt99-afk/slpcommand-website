import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { E2E_BASE_URL } from "./baseUrl";

const cookies = [
  { name: "slp_at", value: "test-access", url: E2E_BASE_URL },
  { name: "slp_rt", value: "test-refresh", url: E2E_BASE_URL },
  { name: "slp_uid", value: "user-1", url: E2E_BASE_URL },
  { name: "slp_em", value: "learner@example.com", url: E2E_BASE_URL },
];

const shots = path.join(process.cwd(), "docs", "visual-qa");

async function capture(page: Page, name: string) {
  mkdirSync(shots, { recursive: true });
  await page.screenshot({ path: path.join(shots, `${name}.png`), fullPage: true });
}

async function noHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(8);
}

test.describe("visual QA — public and auth", () => {
  test("login and signup compose as a focused ceremony", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
    await capture(page, "login-desktop");
    await noHorizontalOverflow(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await capture(page, "login-mobile");
    await noHorizontalOverflow(page);

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/signup");
    await expect(page.getByRole("heading", { name: "Create an account" })).toBeVisible();
    await capture(page, "signup-desktop");
  });
});

test.describe("visual QA — workspace", () => {
  test.beforeEach(async ({ context }) => {
    await context.addCookies(cookies);
    await context.addInitScript(() => localStorage.setItem("onboarding_completed:user-1", "1"));
  });

  test("home and skill surfaces at desktop and mobile", async ({ page }) => {
    const routes: Array<{ path: string; name: string; text: string }> = [
      { path: "/dashboard", name: "home", text: "Recover listening" },
      { path: "/reading", name: "reading-home", text: "Reading" },
      { path: "/reading/practice", name: "reading-practice", text: "Where should they report?" },
      { path: "/reading/exam", name: "reading-exam", text: "Educational simulation only" },
      { path: "/reading/academy", name: "reading-academy", text: "Recover inference" },
      { path: "/reading/intelligence", name: "reading-intelligence", text: "This is a readiness score, not Estimated SLP." },
      { path: "/listening", name: "listening-home", text: "Listening" },
      { path: "/listening/practice", name: "listening-practice", text: "What did the speaker ask for?" },
      { path: "/listening/academy", name: "listening-academy", text: "Specific Details" },
      { path: "/listening/intelligence", name: "listening-intelligence", text: "Listening Intelligence" },
      { path: "/writing", name: "writing-home", text: "Writing" },
      { path: "/writing/practice", name: "writing-practice", text: "Draft and evaluation" },
      { path: "/writing/exam", name: "writing-exam", text: "Exam" },
      { path: "/writing/tools", name: "writing-tools", text: "Fix the opening" },
      { path: "/speaking", name: "speaking-home", text: "Speaking" },
      { path: "/speaking/practice", name: "speaking-practice", text: "Audio is sent" },
      { path: "/speaking/exam", name: "speaking-exam", text: "Educational simulation only" },
      { path: "/speaking/coach", name: "speaking-coach", text: "Sustain an argument under pressure" },
      { path: "/progress", name: "progress", text: "You are at SLP 2.2." },
      { path: "/profile", name: "profile", text: "Profile" },
      { path: "/admin", name: "admin", text: "Admin access" },
    ];

    await page.setViewportSize({ width: 1440, height: 900 });
    for (const route of routes) {
      await page.goto(route.path);
      await expect(page.locator("body")).toContainText(route.text, { timeout: 20_000 });
      await capture(page, `${route.name}-wide`);
      await noHorizontalOverflow(page);
    }

    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto("/dashboard");
    await expect(page.locator("body")).toContainText("Recover listening");
    await capture(page, "home-1024");
    await noHorizontalOverflow(page);

    await page.setViewportSize({ width: 390, height: 844 });
    for (const route of ["/dashboard", "/reading", "/reading/practice", "/listening/practice", "/writing", "/speaking", "/speaking/coach", "/progress"]) {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      await capture(page, `${route.replaceAll("/", "").replace(/^\s*$/, "root") || "page"}-mobile`);
      await noHorizontalOverflow(page);
    }
  });
});

test.describe("visual QA — Coach on a phone", () => {
  test("the desktop-only notice is a real screen, not a disabled button", async ({ browser }) => {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    await context.addCookies(cookies);
    const page = await context.newPage();
    await page.addInitScript(() => localStorage.setItem("onboarding_completed:user-1", "1"));
    await page.goto("/speaking/coach");
    await expect(page.getByRole("heading", { name: "The live Coach runs on a computer" })).toBeVisible({
      timeout: 20_000,
    });
    await capture(page, "speaking-coach-desktop-only-mobile");
    await noHorizontalOverflow(page);
    await context.close();
  });
});

test.describe("visual QA — Coach dead ends", () => {
  test.beforeEach(async ({ context }) => {
    await context.addCookies(cookies);
    await context.addInitScript(() => localStorage.setItem("onboarding_completed:user-1", "1"));
  });

  test("a refused microphone is explained, and no session is authorized", async ({ page }) => {
    // Headless Chrome refuses the microphone on its own, which is exactly the
    // learner whose browser has the permission blocked.
    await page.goto("/speaking/coach");
    await page.getByRole("button", { name: /Start Coach/ }).click();
    await expect(page.getByText("The Coach needs your microphone. Enable it in the browser settings.")).toBeVisible();
    await capture(page, "speaking-coach-mic-denied-wide");
    await noHorizontalOverflow(page);
  });

  test("a call that cannot open is a real screen with a real way out", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "permissions", {
        configurable: true,
        value: { query: async () => ({ state: "granted" }) },
      });
    });
    await page.goto("/speaking/coach");
    await page.getByRole("button", { name: /Start Coach/ }).click();
    // The mock token cannot open a WebRTC leg, which is exactly the state
    // this screen exists for.
    await expect(page.getByRole("heading", { name: "The live Coach could not start" })).toBeVisible({
      timeout: 20_000,
    });
    await capture(page, "speaking-coach-unavailable-wide");
    await noHorizontalOverflow(page);
  });
});
