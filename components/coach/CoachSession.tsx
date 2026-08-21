"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  useConversation,
  useConversationControls,
  useConversationMode,
  useConversationStatus,
} from "@elevenlabs/react";
import { fetchCoachSessionStatus } from "@/lib/coach/api";
import { formatClock, NEAR_LIMIT_SECS, nextPhaseAnnouncement, rotationNudge } from "@/lib/coach/clock";
import { sendContextualUpdateSafely } from "@/lib/coach/context";
import type { CoachSessionPlan } from "@/lib/coach/plan";
import { phaseAtElapsed } from "@/lib/coach/plan";
import type { CoachSessionResult } from "@/lib/coach/result";
import { pollCoachSession } from "@/lib/coach/session";
import { accumulateTranscript, classifyCoachMessage, countSubstantialUserTurns, type ClassifiedCoachMessage } from "@/lib/coach/transcript";
import { CoachDebrief } from "./CoachDebrief";
import { CoachStage, type CoachVisualState } from "./CoachVisualFoundation";

type Stage = "connecting" | "live" | "ending" | "unavailable" | "debrief";

/**
 * How long a conversation may stay in "connecting" before the screen calls it.
 *
 * WHY THIS EXISTS. The hook's `startSession` returns `void`: a failure to open
 * the WebRTC leg is reported only through `onError`, and a transport that
 * simply never completes reports nothing at all. Without this, a learner whose
 * session has ALREADY been authorized sits on a spinner forever with no way
 * out and no explanation.
 *
 * 30s is the timeout this codebase already uses for a backend hop
 * (`DEFAULT_TIMEOUT` in `lib/server/backend.ts`), reused rather than invented
 * so there is one idea of "too long" in the product. Ending here is safe: no
 * webhook will arrive for a call that never happened, and the backend's
 * reconciliation then fails the session WITHOUT charge.
 */
const CONNECT_TIMEOUT_MS = 30_000;

/**
 * The live Coach session.
 *
 * This screen owns three things and nothing else: the transport (the official
 * SDK), a one-second tick, and the decision to stop. Every rule about WHAT to
 * say and WHEN — phase transitions, the rotation limit, the wording of both —
 * lives in `lib/coach/clock.ts` as pure functions, so the guarantee that the
 * agent is never told the same thing twice is testable without a browser.
 *
 * Three invariants worth stating, because each one was a real failure mode:
 *
 *  1. The conversation token never enters props, state or the DOM. It is
 *     pulled from the parent's ref at the single moment it is handed to the
 *     SDK, and it is never logged.
 *  2. A failed contextual update must NEVER end a call the learner is inside.
 *     The lesson continues, less guided — see `sendContextualUpdateSafely`.
 *  3. The countdown starts once, on the first connect. LiveKit can republish
 *     `connected`, and a learner must never be billed a second budget for one
 *     conversation.
 */
