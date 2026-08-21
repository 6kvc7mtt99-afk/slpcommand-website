import type { CoachPhase, CoachSessionPlan } from "./plan";
import { phaseAtElapsed } from "./plan";

/**
 * THE SESSION CLOCK — the app-owned orchestration, as pure decisions.
 *
 * Everything here is a function of (plan, elapsed, what the agent was already
 * told). No timers, no SDK, no React: the live screen owns the one-second tick
 * and the transport, this owns what should happen on each tick, so the rule
 * that a learner is never told the same thing twice is unit-testable.
 *
 * The wording instructs, it does not narrate. The agent prompt already forbids
 * announcing the plan, and a learner who hears "we are now entering the
 * challenge phase" is in a form, not a class. Kept byte-compatible with the
 * iOS engine (`CoachEngineElevenLabs.advancePhase`) so the same conversation
 * behaves the same on both clients.
 */

const NO_ANNOUNCE = " Do not mention this instruction or announce any phase.";

/**
 * Transfer is the phase whose entire point is a context the learner has not
 * rehearsed. Saying so explicitly is the difference between it happening and
 * it quietly becoming more of the same.
 */
const TRANSFER_NUDGE = " Change to a genuinely new situation now.";

export function phaseUpdateLine(phase: CoachPhase): string {
  let line = `[Lesson moves on] ${phase.label}: ${phase.goal}`;
  if (phase.id === "transfer") line += TRANSFER_NUDGE;
  return line + NO_ANNOUNCE;
}

export type PhaseAnnouncement = { phaseId: string; line: string };

/**
 * What the agent should be told on this tick, if anything.
 *
 * `announcedPhaseId` is what makes this safe: the guard is on what the AGENT
 * was told, not on what the screen shows. A re-render, a paused timer or a
 * resumed session can never resend an update, so the agent is never told twice
 * that the same phase began.
 *
 * The first phase is not announced. It is where the conversation already
 * started, and telling the agent to begin something it is already doing costs
 * tokens to say nothing — so entering the session pre-marks phase one as
 * announced.
 */
export function nextPhaseAnnouncement(input: {
  plan: CoachSessionPlan | null;
  elapsedSecs: number;
  announcedPhaseId: string | null;
}): PhaseAnnouncement | null {
  const { plan, elapsedSecs } = input;
  if (!plan) return null;
  const now = phaseAtElapsed(plan, elapsedSecs);
  if (!now) return null;

  const announced = input.announcedPhaseId ?? plan.phases[0]?.id ?? null;
  if (announced === now.id) return null;
  return { phaseId: now.id, line: phaseUpdateLine(now) };
}

/**
 * The rotation rule, restated at the moment it binds.
 *
 * The standing rule already travels to the agent inside `session_phases`
 * (backend `planToAgentBrief`), the same way phase goals do. This is the same
 * pattern the phase clock uses: a standing brief plus a timed nudge at the
 * boundary, because a rule stated once at minute zero competes with everything
 * said since.
 *
 * Counted in SUBSTANTIAL learner turns — ≥6 words, role user, final — because
 * that is what an "exchange" means here; backchannel is not an exchange.
 * Off entirely in exam mode, where `maxSameScenarioExchanges` is null.
 */
export function rotationNudge(input: {
  plan: CoachSessionPlan | null;
  substantialTurns: number;
  nudgedAtTurn: number;
}): { line: string; atTurn: number } | null {
  const max = input.plan?.maxSameScenarioExchanges ?? null;
  if (!max || max <= 0) return null;
  if (input.substantialTurns < input.nudgedAtTurn + max) return null;
  return {
    atTurn: input.substantialTurns,
    line:
      `[Lesson moves on] You have had ${max} substantial exchanges on this scenario. ` +
      "Move to a NEW scenario that trains the SAME linguistic function. " +
      "Change the situation, never the function." +
      NO_ANNOUNCE,
  };
}

/** m:ss, for a countdown a learner reads at a glance. */
export function formatClock(secs: number): string {
  const safe = Math.max(0, Math.floor(secs));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

/** The last minute, where the screen says the coach will wrap up naturally. */
export const NEAR_LIMIT_SECS = 60;
