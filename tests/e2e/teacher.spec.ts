// FASE TEACHER-WEB-001 — SLP Command Teacher, rendered for real against the
// E2E mock backend (one fake organization, one fake student — never
// production data). Covers B13 (accessibility, real rendering) and the
// adversarial case the mandate names by name: a student must never see the
// Teacher shell.

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type BrowserContext } from "@playwright/test";
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

  test("the Academy dashboard leads with what needs doing, and names the organization", async ({ page }) => {
    // PLATFORM-ACADEMY-001 renamed this from "Overview" to "Academy" and
    // reordered it around the question an owner actually asks first. The
    // assertion follows the product, and now checks the ORDER too: attention
    // before vanity metrics is the whole point of the redesign.
    await page.goto(`/teacher/${ORG}`);
    await expect(page.getByText("SLP Command E2E Academy")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Academy", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Needs attention" })).toBeVisible();

    const headings = await page.getByRole("heading", { level: 2 }).allTextContents();
    expect(headings[0], "attention must come first — it is the actionable section").toBe("Needs attention");
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

  test("Groups page lists an existing group and creates a new one", async ({ page }) => {
    await page.goto(`/teacher/${ORG}/groups`);
    await expect(page.getByText("Morning cohort")).toBeVisible();
    await page.getByLabel("New group name").fill("E2E Evening Cohort");
    await page.getByRole("button", { name: "Create group" }).click();
    await expect(page.getByText("E2E Evening Cohort")).toBeVisible();
  });

  test("the roster's group filter links to a filtered view", async ({ page }) => {
    await page.goto(`/teacher/${ORG}/groups`);
    await page.getByText("Morning cohort").click();
    await expect(page).toHaveURL(/\/students\?groupId=group-1$/);
  });

  test("Invites page creates a one-time invitation link", async ({ page }) => {
    await page.goto(`/teacher/${ORG}/invites`);
    await page.getByRole("button", { name: "Create invitation link" }).click();
    await expect(page.getByText(/\/invite\/accept\?token=/)).toBeVisible();
  });

  test("Teacher pages have no serious axe violations", async ({ page }) => {
    for (const path of [
      `/teacher/${ORG}`, `/teacher/${ORG}/students`, `/teacher/${ORG}/students/${STUDENT}`,
      `/teacher/${ORG}/groups`, `/teacher/${ORG}/invites`, `/teacher/${ORG}/alerts`,
    ]) {
      await page.goto(path);
      const result = await new AxeBuilder({ page }).disableRules(["color-contrast"]).analyze();
      const serious = result.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
      expect(serious.map((v) => `${path}: ${v.id}`), path).toEqual([]);
    }
  });

  // Found by an ad hoc mobile-viewport check while auditing this pass's own
  // work: the roster's new Group column pushed a 5-column table wider than a
  // phone viewport with no scroll container, forcing the WHOLE PAGE to
  // scroll horizontally (measured: documentElement.scrollWidth 408 vs a
  // 375px viewport). Fixed by wrapping every `.teacher-table` in
  // `.teacher-table-scroll` (app/teacher.css) — this pins that fix down so a
  // future added column can't silently reintroduce it.
  test("no Teacher page forces the whole document to scroll horizontally on a phone viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    for (const path of [
      `/teacher/${ORG}`, `/teacher/${ORG}/students`, `/teacher/${ORG}/students/${STUDENT}`,
      `/teacher/${ORG}/groups`, `/teacher/${ORG}/invites`, `/teacher/${ORG}/alerts`,
    ]) {
      await page.goto(path);
      const [scrollWidth, clientWidth] = await page.evaluate(() => [
        document.documentElement.scrollWidth,
        document.documentElement.clientWidth,
      ]);
      expect(scrollWidth, path).toBeLessThanOrEqual(clientWidth);
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

// FASE TEACHER-GROUPS-001 — /invite/accept is deliberately OUTSIDE /teacher/*
// (the person opening it is not staff, often not even a member of anything
// yet), so it gets its own describe block rather than reusing teacherCookies.
test.describe("Invite acceptance — the public, non-staff flow", () => {
  const studentCookies = [
    { name: "slp_at", value: "test-access", url: E2E_BASE_URL },
    { name: "slp_rt", value: "test-refresh", url: E2E_BASE_URL },
    { name: "slp_uid", value: "student-invited", url: E2E_BASE_URL },
    { name: "slp_em", value: "invited@example.com", url: E2E_BASE_URL },
  ];

  async function createRealInvite(context: BrowserContext): Promise<string> {
    await context.addCookies(teacherCookies);
    const origin = E2E_BASE_URL.replace("127.0.0.1", "localhost");
    const res = await context.request.post(
      `${E2E_BASE_URL}/api/backend/api/teacher/organizations/${ORG}/invites`,
      { headers: { Origin: origin, "X-SLP-Client": "web" }, data: { role: "student" } },
    );
    if (!res.ok()) {
      throw new Error(`createRealInvite failed: ${res.status()} ${await res.text()}`);
    }
    const body = (await res.json()) as { invite: { token: string } };
    await context.clearCookies();
    return body.invite.token;
  }

  test("a signed-in invitee can accept a real invitation, and lands back at /teacher", async ({ context, page }) => {
    const token = await createRealInvite(context);
    await context.addCookies(studentCookies);
    await context.addInitScript(() => localStorage.setItem("onboarding_completed:student-invited", "1"));
    await page.goto(`/invite/accept?token=${token}`);
    await page.getByRole("button", { name: "Accept invitation" }).click();
    await expect(page.getByText(/joined the organization/i)).toBeVisible();
    await expect(page).toHaveURL(/\/(teacher|dashboard)/, { timeout: 5000 });
  });

  test("a fabricated token is rejected with a vague, non-enumerating error", async ({ context, page }) => {
    await context.addCookies(studentCookies);
    await page.goto(`/invite/accept?token=${"0".repeat(64)}`);
    await page.getByRole("button", { name: "Accept invitation" }).click();
    await expect(page.getByText(/invalid or has expired/i)).toBeVisible();
  });

  test("the same token cannot be redeemed twice", async ({ context, page }) => {
    const token = await createRealInvite(context);
    await context.addCookies(studentCookies);
    await page.goto(`/invite/accept?token=${token}`);
    await page.getByRole("button", { name: "Accept invitation" }).click();
    await expect(page.getByText(/joined the organization/i)).toBeVisible();

    await page.goto(`/invite/accept?token=${token}`);
    await page.getByRole("button", { name: "Accept invitation" }).click();
    await expect(page.getByText(/invalid or has expired/i)).toBeVisible();
  });

  test("without a session, the page asks the invitee to sign in first — no accept button", async ({ page }) => {
    await page.goto(`/invite/accept?token=${"a".repeat(64)}`);
    await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Accept invitation" })).toHaveCount(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// FASE PLATFORM-ENTERPRISE-001 — the administration sections.
//
// Two staff fixtures against the SAME organization, because the point of the
// permission layer is that they see different things. A test with only one
// role could not tell a working gate from an absent one.
// ═══════════════════════════════════════════════════════════════════════════

const ownerCookies = [
  { name: "slp_at", value: "test-access-owner", url: E2E_BASE_URL },
  { name: "slp_rt", value: "test-refresh", url: E2E_BASE_URL },
  { name: "slp_uid", value: "teacher-1", url: E2E_BASE_URL },
  { name: "slp_em", value: "owner@example.com", url: E2E_BASE_URL },
];

test.describe("Enterprise administration — an owner", () => {
  test.beforeEach(async ({ context }) => {
    await context.addCookies(ownerCookies);
  });

  test("the sidebar offers the administration sections", async ({ page }) => {
    await page.goto(`/teacher/${ORG}`);
    const admin = page.getByRole("navigation", { name: "Administration" });
    await expect(admin.getByRole("link", { name: "People" })).toBeVisible();
    await expect(admin.getByRole("link", { name: "Organization" })).toBeVisible();
    await expect(admin.getByRole("link", { name: "Security" })).toBeVisible();
  });

  test("People lists real members with their real roles", async ({ page }) => {
    await page.goto(`/teacher/${ORG}/members`);
    await expect(page.getByRole("heading", { name: "People" })).toBeVisible();
    // getByRole("cell"), not getByText: the role <select> carries a
    // visually-hidden label naming the same person, so a text match is
    // ambiguous by design rather than by accident.
    await expect(page.getByRole("cell", { name: "E2E Student", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "owner@example.com" })).toBeVisible();
  });

  test("Organization shows the tenant address as read-only, and says who assigns it", async ({ page }) => {
    await page.goto(`/teacher/${ORG}/settings`);
    await expect(page.getByText("e2e-academy.slpcommand.com")).toBeVisible();
    await expect(page.getByText(/addresses are assigned by us/)).toBeVisible();
  });

  test("a feature override is labelled as the organization's own, not as the default", async ({ page }) => {
    await page.goto(`/teacher/${ORG}/settings`);
    const row = page.getByRole("row", { name: /Speaking/ });
    await expect(row.getByText("This organization")).toBeVisible();
  });

  test("Reports shows counted totals and never a fabricated percentage", async ({ page }) => {
    await page.goto(`/teacher/${ORG}/reports`);
    await expect(page.getByRole("heading", { name: "Reports" })).toBeVisible();
    await expect(page.getByText("Never started")).toBeVisible();
    // The mandate's own example of what must never appear.
    await expect(page.locator("body")).not.toContainText("% engagement");
  });

  test("Security shows the audit trail", async ({ page }) => {
    await page.goto(`/teacher/${ORG}/audit`);
    await expect(page.getByRole("heading", { name: "Security" })).toBeVisible();
    await expect(page.getByText("changed a member's role")).toBeVisible();
    await expect(page.getByText("student → teacher")).toBeVisible();
  });

  test("the administration pages have no serious axe violations", async ({ page }) => {
    for (const path of [
      `/teacher/${ORG}/members`, `/teacher/${ORG}/settings`,
      `/teacher/${ORG}/reports`, `/teacher/${ORG}/audit`,
    ]) {
      await page.goto(path);
      const result = await new AxeBuilder({ page }).analyze();
      const serious = result.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
      expect(serious, `${path}: ${serious.map((v) => v.id).join(", ")}`).toEqual([]);
    }
  });

  test("no administration page forces the document to scroll sideways on a phone", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    for (const path of [
      `/teacher/${ORG}/members`, `/teacher/${ORG}/settings`,
      `/teacher/${ORG}/reports`, `/teacher/${ORG}/audit`,
    ]) {
      await page.goto(path);
      const overflow = await page.evaluate(() =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${path} overflows by ${overflow}px`).toBeLessThanOrEqual(0);
    }
  });
});

test.describe("Enterprise administration — a teacher of the same organization", () => {
  test.beforeEach(async ({ context }) => {
    await context.addCookies(teacherCookies);
  });

  test("is not offered Security in the sidebar", async ({ page }) => {
    await page.goto(`/teacher/${ORG}`);
    const admin = page.getByRole("navigation", { name: "Administration" });
    await expect(admin.getByRole("link", { name: "People" })).toBeVisible();
    await expect(admin.getByRole("link", { name: "Security" })).toHaveCount(0);
  });

  test("typing the Security URL gets a 404, not a screen of forbidden controls", async ({ page }) => {
    const res = await page.goto(`/teacher/${ORG}/audit`);
    expect(res?.status()).toBe(404);
  });

  test("still reaches People, because a teacher may read the roster", async ({ page }) => {
    await page.goto(`/teacher/${ORG}/members`);
    await expect(page.getByRole("heading", { name: "People" })).toBeVisible();
  });

  test("sees People WITHOUT the role controls an admin gets", async ({ page }) => {
    await page.goto(`/teacher/${ORG}/members`);
    // Scoped to the MEMBERS table specifically. The invitations table below it
    // has its own "Actions" column, and a teacher legitimately sees that one —
    // they hold members.invite but not members.manage. An unscoped assertion
    // here would have been testing the wrong table.
    const membersTable = page.getByRole("table", { name: /active membership/ });
    await expect(membersTable.getByRole("columnheader", { name: "Actions" })).toHaveCount(0);
    await expect(membersTable.getByRole("combobox")).toHaveCount(0);
    await expect(membersTable.getByRole("button", { name: "Remove" })).toHaveCount(0);
  });
});
