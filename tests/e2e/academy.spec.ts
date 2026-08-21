import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { E2E_BASE_URL } from "./baseUrl";

const cookies = [
  { name: "slp_at", value: "test-access", url: E2E_BASE_URL },
  { name: "slp_rt", value: "test-refresh", url: E2E_BASE_URL },
  { name: "slp_uid", value: "user-1", url: E2E_BASE_URL },
  { name: "slp_em", value: "learner@example.com", url: E2E_BASE_URL },
];

test.beforeEach(async ({ context }) => {
  await context.addCookies(cookies);
  await context.addInitScript(() => localStorage.setItem("onboarding_completed:user-1", "1"));
});

test("academy, intelligence and writing tools render backend copy", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (req) => requests.push(req.url()));
  await page.goto("/reading/academy");
  await expect(page.locator("body")).toContainText("Recover inference");
  await page.goto("/reading/intelligence");
  await expect(page.locator("body")).toContainText("This is a readiness score, not Estimated SLP.");
  await expect(page.locator("body")).not.toContainText("passProbability");
  await page.goto("/listening/academy");
  await expect(page.locator(".priority-body", { hasText: "Specific Details" })).toBeVisible();
  await expect(page.locator("body")).toContainText("Pro");
  await page.goto("/listening/academy/topic/reasoning");
  await expect(page.locator("body")).toContainText("complete Academy");
  await page.goto("/writing/tools");
  await expect(page.getByRole("link", { name: "Open transformer" })).toBeVisible();
  await expect(page.locator("body")).toContainText("Fix the opening");
  expect(requests.some((url) => url.includes("writing/intelligence/readiness"))).toBe(false);
  expect(requests.some((url) => url.includes("writing/drill-feedback"))).toBe(false);
  expect(requests.some((url) => url.includes("onrender.com"))).toBe(false);
});

test("academy pages have no serious axe violations", async ({ page }) => {
  await page.goto("/writing/tools");
  const results = await new AxeBuilder({ page }).disableRules(["color-contrast"]).analyze();
  expect(results.violations.filter((item) => item.impact === "critical" || item.impact === "serious")).toEqual([]);
});

test("Writing Intelligence renders the real learning-state model, links a blocking competency to its lesson, and has no serious axe violations", async ({ page }) => {
  await page.goto("/writing/intelligence");
  await expect(page.locator("body")).toContainText("What is blocking your next promotion");
  // The fixture deliberately disagrees: /api/profile says target 2, learning-state's own
  // targetLevel field says 3. The page must show the real target (from /profile), not learning-state's.
  await expect(page.locator(".intel-facts")).toContainText("SLP 2");
  await expect(page.locator(".intel-facts")).not.toContainText("SLP 3");
  // Real quoted examiner evidence, not a placeholder.
  await expect(page.locator("body")).toContainText("Level 3 task is underdeveloped");
  // The priority competency (W1.1) must resolve to its real catalog lesson (wl-1), not a dead link.
  await expect(page.locator('a.priority-body[href="/writing/academy/lesson/wl-1"]')).toBeVisible();
  const results = await new AxeBuilder({ page }).disableRules(["color-contrast"]).analyze();
  expect(results.violations.filter((item) => item.impact === "critical" || item.impact === "serious")).toEqual([]);
});

test("Writing Practice result screen closes the loop into Intelligence and Academy, and never collapses the examiner's paragraphs", async ({ page }) => {
  await page.goto("/writing/practice");
  await expect(page.locator("body")).toContainText("Draft and evaluation");
  await page.locator("#writing-draft").fill(
    "Dear Section Commander, I am writing to report a hazard identified during this morning's inspection. ".repeat(3),
  );
  await page.getByRole("button", { name: "Submit for evaluation" }).click();
  await expect(page.getByRole("heading", { name: "Your submission has been assessed" })).toBeVisible();
  // The evaluator's response has two real paragraph breaks — three <p> elements, not one collapsed block
  // (the section also has a ".assessment-label" <p>, excluded here since it isn't report content).
  await expect(page.locator(".assessment-body p:not(.assessment-label)")).toHaveCount(3);
  await expect(page.locator(".assessment-verdict-text")).toContainText("The recommendation is specific and actionable");
  // Both continuations read the same evidence this report is drawn from — the loop the report closes.
  await expect(page.getByRole("link", { name: /What this means for my competencies/ })).toHaveAttribute("href", "/writing/intelligence");
  await expect(page.getByRole("link", { name: /Open Writing Academy/ })).toHaveAttribute("href", "/writing/academy");
  const results = await new AxeBuilder({ page }).disableRules(["color-contrast"]).analyze();
  expect(results.violations.filter((item) => item.impact === "critical" || item.impact === "serious")).toEqual([]);
});

test("Writing Practice offers sentence-level feedback on the draft in progress, without losing the draft or leaving the page", async ({ page }) => {
  await page.goto("/writing/practice");
  const feedbackButton = page.getByRole("button", { name: "Get feedback on this draft" });
  await expect(feedbackButton).toBeDisabled();
  const draft = "The course was not attended which is wrong, I wanna get this fixed today please.";
  await page.locator("#writing-draft").fill(draft);
  await expect(feedbackButton).toBeEnabled();
  await feedbackButton.click();
  // The real response's four fields, all of them — not just summary.
  await expect(page.locator(".examiner-summary")).toContainText("register slips");
  await expect(page.locator(".examiner-original")).toContainText("wanna");
  await expect(page.locator(".examiner-improved")).toContainText("I am writing to inform you");
  await expect(page.locator("body")).toContainText("Focus on next");
  await expect(page.locator("body")).toContainText("Worth memorising");
  // The draft itself must still be there — this is a read, not a submission.
  await expect(page.locator("#writing-draft")).toHaveValue(draft);
  await expect(page.getByRole("button", { name: "Submit for evaluation" })).toBeEnabled();
  const results = await new AxeBuilder({ page }).disableRules(["color-contrast"]).analyze();
  expect(results.violations.filter((item) => item.impact === "critical" || item.impact === "serious")).toEqual([]);
});

