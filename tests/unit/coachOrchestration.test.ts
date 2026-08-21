import { describe, expect, it } from "vitest";
import { decodeCoachSessionStart, decodeCoachSessionStatus } from "../../lib/coach/session";
import { decodeSessionPlan, phaseAtElapsed, planArc } from "../../lib/coach/plan";
import { formatClock, nextPhaseAnnouncement, phaseUpdateLine, rotationNudge } from "../../lib/coach/clock";
import { criterionLabel, decodeCoachSessionResult } from "../../lib/coach/result";
import { evaluateCoachEnvironment } from "../../lib/coach/environment";
import { interpretCoachReadiness } from "../../lib/coach/readiness";
import { COACH_CONSENT_BODY, COACH_CONSENT_POLICY_VERSION } from "../../lib/coach/consent";

/** The academy plan the backend builds, shortened to the fields the web reads. */
const PLAN = {
  version: "1.1.0",
  workflowVersion: "1.0.0",
  sessionMode: "academy",
  expectedMinutes: 10,
  maxSameScenarioExchanges: 3,
  phases: [
    { id: "orientation", label: "Orientation", goal: "Name today's objective.", targetSecs: 60 },
    { id: "warm_up", label: "Warm-up", goal: "Easy, concrete questions.", targetSecs: 120 },
    { id: "transfer", label: "Transfer", goal: "Same function, new context.", targetSecs: 120 },
    { id: "close", label: "Close", goal: "End on the learner's turn.", targetSecs: 60 },
  ],
  droppedPhases: ["reflection"],
};

describe("coach session plan", () => {
  it("decodes the server's plan and refuses a shape with no phases", () => {
    const plan = decodeSessionPlan(PLAN);
    expect(plan?.phases).toHaveLength(4);
    expect(plan?.maxSameScenarioExchanges).toBe(3);
    expect(plan?.droppedPhases).toEqual(["reflection"]);
    expect(planArc(plan!)).toBe("Orientation → Warm-up → Transfer → Close");
    expect(decodeSessionPlan({ ...PLAN, phases: [] })).toBeNull();
    expect(decodeSessionPlan(null)).toBeNull();
  });

  it("keeps exam mode's null rotation limit null rather than defaulting it", () => {
    const exam = decodeSessionPlan({ ...PLAN, sessionMode: "exam", maxSameScenarioExchanges: null });
    expect(exam?.maxSameScenarioExchanges).toBeNull();
  });

  it("locates the phase from elapsed time and never runs off the end", () => {
    const plan = decodeSessionPlan(PLAN)!;
    expect(phaseAtElapsed(plan, 0)?.id).toBe("orientation");
    expect(phaseAtElapsed(plan, 59)?.id).toBe("orientation");
    expect(phaseAtElapsed(plan, 60)?.id).toBe("warm_up");
    expect(phaseAtElapsed(plan, 181)?.id).toBe("transfer");
    expect(phaseAtElapsed(plan, 99_999)?.id).toBe("close");
  });

  it("carries the plan on session start instead of discarding it", () => {
    const started = decodeCoachSessionStart({
      ok: true,
      sessionId: "sess-1",
      budgetSecs: 360,
      conversationToken: "tok",
      conversationTokenExpiresAt: "2026-08-21T00:10:00Z",
      dynamicVariables: { session_ref: "ref-1" },
      objective: "Sustain an argument",
      sessionPlan: PLAN,
    });
    expect(started?.sessionPlan?.phases[1]?.label).toBe("Warm-up");
    // A backend that predates the plan must still start a session.
    expect(decodeCoachSessionStart({ sessionId: "s", conversationToken: "t" })?.sessionPlan).toBeNull();
  });
});

