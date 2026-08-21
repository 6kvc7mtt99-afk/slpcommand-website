import { asNumber, asString, isRecord } from "@/lib/api/decode";

/**
 * The lesson, as the server designed it.
 *
 * The web app RENDERS this and never edits it. The agent is driven by the
 * dynamic variables the backend composed, not by anything shown here — so a
 * tampered client can change what the learner sees, never what the coach does.
 *
 * Built by `lib/coachSessionPlan.js` on the backend and frozen onto
 * `coach_sessions.session_plan` before a word is spoken. `POST /session`
 * returns it as `sessionPlan`; `GET /coach/mission` returns a PREVIEW of it as
 * `mission.plan`, which is null whenever the Coach is not actually on offer.
 */
export type CoachPhase = {
  id: string;
  label: string;
  /**
   * What this stretch of conversation is FOR, in the server's words. Relayed
   * to the agent verbatim at the transition — never shown to the learner, who
   * should feel the change rather than read about it.
   */
  goal: string;
  targetSecs: number;
};

export type CoachSessionPlan = {
  version: string;
  sessionMode: string;
  expectedMinutes: number;
  /**
   * How many substantial learner exchanges may stay on ONE scenario before the
   * coach must move the same linguistic function into a new context. Null in
   * exam mode, where rotation does not apply: an examiner works through
   * controlled tasks, it does not rotate scenarios to keep a candidate engaged.
   */
  maxSameScenarioExchanges: number | null;
  phases: CoachPhase[];
  droppedPhases: string[];
};

function decodePhase(raw: unknown): CoachPhase | null {
  if (!isRecord(raw)) return null;
  const id = asString(raw.id);
  if (!id) return null;
  return {
    id,
    label: asString(raw.label, id),
    goal: asString(raw.goal),
    targetSecs: asNumber(raw.targetSecs ?? raw.target_secs, 0),
  };
}

export function decodeSessionPlan(raw: unknown): CoachSessionPlan | null {
  if (!isRecord(raw)) return null;
  const phases = Array.isArray(raw.phases)
    ? raw.phases.map(decodePhase).filter((phase): phase is CoachPhase => phase !== null)
    : [];
  // A plan with no phases is not a lesson. Treating it as absent is what lets
  // a learner still run a session against a backend that predates the plan,
  // rather than failing to decode and stranding someone already charged.
  if (phases.length === 0) return null;
  const max = raw.maxSameScenarioExchanges ?? raw.max_same_scenario_exchanges;
  return {
    version: asString(raw.version),
    sessionMode: asString(raw.sessionMode || raw.session_mode, "academy"),
    expectedMinutes: asNumber(raw.expectedMinutes ?? raw.expected_minutes, 0),
    maxSameScenarioExchanges: typeof max === "number" && Number.isFinite(max) ? max : null,
    phases,
    droppedPhases: Array.isArray(raw.droppedPhases ?? raw.dropped_phases)
      ? ((raw.droppedPhases ?? raw.dropped_phases) as unknown[]).map((v) => asString(v)).filter(Boolean)
      : [],
  };
}

/**
 * Which phase the session is in, from elapsed time.
 *
 * Advisory only. The agent moves on when a phase has done its job, not when a
 * clock says so, so this can legitimately disagree with what the learner is
 * hearing — which is why the live screen shows it as a quiet label and never
 * as a progress bar that would look broken when they diverge.
 */
export function phaseAtElapsed(plan: CoachSessionPlan, elapsedSecs: number): CoachPhase | null {
  let boundary = 0;
  for (const phase of plan.phases) {
    boundary += phase.targetSecs;
    if (elapsedSecs < boundary) return phase;
  }
  return plan.phases[plan.phases.length - 1] ?? null;
}

/** The arc, for the pre-session screen: "Warm-up → Practice → Challenge". */
export function planArc(plan: CoachSessionPlan): string {
  return plan.phases.map((phase) => phase.label).join(" → ");
}