test("Examiner vision renders every real field of its response, not just a flattened summary", async ({ page }) => {
  await page.goto("/writing/tools/examiner");
  await page.locator("#examiner-text").fill(
    "I wanna let you know the course was not attended which is wrong and needs fixing right away please.",
  );
  await page.getByRole("button", { name: "Ask the examiner" }).click();
  await expect(page.locator(".examiner-summary")).toContainText("register slips");
  await expect(page.locator(".examiner-original")).toContainText("wanna");
  await expect(page.locator(".examiner-improved")).toContainText("I am writing to inform you");
  await expect(page.locator("body")).toContainText("Focus on next");
  await expect(page.locator("body")).toContainText("Worth memorising");
});

test("Writing competency map groups the real 49-lesson catalog by module and never invents a per-lesson state", async ({ page }) => {
  await page.goto("/writing/academy/map");
  await expect(page.locator("body")).toContainText("Self-Editing and Revision");
  await expect(page.getByRole("link", { name: "Finding What You Can't See" })).toBeVisible();
  // No mastery data exists in this response — a state chip here would be fabricated.
  await expect(page.locator(".records-state")).toHaveCount(0);
});

test("settings groups real controls and surfaces plan quota without raw backend keys", async ({ page }) => {
  await page.goto("/profile");
  // Every group heading, so a regression that drops a whole section fails here.
  for (const heading of ["Training", "Plan & usage", "Appearance & motion", "Privacy & data", "Account"]) {
    await expect(page.getByRole("heading", { level: 2, name: heading, exact: true })).toBeVisible();
  }
  // Real quota numbers from the entitlements response, not a plan name alone.
  await expect(page.locator(".settings-quotas")).toContainText("of 10 left");
  // A feature with no `name` must be humanised, never printed as its key.
  await expect(page.locator(".settings-quotas")).toContainText("Writing AI feedback");
  await expect(page.locator(".settings-quotas")).not.toContainText("writing_ai_feedback");
  // Deleting is gated until the confirmation matches.
  await expect(page.getByRole("button", { name: "Delete account" })).toBeDisabled();
  const results = await new AxeBuilder({ page }).disableRules(["color-contrast"]).analyze();
  expect(results.violations.filter((item) => item.impact === "critical" || item.impact === "serious")).toEqual([]);
});

test("Progress shows each skill's real level against the real target, not a fabricated one for skills with no evidence", async ({ page }) => {
  await page.goto("/progress");
  await expect(page.locator("body")).toContainText("You are at SLP 2.2.");
  // Reading (2.4) and Listening (2.1) both real-measured above the real target (2) -- the fixture
  // deliberately keeps /api/progress without its own targetLevel, so this is only correct if the
  // page used the canonical /profile-sourced target (Phase 7's fix), not a stale or absent one.
  const reading = page.locator(".p-skill-row.skill-reading .p-rung-bar");
  await expect(reading).toHaveClass(/is-at-target/);
  await expect(reading.locator(".p-rung-node")).toBeVisible();
  const listening = page.locator(".p-skill-row.skill-listening .p-rung-bar");
  await expect(listening).toHaveClass(/is-at-target/);
  // Writing and Speaking have no evidence in the fixture -- the track shows the real target tick
  // (it's a fact about the account) but must never invent a node/level for a skill with no data.
  const writing = page.locator(".p-skill-row.skill-writing .p-rung-bar");
  await expect(writing.locator(".p-rung-target")).toBeVisible();
  await expect(writing.locator(".p-rung-node")).toHaveCount(0);
  const results = await new AxeBuilder({ page }).disableRules(["color-contrast"]).analyze();
  expect(results.violations.filter((item) => item.impact === "critical" || item.impact === "serious")).toEqual([]);
});

test("reading, listening and writing lessons render real content and have no serious axe violations", async ({ page }) => {
  await page.goto("/reading/academy/lesson/rl-1?why=2%20classes%20need%20work");
  await expect(page.locator("body")).toContainText("Inference in orders");
  await expect(page.locator("body")).toContainText("Your current priority");
  await expect(page.getByRole("link", { name: /Train this weakness/ }).first()).toBeVisible();
  let results = await new AxeBuilder({ page }).disableRules(["color-contrast"]).analyze();
  expect(results.violations.filter((item) => item.impact === "critical" || item.impact === "serious")).toEqual([]);

  await page.goto("/listening/academy/topic/factual_detail");
  await expect(page.locator("body")).toContainText("Specific Details");
  await expect(page.getByRole("link", { name: /Apply in practice/ }).first()).toBeVisible();
  results = await new AxeBuilder({ page }).disableRules(["color-contrast"]).analyze();
  expect(results.violations.filter((item) => item.impact === "critical" || item.impact === "serious")).toEqual([]);

  await page.goto("/writing/academy/lesson/wl-1");
  await expect(page.locator("body")).toContainText("Openings");
  results = await new AxeBuilder({ page }).disableRules(["color-contrast"]).analyze();
  expect(results.violations.filter((item) => item.impact === "critical" || item.impact === "serious")).toEqual([]);
});