export function CoachSession({
  sessionId,
  objective,
  budgetSecs,
  plan,
  dynamicVariables,
  getToken,
  onExit,
}: {
  sessionId: string;
  objective: string;
  budgetSecs: number;
  plan: CoachSessionPlan | null;
  dynamicVariables: Record<string, string>;
  getToken: () => string | null;
  onExit: () => void;
}) {
  const { startSession, endSession, sendContextualUpdate } = useConversationControls();
  const { status } = useConversationStatus();
  const { isSpeaking } = useConversationMode();

  const [stage, setStage] = useState<Stage>("connecting");
  const [remainingSecs, setRemainingSecs] = useState(budgetSecs);
  const [result, setResult] = useState<CoachSessionResult | null>(null);

  const startedRef = useRef(false);
  const connectedRef = useRef(false);
  const closingRef = useRef(false);
  const announcedPhaseRef = useRef<string | null>(null);
  /**
   * The transcript, in memory only, for one reason: counting exchanges.
   *
   * DEFECT this fixes. Counting `substantialUserTurn` per incoming message
   * double-counts a single utterance, because the SDK streams a learner turn
   * as a GROWING sequence ("we went", "we went to the", …) and
   * `classifyCoachMessage` treats a message as final unless it is explicitly
   * flagged otherwise. One 12-word answer could therefore look like four
   * exchanges and trip the rotation limit inside a single turn — the agent
   * being told to change scenario mid-sentence. `accumulateTranscript`
   * collapses those growing chunks (same `event_id`, or one text a prefix of
   * the other) into a single turn, which is exactly what PR-19 built it for.
   */
  const messagesRef = useRef<ClassifiedCoachMessage[]>([]);
  const rotationNudgedAtRef = useRef(0);
  const remainingRef = useRef(budgetSecs);
  const endRef = useRef<() => void>(() => {});

  const relay = useCallback(
    (line: string) => {
      // Fire-and-forget by design: the learner's turn must not wait on the
      // provider acknowledging a context update, and a rejection here is
      // logged nowhere near the token.
      void sendContextualUpdateSafely(sendContextualUpdate, line);
    },
    [sendContextualUpdate],
  );

  /** Poll for the debrief, then land on it however it went. */
  const settle = useCallback(async () => {
    const last = await pollCoachSession(() => fetchCoachSessionStatus(sessionId)).catch(() => null);
    setResult(last?.result ?? null);
    setStage("debrief");
  }, [sessionId]);

  const finish = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setStage("ending");
    try {
      endSession();
    } catch {
      /* Already down. The backend reconciles from the webhook either way. */
    }
    void settle();
  }, [endSession, settle]);

  endRef.current = finish;

  useConversation({
    onConnect() {
      if (connectedRef.current) return;
      connectedRef.current = true;
      // The first phase is where the conversation already starts. Marking it
      // announced is what keeps the agent from being told to begin something
      // it is already doing.
      announcedPhaseRef.current = plan?.phases[0]?.id ?? null;
      setStage("live");
    },
    onDisconnect() {
      if (connectedRef.current && !closingRef.current) endRef.current();
    },
    onMessage(payload) {
      const classified = classifyCoachMessage(payload);
      messagesRef.current = accumulateTranscript(messagesRef.current, classified);
      const nudge = rotationNudge({
        plan,
        substantialTurns: countSubstantialUserTurns(messagesRef.current),
        nudgedAtTurn: rotationNudgedAtRef.current,
      });
      if (nudge) {
        rotationNudgedAtRef.current = nudge.atTurn;
        relay(nudge.line);
      }
    },
    onError() {
      // Before connect, this is a dead end and no webhook will come; the
      // backend's reconciliation fails the session without charge. After
      // connect, close it properly so the minutes actually spoken settle.
      if (!connectedRef.current) setStage("unavailable");
      else endRef.current();
    },
  });

  // Open the conversation exactly once. Strict Mode remounts this component in
  // development; a second startSession would open a second WebRTC call against
  // one authorized session.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const token = getToken();
    if (typeof startSession !== "function" || !token) {
      setStage("unavailable");
      return;
    }
    try {
      startSession({ conversationToken: token, dynamicVariables, connectionType: "webrtc" });
    } catch {
      setStage("unavailable");
    }
  }, [dynamicVariables, getToken, startSession]);

  // The watchdog. Only ever runs while nothing has connected yet.
  useEffect(() => {
    if (stage !== "connecting") return;
    const id = window.setTimeout(() => {
      if (!connectedRef.current) setStage("unavailable");
    }, CONNECT_TIMEOUT_MS);
    return () => window.clearTimeout(id);
  }, [stage]);

  // THE SESSION CLOCK. One tick drives the countdown, the phase transitions
  // and the hard stop — no second timer, no new machinery.
  useEffect(() => {
    if (stage !== "live") return;
    const id = window.setInterval(() => {
      const next = remainingRef.current - 1;
      remainingRef.current = next;
      setRemainingSecs(next);

      const announcement = nextPhaseAnnouncement({
        plan,
        elapsedSecs: budgetSecs - next,
        announcedPhaseId: announcedPhaseRef.current,
      });
      if (announcement) {
        announcedPhaseRef.current = announcement.phaseId;
        relay(announcement.line);
      }

      if (next <= 0) endRef.current();
    }, 1000);
    return () => window.clearInterval(id);
  }, [budgetSecs, plan, relay, stage]);

  // Leaving the screen must not leave a call running and a budget draining.
  useEffect(
    () => () => {
      if (connectedRef.current && !closingRef.current) {
        closingRef.current = true;
        try {
          endSession();
        } catch {
          /* nothing left to close */
        }
      }
    },
    [endSession],
  );

  if (stage === "debrief") {
    return <CoachDebrief objective={objective} result={result} onDone={onExit} />;
  }

  if (stage === "unavailable") {
    return (
      <article className="coach-panel" role="alert">
        <p className="assessment-kind">Coach</p>
        <h2>The live Coach could not start</h2>
        <p className="muted">
          No minutes were used. Recorded Speaking Practice is rated by the same engine and is ready now.
        </p>
        <div className="cta-row">
          <a className="btn btn-primary" href="/speaking/practice">
            Open Speaking Practice
          </a>
          <button className="btn btn-outline" type="button" onClick={onExit}>
            Back to Speaking
          </button>
        </div>
      </article>
    );
  }

  const nearLimit = remainingSecs <= NEAR_LIMIT_SECS;
  const currentPhase = plan ? phaseAtElapsed(plan, budgetSecs - remainingSecs) : null;
  const visual: CoachVisualState =
    stage === "ending" ? "ending" : stage === "connecting" ? "pre" : isSpeaking ? "speaking" : "listening";

  return (
    <div className="coach-live">
      <p className="coach-objective">{objective}</p>

      <CoachStage state={visual} />

      {stage === "connecting" ? (
        <p className="muted coach-connecting" role="status">
          {status === "connecting" || status === "disconnected"
            ? "Connecting to your coach…"
            : "Preparing the conversation…"}
        </p>
      ) : null}

      {stage === "live" ? (
        <>
          {/* One quiet word for where the lesson is — never a progress bar.
              The coach advances when a phase has done its job, not on a
              clock, so a bar would look broken exactly when the teaching is
              going well. */}
          {currentPhase ? <p className="coach-phase">{currentPhase.label}</p> : null}
          <p className={`coach-clock p-num${nearLimit ? " is-near" : ""}`} aria-label={`${Math.max(0, Math.ceil(remainingSecs / 60))} minutes remaining`}>
            {formatClock(remainingSecs)}
          </p>
          {nearLimit ? <p className="muted">Almost time — your coach will wrap up naturally.</p> : null}
          <div className="cta-row">
            <button className="btn btn-outline btn-danger" type="button" onClick={finish}>
              End session
            </button>
          </div>
        </>
      ) : null}

      {stage === "ending" ? (
        <p className="muted" role="status">
          Wrapping up — your coach is reviewing the conversation.
        </p>
      ) : null}
    </div>
  );
}
