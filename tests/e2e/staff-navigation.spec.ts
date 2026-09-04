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
    // Its accessible name states the ACTION and the state — a bare "Menu" said
    // neither — so it is addressed by that name and the state is asserted.
    const toggle = page.getByRole("button", { name: "Open navigation" });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await toggle.click();
    await expect(page.getByRole("link", { name: "SLP Command Teacher" })).toBeVisible();

    // Below 960px the panel is a real modal drawer, not a static rail.
    const drawer = page.getByRole("dialog", { name: "Workspace navigation" });
    await expect(drawer).toBeVisible();
    await expect(page.getByRole("button", { name: "Close navigation" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    // Focus moves into the drawer on open, so a keyboard user is not left
    // behind it — and Escape closes it and hands focus back to the toggle.
    await expect(drawer.locator(":focus")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await expect(page.getByRole("button", { name: "Open navigation" })).toBeFocused();
  });
});
