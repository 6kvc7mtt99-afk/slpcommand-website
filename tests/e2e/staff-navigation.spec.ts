// TEACHER-UX-POLISH-001 — Finding #1: a staff member had valid access to
// /teacher but no visible, discoverable way into it from the normal app
// shell. Visibility is resolved server-side via the same
// loadTeacherMemberships()/hasTeacherAccess() the Teacher layout itself
// uses (see app/(app)/layout.tsx) — this suite only proves the LINK shows
// or hides correctly; /teacher/* staying protected on its own is already
// covered by tests/e2e/teacher.spec.ts and is not re-tested here.

import { expect, test } from "@playwright/test";
import { E2E_BASE_URL } from "./baseUrl";

const STUDENT_COOKIES = [
  { name: "slp_at", value: "test-access", url: E2E_BASE_URL },
  { name: "slp_rt", value: "test-refresh", url: E2E_BASE_URL },
  { name: "slp_uid", value: "student-nav-1", url: E2E_BASE_URL },
  { name: "slp_em", value: "learner@example.com", url: E2E_BASE_URL },
];

const TEACHER_COOKIES = [
  { name: "slp_at", value: "test-access-teacher", url: E2E_BASE_URL },
  { name: "slp_rt", value: "test-refresh", url: E2E_BASE_URL },
  { name: "slp_uid", value: "teacher-nav-1", url: E2E_BASE_URL },
  { name: "slp_em", value: "teacher@example.com", url: E2E_BASE_URL },
];

test.describe("staff navigation link", () => {
  test("a plain student never sees the Teacher link, on desktop or mobile", async ({ context, page }) => {
    await context.addCookies(STUDENT_COOKIES);
    await context.addInitScript(() => localStorage.setItem("onboarding_completed:student-nav-1", "1"));
    await page.goto("/dashboard");
    await expect(page.getByRole("link", { name: "SLP Command Teacher" })).toHaveCount(0);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dashboard");
    await expect(page.getByRole("link", { name: "SLP Command Teacher" })).toHaveCount(0);
  });

  test("a real staff member sees the Teacher link and it leads to the Teacher shell", async ({ context, page }) => {
    await context.addCookies(TEACHER_COOKIES);
    await context.addInitScript(() => localStorage.setItem("onboarding_completed:teacher-nav-1", "1"));
    await page.goto("/dashboard");
    const link = page.getByRole("link", { name: "SLP Command Teacher" });
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/\/teacher\/org-e2e$/);
  });

  test("the link is reachable and visible on mobile for a real staff member", async ({ context, page }) => {
    await context.addCookies(TEACHER_COOKIES);
    await context.addInitScript(() => localStorage.setItem("onboarding_completed:teacher-nav-1", "1"));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dashboard");
    // The mobile nav lives behind the menu toggle button (see AppShell.tsx).
    await page.getByRole("button", { name: "Menu" }).click();
    await expect(page.getByRole("link", { name: "SLP Command Teacher" })).toBeVisible();
  });
});