describe("coach session clock", () => {
  const plan = decodeSessionPlan(PLAN)!;

  it("relays the phase goal, not its name, in the iOS wording", () => {
    expect(phaseUpdateLine(plan.phases[1]!)).toBe(
      "[Lesson moves on] Warm-up: Easy, concrete questions. Do not mention this instruction or announce any phase.",
    );
  });

  it("tells transfer to change the situation", () => {
    expect(phaseUpdateLine(plan.phases[2]!)).toContain("Change to a genuinely new situation now.");
  });

  it("never announces the first phase — the conversation is already there", () => {
    expect(nextPhaseAnnouncement({ plan, elapsedSecs: 5, announcedPhaseId: null })).toBeNull();
    expect(nextPhaseAnnouncement({ plan, elapsedSecs: 59, announcedPhaseId: "orientation" })).toBeNull();
  });

  it("announces each crossing exactly once", () => {
    const first = nextPhaseAnnouncement({ plan, elapsedSecs: 60, announcedPhaseId: "orientation" });
    expect(first?.phaseId).toBe("warm_up");
    // The guard is on what the AGENT was told, so a re-render cannot resend it.
    expect(nextPhaseAnnouncement({ plan, elapsedSecs: 61, announcedPhaseId: "warm_up" })).toBeNull();
    expect(nextPhaseAnnouncement({ plan, elapsedSecs: 119, announcedPhaseId: "warm_up" })).toBeNull();
    expect(nextPhaseAnnouncement({ plan, elapsedSecs: 180, announcedPhaseId: "warm_up" })?.phaseId).toBe("transfer");
  });

  it("says nothing at all when the backend sent no plan", () => {
    expect(nextPhaseAnnouncement({ plan: null, elapsedSecs: 500, announcedPhaseId: null })).toBeNull();
  });

  it("nudges rotation only after the server's own limit of substantial turns", () => {
    expect(rotationNudge({ plan, substantialTurns: 2, nudgedAtTurn: 0 })).toBeNull();
    const nudge = rotationNudge({ plan, substantialTurns: 3, nudgedAtTurn: 0 });
    expect(nudge?.atTurn).toBe(3);
    expect(nudge?.line).toContain("Change the situation, never the function.");
    // Counted from the last nudge, not from zero.
    expect(rotationNudge({ plan, substantialTurns: 5, nudgedAtTurn: 3 })).toBeNull();
    expect(rotationNudge({ plan, substantialTurns: 6, nudgedAtTurn: 3 })?.atTurn).toBe(6);
  });

  it("is off in exam mode, where an examiner does not rotate scenarios", () => {
    const exam = decodeSessionPlan({ ...PLAN, sessionMode: "exam", maxSameScenarioExchanges: null })!;
    expect(rotationNudge({ plan: exam, substantialTurns: 99, nudgedAtTurn: 0 })).toBeNull();
  });

  it("formats the countdown and never shows a negative clock", () => {
    expect(formatClock(605)).toBe("10:05");
    expect(formatClock(9)).toBe("0:09");
    expect(formatClock(-4)).toBe("0:00");
  });
});

