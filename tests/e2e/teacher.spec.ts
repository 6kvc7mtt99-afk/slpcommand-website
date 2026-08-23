// FASE TEACHER-WEB-001 — SLP Command Teacher, rendered for real against the
// E2E mock backend (one fake organization, one fake student — never
// production data). Covers B13 (accessibility, real rendering) and the
// adversarial case the mandate names by name: a student must never see the
// Teacher shell.

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { E2E_BASE_URL } from "./baseUrl";

const ORG = "org-e2e";
const STUDENT = "student-e2e";

// "test-access-teacher" is the one token the mock backend recognises as
// having a real membership (see tests/e2e/mock-backend.mjs) — distinct from
// every other fixture's plain "test-access", so a student's session
// genuinely cannot be mistaken for a teacher's by the mock.
const teacherCookies = [
  { name: "slp_at", value: "test-access-teacher", url: E2E_BASE_URL },
  { name: "slp_rt", value: "test-refresh", url: E2E_BASE_URL },
  { name: "slp_uid", value: "teacher-1", url: E2E_BASE_URL },
  { name: "slp_em", value: "teacher@example.com", url: E2E_BASE_URL },
];

test.describe("Teacher — rendered pages", () => {
  test.beforeEach(async ({ context }) => {
    await context.addCookies(teacherCookies);
  });

  test("the org picker redirects straight to the only real organization", async ({ page }) => {
    await page.goto("/teacher");
    await expect(page).toHaveURL(new RegExp(`/teacher/${ORG}$`));
  });

  test("dashboard shows real counts and the shell names the organization", async ({ page }) => {
    await page.goto(`/teacher/${ORG}`);
    await expect(page.getByText("SLP Command E2E Academy")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  });

  test("roster lists the real student and links to Student 360", async ({ page }) => {
    await page.goto(`/teacher/${ORG}/students`);
    const link = page.getByRole("link", { name: STUDENT });
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(new RegExp(`/students/${STUDENT}$`));
  });

  test("Student 360 shows WHAT/WHY/WHAT-NEXT as three distinct fields, and Speaking's DATA LIMITED notice", async ({ page }) => {
    await page.goto(`/teacher/${ORG}/students/${STUDENT}`);
    await expect(page.getByText("Observed")).toBeVisible();
    await expect(page.getByText("Calculated")).toBeVisible();
    await expect(page.getByText("Recommended")).toBeVisible();
    await expect(page.getByText(/DATA LIMITED/)).toBeVisible();
  });

  test("a fabricated organizationId in the URL renders 404, not another org's shell", async ({ page }) => {
    const res = await page.goto("/teacher/org-that-does-not-exist");
    expect(res?.status()).toBe(404);
  });

  test("a fabricated studentId in the URL renders 404, not another student's data", async ({ page }) => {
    const res = await page.goto(`/teacher/${ORG}/students/someone-elses-student`);
    expect(res?.status()).toBe(404);
  });

  test("Teacher pages have no serious axe violations", async ({ page }) => {
    for (const path of [`/teacher/${ORG}`, `/teacher/${ORG}/students`, `/teacher/${ORG}/students/${STUDENT}`, `/teacher/${ORG}/alerts`]) {
      await page.goto(path);
      const result = await new AxeBuilder({ page }).disableRules(["color-contrast"]).analyze();
      const serious = result.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
      expect(serious.map((v) => `${path}: ${v.id}`), path).toEqual([]);
    }
  });
});

test.describe("Teacher — a student must never see it", () => {
  test("a real, authenticated STUDENT session hitting /teacher is sent to their own Home, not shown a Teacher shell", async ({ context, page }) => {
    // Uses the plain "test-access" token, which the mock backend does NOT
    // recognise as the teacher fixture — GET /api/teacher/me genuinely
    // returns zero memberships for this caller, the same shape a real
    // never-added-to-any-organization learner would get.
    await context.addCookies([
      { name: "slp_at", value: "test-access", url: E2E_BASE_URL },
      { name: "slp_rt", value: "test-refresh", url: E2E_BASE_URL },
      { name: "slp_uid", value: "student-1", url: E2E_BASE_URL },
      { name: "slp_em", value: "learner@example.com", url: E2E_BASE_URL },
    ]);
    // Matches the same convention as tests/e2e/academy.spec.ts — without it,
    // AppGate's own (unrelated, correct, pre-existing) onboarding check sends
    // a fresh fixture user to /onboarding instead of /dashboard, which would
    // make this test about onboarding instead of about Teacher access.
    await context.addInitScript(() => localStorage.setItem("onboarding_completed:student-1", "1"));
    await page.goto("/teacher");
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.locator(".teacher-shell")).toHaveCount(0);
  });

  test("no session at all → /login, not the Teacher shell", async ({ page }) => {
    await page.goto("/teacher");
    await expect(page).toHaveURL(/\/login$/);
  });
});
