// TEACHER-UX-POLISH-001 — Finding #2: a learner had no clear feedback after
// signup ("did it work? do I need to check my email?") and clicking the
// real Supabase confirmation link landed nowhere useful. These cover the
// states this pass actually changed: the signup step-5 banner, the
// /auth/confirmed success path (session tokens arrive in a URL fragment,
// which app/auth/confirmed/page.tsx + ConfirmedClient.tsx handle
// client-side — no backend involved, so no mock route is needed here),
// the error-state path (Supabase's own query-param error shape), and the
// login page now distinguishing "email not confirmed" from a wrong password.

import { expect, test } from "@playwright/test";

// A structurally-valid (but unsigned) JWT: three base64url segments. Nothing
// in this flow verifies the signature — see ConfirmedClient.tsx's own
// comment on why that is fine (the backend independently verifies any token
// on every real request that follows).
function fakeJwt(sub: string, email: string): string {
  const b64url = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj)).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${b64url({ alg: "none", typ: "JWT" })}.${b64url({ sub, email })}.fake-signature`;
}

test.describe("signup feedback", () => {
  test("signup success with confirmation pending shows a clear, distinct banner", async ({ page }) => {
    await page.route("**/api/auth/register", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ userId: "u1", email: "new@example.com", needsEmailConfirmation: true }),
      });
    });
    await page.goto("/signup");
    await page.getByLabel("Email").fill("new@example.com");
    await page.getByLabel("Password").fill("correcthorsebattery");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByLabel("First name").fill("New");
    await page.getByLabel("Last name").fill("Learner");
    await page.getByLabel("Country").fill("Spain");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByLabel(/16 or older/).check();
    await page.getByRole("button", { name: "Create account" }).click();

    const banner = page.locator(".feedback-banner.info");
    await expect(banner).toBeVisible();
    await expect(banner).toContainText("Account created");
    await expect(banner).toContainText(/check your inbox/i);
  });
});

test.describe("email confirmation landing", () => {
  test("a real confirmation redirect (tokens in the URL fragment) confirms and sets a real session", async ({ page, context }) => {
    const token = fakeJwt("22222222-2222-2222-2222-222222222222", "confirmed@example.com");
    await page.goto(`/auth/confirmed#access_token=${token}&refresh_token=rt-1&expires_in=3600&token_type=bearer&type=signup`);
    await expect(page.getByText("Email confirmed.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Continue to your dashboard" })).toBeVisible();
    // The token pair must not linger in the visible URL/history.
    await expect(page).toHaveURL(/\/auth\/confirmed$/);

    const cookies = await context.cookies();
    expect(cookies.some((c) => c.name === "slp_at" && c.value === token)).toBe(true);
    expect(cookies.some((c) => c.name === "slp_rt" && c.value === "rt-1")).toBe(true);
  });

  test("an invalid or expired confirmation link shows a clear error, not a silent failure", async ({ page }) => {
    await page.goto("/auth/confirmed?error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired");
    await expect(page.locator(".feedback-banner.bad")).toContainText(/invalid or has expired/i);
    await expect(page.getByRole("link", { name: "try logging in" })).toBeVisible();
  });

  test("visiting with no token and no error shows a neutral state, never a false success", async ({ page }) => {
    await page.goto("/auth/confirmed");
    await expect(page.getByText("No confirmation is pending in this tab.")).toBeVisible();
    await expect(page.getByText("Email confirmed.")).toHaveCount(0);
  });
});

test.describe("login distinguishes unconfirmed email from a wrong password", () => {
  test("an unconfirmed-email login failure gets its own clear message", async ({ page }) => {
    await page.route("**/api/auth/login", async (route) => {
      await route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ error: "Email not confirmed" }) });
    });
    await page.goto("/login");
    await page.getByLabel("Email").fill("unconfirmed@example.com");
    await page.getByLabel("Password").fill("whatever123");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page.getByText(/confirm your email/i)).toBeVisible();
    await expect(page.getByText("Incorrect email or password.")).toHaveCount(0);
  });

  test("a genuinely wrong password still shows the generic message, not a false confirmation prompt", async ({ page }) => {
    await page.route("**/api/auth/login", async (route) => {
      await route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ error: "Invalid login credentials" }) });
    });
    await page.goto("/login");
    await page.getByLabel("Email").fill("real@example.com");
    await page.getByLabel("Password").fill("wrongpassword");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page.getByText("Incorrect email or password.")).toBeVisible();
  });
});