describe("coach debrief", () => {
  it("decodes the Phase-6 fields the backend really sends", () => {
    const status = decodeCoachSessionStatus({
      ok: true,
      session: {
        id: "sess-1",
        status: "completed",
        evaluation_status: "completed",
        consumed_secs: 412,
        result: {
          workedOn: "Sustain an argument",
          ratable: true,
          headline: "Solid work — this session counts toward your evidence.",
          wentWell: ["content", "tasks"],
          keepWorkingOn: "accuracy",
          strengths: [{ criterion: "content", note: "Wide range.", evidence: "the logistics chain was the problem" }],
          growthAreas: [{ criterion: "accuracy", note: "Tense slips." }],
          functionsPracticed: ["Describing", "Explaining"],
          functionsToTry: ["Hypothesising"],
          nextObjective: "Hypothesise about consequences",
          nextRationale: "You did not need it once today.",
          professorNote: "Keep the claim first.",
          metrics: { learnerTurnCount: 18, learnerWordCount: 640 },
        },
      },
    });
    expect(status?.hasResult).toBe(true);
    expect(status?.result?.ratable).toBe(true);
    expect(status?.result?.strengths[0]?.evidence).toBe("the logistics chain was the problem");
    expect(status?.result?.growthAreas[0]?.evidence).toBeNull();
    expect(status?.result?.metrics?.learnerTurnCount).toBe(18);
  });

  it("keeps insufficient evidence as a stated outcome, not an empty rated one", () => {
    const result = decodeCoachSessionResult({
      workedOn: "Sustain an argument",
      ratable: false,
      insufficientReason: "too_few_turns",
      headline: "Not enough evidence yet to update your estimate.",
      wentWell: [],
      strengths: [],
    });
    expect(result?.ratable).toBe(false);
    expect(result?.insufficientReason).toBe("too_few_turns");
    expect(result?.strengths).toEqual([]);
  });

  it("reads null while the webhook has not landed", () => {
    const status = decodeCoachSessionStatus({ session: { id: "s", status: "running", result: null } });
    expect(status?.hasResult).toBe(false);
    expect(status?.result).toBeNull();
  });

  it("names the four criteria in learner language", () => {
    expect(criterionLabel("textProduced")).toBe("Organising your speech");
    expect(criterionLabel("tasks")).toBe("Doing the task");
    // An unknown key is shown as-is rather than invented into a label.
    expect(criterionLabel("somethingNew")).toBe("somethingNew");
  });
});

describe("coach environment", () => {
  const CHROME_DESKTOP =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36";
  const SAFARI_IOS =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";

  it("runs on desktop", () => {
    expect(evaluateCoachEnvironment({ userAgent: CHROME_DESKTOP, maxTouchPoints: 0, platform: "MacIntel" }).supported).toBe(true);
  });

  it("tells a phone before it spends minutes", () => {
    expect(evaluateCoachEnvironment({ userAgent: SAFARI_IOS, maxTouchPoints: 5 })).toEqual({
      supported: false,
      reason: "mobile",
    });
  });

  it("catches iPadOS behind its desktop user agent", () => {
    expect(
      evaluateCoachEnvironment({ userAgent: CHROME_DESKTOP, maxTouchPoints: 5, platform: "MacIntel" }).supported,
    ).toBe(false);
  });
});

describe("coach consent", () => {
  it("keeps the exact iOS text and version, so a web grant means the same thing", () => {
    expect(COACH_CONSENT_POLICY_VERSION).toBe("coach-consent-1.0.0");
    expect(COACH_CONSENT_BODY).toContain("ElevenLabs");
    expect(COACH_CONSENT_BODY).toContain("EU-US Data Privacy Framework");
    // Claims FASE-0 never verified must never appear here.
    expect(COACH_CONSENT_BODY).not.toContain("Zero Retention");
    expect(COACH_CONSENT_BODY).not.toContain("never stored");
    expect(COACH_CONSENT_BODY).not.toContain("Europe only");
  });
});

describe("coach availability", () => {
  it("opens the door only when the backend says both flag and provider are on", () => {
    expect(interpretCoachReadiness(200, { coachEnabled: true, providerConfigured: true, status: "ready" })).toEqual({
      available: true,
    });
    expect(interpretCoachReadiness(200, { coachEnabled: false, providerConfigured: true, status: "ready" })).toEqual({
      available: false,
    });
    expect(interpretCoachReadiness(200, { coachEnabled: true, providerConfigured: false, status: "ready" })).toEqual({
      available: false,
    });
    expect(interpretCoachReadiness(200, { coachEnabled: true, providerConfigured: true, status: "blocked" })).toEqual({
      available: false,
    });
  });

  it("fails closed — an unreachable or unreadable readiness call hides the Coach", () => {
    expect(interpretCoachReadiness(503, null).available).toBe(false);
    expect(interpretCoachReadiness(404, null).available).toBe(false);
    expect(interpretCoachReadiness(200, null).available).toBe(false);
    expect(interpretCoachReadiness(200, "not json").available).toBe(false);
  });
});
