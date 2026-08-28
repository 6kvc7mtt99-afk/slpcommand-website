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

  test("roster lists the student BY NAME and links to Student 360", async ({ page }) => {
    // PLATFORM-GROUPS-001 changed what this asserts, and the change is the
    // point: the roster used to render the raw studentId, so this test looked
    // for a link named "student-e2e" — a UUID in production. It now resolves
    // real identity through the same accessor /members uses, so the link is
    // the person's name and the id stays in the href where it belongs.
    await page.goto(`/teacher/${ORG}/students`);
    const link = page.getByRole("link", { name: "E2E Student" });
    await expect(link).toBeVisible();
    await expect(page.getByRole("cell", { name: STUDENT })).toHaveCount(0);
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

  test("Alerts names the student rather than printing their id", async ({ page }) => {
    // PLATFORM-GROUPS-001 — Alerts is a student roster too, and it printed the
    // raw studentId until the roster query started resolving identity.
    await page.goto(`/teacher/${ORG}/alerts`);
    await expect(page.getByRole("link", { name: "E2E Student" })).toBeVisible();
    await expect(page.getByRole("cell", { name: STUDENT })).toHaveCount(0);
  });

  test("Groups page lists an existing group and creates a new one", async ({ page }) => {
    await page.goto(`/teacher/${ORG}/groups`);
    await expect(page.getByText("Morning cohort")).toBeVisible();
    await page.getByLabel("New group name").fill("E2E Evening Cohort");
    await page.getByRole("button", { name: "Create group" }).click();
    await expect(page.getByText("E2E Evening Cohort")).toBeVisible();
  });

  test("a group card opens that group's DETAIL page", async ({ page }) => {
    // PLATFORM-GROUPS-001 changed this: a group used to jump to the filtered
    // roster, which could never show the things that belong to the group
    // rather than to a list of students — its name, its rename control, its
    // own membership count.
    await page.goto(`/teacher/${ORG}/groups`);
    await page.getByText("Morning cohort").click();
    await expect(page).toHaveURL(new RegExp(`/teacher/${ORG}/groups/group-1$`));
    await expect(page.getByRole("heading", { name: "Morning cohort" })).toBeVisible();
  });

  test("the roster's group filter still filters server-side", async ({ page }) => {
    // The filtered roster did not go away — it is reached from the roster's
    // own filter bar, which is where a filter belongs.
    await page.goto(`/teacher/${ORG}/students`);
    await page.getByRole("link", { name: "Morning cohort" }).click();
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
    await expect(membersTable.getByRole("button", { name: "Remove" })).toHaveCount(0);

    // PLATFORM-GROUPS-001 sharpened this. It used to assert "no comboboxes at
    // all", using that as a proxy for "no role controls" — which stopped being
    // equivalent the moment a teacher gained a GROUP selector. A teacher holds
    // groups.write but NOT members.manage, so the correct expectation is one
    // selector per row for the group and none for the role. Keeping the old
    // blanket assertion would have meant deleting a real feature to satisfy a
    // proxy.
    await expect(membersTable.getByLabel(/^Role for /)).toHaveCount(0);
    await expect(membersTable.getByLabel("Group for E2E Student")).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// FASE PLATFORM-GROUPS-001 — the cohort workflow, end to end.
//
// These run against the mock's real, mutable membership map: an assignment
// made by one request is visible to the next. That matters, because a fixture
// that accepted the PATCH and then kept answering with the old group would let
// every test below pass while the feature did nothing at all.
//
// They run in order and share state deliberately — a move is only meaningful
// after an assignment, and a removal only after a move.
// ═══════════════════════════════════════════════════════════════════════════

test.describe.serial("Teacher — cohort management", () => {
  test.beforeEach(async ({ context }) => {
    await context.addCookies(teacherCookies);
  });

  test("1 — an unassigned student can be assigned to a group", async ({ page }) => {
    // Start from unassigned, whatever previous specs left behind.
    await page.goto(`/teacher/${ORG}/members`);
    const select = page.getByLabel("Group for E2E Student");
    await select.selectOption("");
    await expect(page.getByText("Saved")).toBeVisible();

    await page.goto(`/teacher/${ORG}/groups`);
    await expect(page.locator(".teacher-group-list").getByText("Unassigned")).toBeVisible();

    await page.goto(`/teacher/${ORG}/members`);
    await page.getByLabel("Group for E2E Student").selectOption("group-1");
    await expect(page.getByText("Saved")).toBeVisible();
  });

  test("2 — they disappear from Unassigned and appear in the group", async ({ page }) => {
    await page.goto(`/teacher/${ORG}/groups`);
    // Scoped to the group cards. "Unassigned" also appears as the selected
    // option inside every group selector on other screens, so an unscoped
    // getByText would match something that has nothing to do with the count.
    // The unassigned CARD is rendered only when the count is above zero, so
    // its absence from this list is the assertion.
    const cards = page.locator(".teacher-group-list");
    await expect(cards.getByText("Unassigned")).toHaveCount(0);
    await expect(cards.getByText("1 student", { exact: true })).toBeVisible();

    await page.goto(`/teacher/${ORG}/groups/group-1`);
    await expect(page.getByRole("link", { name: "E2E Student" })).toBeVisible();
  });

  test("3 — they can be moved from one group to another", async ({ page }) => {
    // Moving somebody OUT of the group whose page you are on removes their row
    // — which also removes the "Saved" note that lived in it. That is correct,
    // and it is a better assertion than "Saved" would have been: the row
    // disappearing proves the refresh really re-queried the server rather than
    // just flashing a success message over stale data.
    await page.goto(`/teacher/${ORG}/groups/group-1`);
    await expect(page.getByRole("link", { name: "E2E Student" })).toBeVisible();
    await page.getByLabel("Group for E2E Student").selectOption("group-2");
    await expect(page.getByText(/Nobody is in this group yet/i)).toBeVisible();
  });

  test("4 — the move is real: gone from the first group, present in the second", async ({ page }) => {
    await page.goto(`/teacher/${ORG}/groups/group-1`);
    await expect(page.getByText(/Nobody is in this group yet/i)).toBeVisible();

    await page.goto(`/teacher/${ORG}/groups/group-2`);
    await expect(page.getByRole("link", { name: "E2E Student" })).toBeVisible();
  });

  test("5 — they can be removed from the group, back to Unassigned", async ({ page }) => {
    // Same shape as the move: unfiling them empties the group they were in.
    await page.goto(`/teacher/${ORG}/groups/group-2`);
    await page.getByLabel("Group for E2E Student").selectOption("");
    await expect(page.getByText(/Nobody is in this group yet/i)).toBeVisible();

    await page.goto(`/teacher/${ORG}/groups`);
    await expect(page.locator(".teacher-group-list").getByText("Unassigned")).toBeVisible();
  });

  test("6 — a group can be renamed", async ({ page }) => {
    await page.goto(`/teacher/${ORG}/groups/group-2`);
    await page.getByLabel("Group name").fill("Late Evening cohort");
    await page.getByRole("button", { name: "Rename group" }).click();
    await expect(page.getByText("Renamed.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Late Evening cohort" })).toBeVisible();
  });

  test("7 — renaming onto an existing name is refused with a usable message", async ({ page }) => {
    // The 409 the rename form has its own copy for. A generic failure here
    // would leave somebody retrying the same name.
    await page.goto(`/teacher/${ORG}/groups/group-2`);
    await page.getByLabel("Group name").fill("Morning cohort");
    await page.getByRole("button", { name: "Rename group" }).click();
    // Scoped to the form. Next.js renders its own route announcer with
    // role="alert", so an unscoped getByRole("alert") is ambiguous on every
    // page in this app.
    await expect(page.locator(".teacher-group-rename").getByRole("alert"))
      .toContainText("A group with this name already exists");
    await expect(page.getByRole("heading", { name: "Late Evening cohort" })).toBeVisible();
  });

  test("8 — an authorized teacher sees the controls", async ({ page }) => {
    await page.goto(`/teacher/${ORG}/members`);
    await expect(page.getByLabel("Group for E2E Student")).toBeVisible();
    await page.goto(`/teacher/${ORG}/groups/group-1`);
    await expect(page.getByRole("button", { name: "Rename group" })).toBeVisible();
  });

  test("9 — the cohort pages have no serious axe violations", async ({ page }) => {
    await page.goto(`/teacher/${ORG}/groups/group-1`);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations.filter((v) => v.impact === "critical" || v.impact === "serious")).toEqual([]);
  });
});

test.describe("Teacher — cohort controls are not reachable without staff access", () => {
  // HONEST SCOPE. Every staff role that can read groups can also write them
  // (owner, admin and teacher all hold groups.write), so "a staff role that
  // sees the page but not the controls" does not exist in the product and
  // cannot be shown here without inventing a role — which would be a fake
  // security model, not a test. What IS real is that a learner gets nothing,
  // and that is what this asserts. The permission table itself is pinned by
  // tests/unit/platformPermissions.test.ts, and the backend refuses
  // independently of anything the browser does (requirePermission on all five
  // group routes, covered in test/platformGroups.test.js).
  test("a learner is redirected away from every cohort surface", async ({ context, page }) => {
    await context.addCookies([
      { name: "slp_at", value: "test-access", url: E2E_BASE_URL },
      { name: "slp_rt", value: "test-refresh", url: E2E_BASE_URL },
      { name: "slp_uid", value: "user-1", url: E2E_BASE_URL },
      { name: "slp_em", value: "learner@example.com", url: E2E_BASE_URL },
    ]);
    for (const path of [`/teacher/${ORG}/groups`, `/teacher/${ORG}/groups/group-1`, `/teacher/${ORG}/members`]) {
      await page.goto(path);
      // Away from /teacher, wherever the learner's own journey sends them —
      // this fixture has not finished onboarding, so it is /onboarding rather
      // than /dashboard. Asserting the specific destination would be testing
      // the onboarding funnel, not the cohort gate; what matters here is that
      // no cohort surface renders.
      await expect(page).not.toHaveURL(/\/teacher\//);
      await expect(page.getByRole("button", { name: "Rename group" })).toHaveCount(0);
      await expect(page.getByLabel(/^Group for /)).toHaveCount(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// FASE PLATFORM-MAIL-001 — invitation delivery, end to end.
//
// Against a FAKE MAIL TRANSPORT in the mock backend. Nothing here can reach a
// real provider — no key, no network — and the mailbox the specs read is an
// in-process array. That is what lets them assert the RECIPIENT, the
// ORGANIZATION and the TOKEN URL rather than only "the button said Sent".
//
// Serial and stateful on purpose: resend is only meaningful after a send, and
// the cooldown is only meaningful after a resend.
// ═══════════════════════════════════════════════════════════════════════════

type MockMessage = { to: string; subject: string; organizationName: string; url: string; token: string };

// The mock backend DIRECTLY, not through the Next proxy. /__mock/* is a
// test-only door and is deliberately absent from the proxy allowlist — which
// is deny-by-default, so routing this through /api/backend would (correctly)
// 404. Reaching the fixture on its own port is the honest way to inspect it
// without opening a hole in the policy the product ships.
const MOCK_BACKEND = "http://127.0.0.1:3999";

async function mailbox(page: import("@playwright/test").Page): Promise<MockMessage[]> {
  const res = await page.request.get(`${MOCK_BACKEND}/__mock/mailbox`);
  return res.ok() ? (await res.json()).messages : [];
}

async function armMailFailure(page: import("@playwright/test").Page, failNext: unknown) {
  await page.request.post(`${MOCK_BACKEND}/__mock/mailbox`, {
    headers: { "Content-Type": "application/json" },
    data: { failNext },
  });
}

test.describe.serial("Teacher — invitation delivery", () => {
  test.beforeEach(async ({ context }) => {
    await context.addCookies(teacherCookies);
  });

  test("1 — a LINK-ONLY invitation still works exactly as before", async ({ page }) => {
    // The pre-D4 flow is a deliberate choice, not a legacy path. Breaking it
    // would break every academy that sends links through its own channel.
    await page.goto(`/teacher/${ORG}/invites`);
    await expect(page.getByRole("button", { name: "Create invitation link" })).toBeVisible();
    await page.getByRole("button", { name: "Create invitation link" }).click();
    await expect(page.getByText(/\/invite\/accept\?token=/)).toBeVisible();
    await expect(page.getByText(/shown only once/i)).toBeVisible();
  });

  test("2 — an EMAIL invitation is sent, and the fake transport received it", async ({ page }) => {
    await page.goto(`/teacher/${ORG}/invites`);
    await page.getByLabel(/Email address/i).fill("newcomer@example.com");
    await expect(page.getByRole("button", { name: "Send invitation" })).toBeVisible();
    await page.getByRole("button", { name: "Send invitation" }).click();
    await expect(page.getByText(/Invitation sent to newcomer@example\.com/)).toBeVisible();

    const messages = await mailbox(page);
    const sent = messages.find((m) => m.to === "newcomer@example.com");
    expect(sent, "the fake transport received nothing").toBeTruthy();
    expect(sent!.organizationName).toContain("E2E Academy");
    expect(sent!.subject).toContain("E2E Academy");
    expect(sent!.url).toContain("/invite/accept?token=");
  });

  test("3 — it appears in the list with its recipient and delivery state", async ({ page }) => {
    await page.goto(`/teacher/${ORG}/invites`);
    const row = page.getByRole("row").filter({ hasText: "newcomer@example.com" });
    await expect(row).toBeVisible();
    await expect(row.getByText("Sent")).toBeVisible();
  });

  test("4 — a duplicate pending invitation is refused, and points at resend", async ({ page }) => {
    await page.goto(`/teacher/${ORG}/invites`);
    await page.getByLabel(/Email address/i).fill("newcomer@example.com");
    await page.getByRole("button", { name: "Send invitation" }).click();
    // Next renders its own route announcer with role="alert" on every page,
    // so an unscoped getByRole("alert") is ambiguous. Scope to the form.
    await expect(page.locator("form.teacher-form").getByRole("alert"))
      .toContainText(/already a pending invitation/i);
  });

  test("5 — resend is DISABLED during cooldown, and says why", async ({ page }) => {
    await page.goto(`/teacher/${ORG}/invites`);
    const row = page.getByRole("row").filter({ hasText: "newcomer@example.com" });
    const resend = row.getByRole("button", { name: "Resend" });
    await expect(resend).toBeDisabled();
    await expect(resend).toHaveAttribute("title", /sent very recently/i);
  });

  test("6 — an invalid address is refused before anything is created", async ({ page }) => {
    await page.goto(`/teacher/${ORG}/invites`);
    await page.getByLabel(/Email address/i).fill("not-an-email");
    await page.getByRole("button", { name: "Send invitation" }).click();
    await expect(page.locator("form.teacher-form").getByRole("alert"))
      .toContainText(/valid email address/i);
    expect((await mailbox(page)).some((m) => m.to === "not-an-email")).toBe(false);
  });

  test("7 — a PROVIDER FAILURE gives created-but-unsent, with both ways forward", async ({ page }) => {
    // The state the whole failure contract exists to represent. The
    // invitation is real; the email is not; neither fact is hidden.
    await armMailFailure(page, { retriable: true, error: "503: upstream" });

    await page.goto(`/teacher/${ORG}/invites`);
    await page.getByLabel(/Email address/i).fill("unreachable@example.com");
    await page.getByRole("button", { name: "Send invitation" }).click();

    await expect(page.getByText(/Invitation created, but we could not send/i)).toBeVisible();
    await expect(page.getByText(/\/invite\/accept\?token=/)).toBeVisible();
    await expect(page.getByRole("button", { name: /Copy link/i })).toBeVisible();
    // It must NOT claim success.
    await expect(page.getByText(/Invitation sent to unreachable/i)).toHaveCount(0);
  });

  test("8 — the failed invitation is listed as Not delivered and can be retried", async ({ page }) => {
    await page.goto(`/teacher/${ORG}/invites`);
    const row = page.getByRole("row").filter({ hasText: "unreachable@example.com" });
    await expect(row.getByText("Not delivered")).toBeVisible();
    await expect(row.getByRole("button", { name: "Resend" })).toBeVisible();
  });

  test("9 — the invitations page is closed to a learner", async ({ context, page }) => {
    await context.clearCookies();
    await context.addCookies([
      { name: "slp_at", value: "test-access", url: E2E_BASE_URL },
      { name: "slp_rt", value: "test-refresh", url: E2E_BASE_URL },
      { name: "slp_uid", value: "user-1", url: E2E_BASE_URL },
      { name: "slp_em", value: "learner@example.com", url: E2E_BASE_URL },
    ]);
    await page.goto(`/teacher/${ORG}/invites`);
    await expect(page).not.toHaveURL(/\/teacher\//);
    await expect(page.getByRole("button", { name: /Send invitation/i })).toHaveCount(0);
  });

  test("10 — the invitations page has no serious axe violations", async ({ page }) => {
    await page.goto(`/teacher/${ORG}/invites`);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations.filter((v) => v.impact === "critical" || v.impact === "serious")).toEqual([]);
  });

  test("11 — the invitations page does not scroll horizontally on a phone", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`/teacher/${ORG}/invites`);
    const [sw, cw] = await page.evaluate(() => [
      document.documentElement.scrollWidth, document.documentElement.clientWidth,
    ]);
    expect(sw, "/invites overflows a 375px viewport").toBeLessThanOrEqual(cw);
  });

  test("12 — no invitation token or hash is ever rendered in the list", async ({ page }) => {
    await page.goto(`/teacher/${ORG}/invites`);
    const table = page.getByRole("table");
    const text = (await table.textContent()) ?? "";
    expect(text).not.toMatch(/[a-f0-9]{64}/);
  });
});
