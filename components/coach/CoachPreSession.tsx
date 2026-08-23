"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ConversationProvider, useConversationControls } from "@elevenlabs/react";
import { ExerciseShell } from "@/components/exercise/ExerciseShell";
import { ErrorState, LoadingState } from "@/components/ui/ProductState";
import {
  CoachStartFailure,
  fetchCoachMission,
  recordCoachConsent,
  startCoachSession,
  type CoachMission,
} from "@/lib/coach/api";
import {
  COACH_CONSENT_BODY,
  COACH_CONSENT_TITLE,
  COACH_CONSENT_POLICY_VERSION,
} from "@/lib/coach/consent";
import { COACH_START_COPY, type CoachStartError } from "@/lib/coach/errors";
import { readCoachEnvironment } from "@/lib/coach/environment";
import { planArc } from "@/lib/coach/plan";
import { canAuthorizeCoachSession, queryMicrophonePermission, requestMicrophonePreview } from "@/lib/coach/preflight";
import type { CoachSessionStart } from "@/lib/coach/session";
import { CoachSession } from "./CoachSession";

/**
 * The Coach entry point.
 *
 * Everything a learner needs before agreeing to spend minutes: what today's
 * objective is and why, the shape of the class, and both minute pools by name.
 * Nothing on this screen is computed in the browser — the objective, the
 * rationale, the plan and the balances are all the backend's decisions,
 * rendered.
 *
 * PRE-FLIGHT ORDER IS THE POINT. Engine, then microphone, then — and only
 * then — `POST /session`. The reverse order authorizes a session that can
 * never happen, which is how a learner ends up with a charged empty session
 * to reconcile.
 */
export function CoachPreSession() {
  return (
    <ConversationProvider>
      <CoachEntry />
    </ConversationProvider>
  );
}

type Stage = "loading" | "ready" | "consent" | "starting" | "live" | "failed";

function CoachEntry() {
  const { startSession } = useConversationControls();
  const [stage, setStage] = useState<Stage>("loading");
  const [mission, setMission] = useState<CoachMission | null>(null);
  const [startError, setStartError] = useState<CoachStartError | null>(null);
  const [consentError, setConsentError] = useState(false);
  const [session, setSession] = useState<Omit<CoachSessionStart, "conversationToken"> | null>(null);
  const [desktopOnly, setDesktopOnly] = useState(false);

  /**
   * The conversation token lives here and nowhere else — not in state, not in
   * props, not in storage, never in a log line. `CoachSession` reads it once,
   * at the moment it hands it to the SDK.
   */
  const tokenRef = useRef<string | null>(null);
  /** Stable, so opening the conversation is not re-attempted on every render. */
  const getToken = useCallback(() => tokenRef.current, []);

  const load = useCallback(async () => {
    setStage("loading");
    try {
      setMission(await fetchCoachMission());
      setStage("ready");
    } catch {
      setStage("failed");
    }
  }, []);

  useEffect(() => {
    setDesktopOnly(!readCoachEnvironment().supported);
    void load();
  }, [load]);

  async function begin() {
    if (!mission) return;
    setStartError(null);

    // 1. Engine. 2. Microphone. Only then may a session be authorized.
    const mic = await ensureMicrophone();
    const gate = canAuthorizeCoachSession({ sdkReady: typeof startSession === "function", mic });
    if (!gate.ok) {
      setStartError(gate.reason === "sdk_unavailable" ? "sdkUnavailable" : "microphoneDenied");
      return;
    }

    setStage("starting");
    try {
      const started = await startCoachSession({
        objective: mission.objective,
        objectiveSource: mission.objectiveSource,
      });
      const { conversationToken, ...rest } = started;
      tokenRef.current = conversationToken;
      setSession(rest);
      setStage("live");
    } catch (error) {
      if (error instanceof CoachStartFailure) {
        // Consent can lapse between the mission read and the start; the
        // backend is the authority, so its answer routes the screen.
        if (error.code === "consentRequired") {
          setStage("consent");
          return;
        }
        setStartError(error.code);
      } else {
        setStartError("backendUnavailable");
      }
      setStage("ready");
    }
  }

  async function grantConsent() {
    setConsentError(false);
    try {
      await recordCoachConsent();
      await load();
    } catch {
      setConsentError(true);
    }
  }

  const exit = useCallback(() => {
    tokenRef.current = null;
    setSession(null);
    setStartError(null);
    void load();
  }, [load]);

  if (stage === "live" && session) {
    return (
      <ExerciseShell
        skill="Speaking"
        mode="Coach"
        title="AI Speaking Coach"
        layout="stage"
        exitHref="/speaking"
        exitLabel="Exit Coach"
      >
        <CoachSession
          sessionId={session.sessionId}
          objective={session.objective}
          budgetSecs={session.budgetSecs}
          plan={session.sessionPlan}
          dynamicVariables={session.dynamicVariables}
          getToken={getToken}
          onExit={exit}
        />
      </ExerciseShell>
    );
  }

  return (
    <ExerciseShell
      skill="Speaking"
      mode="Coach"
      title="AI Speaking Coach"
      layout="stage"
      exitHref="/speaking"
      exitLabel="Exit Coach"
    >
      {desktopOnly ? <DesktopOnlyNotice /> : null}

      {stage === "loading" ? <LoadingState label="Loading today’s objective…" /> : null}

      {stage === "failed" ? (
        <ErrorState
          message="Couldn’t reach the Coach. Check your connection, or use recorded Speaking Practice — it is rated by the same engine."
          onRetry={() => void load()}
        />
      ) : null}

      {stage === "consent" ? (
        <ConsentPanel onAgree={() => void grantConsent()} failed={consentError} />
      ) : null}

      {mission && (stage === "ready" || stage === "starting") ? (
        <article className="coach-brief">
          <p className="assessment-kind">Today’s objective</p>
          <h2 className="coach-objective-title">{mission.objective}</h2>
          {mission.rationale ? <p className="coach-rationale">{mission.rationale}</p> : null}

          {mission.plan ? (
            <section className="coach-arc" aria-label={`Session: ${planArc(mission.plan)}`}>
              <p className="assessment-label">Session · {mission.plan.expectedMinutes} min</p>
              <p className="coach-arc-line">{planArc(mission.plan)}</p>
              {mission.plan.sessionMode === "exam" ? (
                <p className="muted">Practice simulation — never an official assessment.</p>
              ) : null}
            </section>
          ) : null}

          <section className="coach-minutes" aria-label="Coach minutes">
            <Minutes label="Included this month" minutes={mission.includedMinutes} />
            <Minutes label="Purchased credits" minutes={mission.purchasedMinutes} />
            <Minutes label="Total available" minutes={mission.availableMinutes} />
          </section>

          <Gate
            mission={mission}
            busy={stage === "starting"}
            blocked={desktopOnly}
            onStart={() => void begin()}
            onConsent={() => setStage("consent")}
          />

          {startError ? (
            <p className="coach-error" role="alert">
              {COACH_START_COPY[startError]}
            </p>
          ) : null}
        </article>
      ) : null}
    </ExerciseShell>
  );
}

/**
 * Only `denied` blocks. `prompt`/`unknown` proceed: the browser's own
 * permission dialog belongs at the first real microphone open, and Safari
 * rejects the Permissions API for microphone outright — treating that as a
 * refusal would lock out a browser that works.
 */
async function ensureMicrophone() {
  const current = await queryMicrophonePermission();
  if (current === "granted" || current === "denied") return current;
  try {
    return await requestMicrophonePreview();
  } catch {
    return "denied" as const;
  }
}

function Minutes({ label, minutes }: { label: string; minutes: number }) {
  return (
    <div className="coach-minute">
      <strong className="p-num">{minutes}</strong>
      <span className="muted">{label}</span>
    </div>
  );
}

/**
 * What the learner can do, decided by the backend's `eligibility` — never by a
 * local read of the balance. A dead end always names a real alternative:
 * recorded Speaking Practice is rated by the same engine and has no minutes.
 */
function Gate({
  mission,
  busy,
  blocked,
  onStart,
  onConsent,
}: {
  mission: CoachMission;
  busy: boolean;
  blocked: boolean;
  onStart: () => void;
  onConsent: () => void;
}) {
  if (mission.eligibility === "eligible") {
    // On a phone the notice above already carries the only action that can
    // work here. A disabled Start button would still read as this page's
    // primary control while contradicting the sentence directly above it, so
    // the affordance is removed rather than greyed out — the objective and the
    // plan stay visible, because knowing what today is for is still useful.
    if (blocked) return null;
    return (
      <div className="cta-row">
        <button className="btn btn-primary btn-command" type="button" disabled={busy} onClick={onStart}>
          {busy ? "Preparing your session…" : `Start Coach · up to ${mission.estimatedMinutes} min`}
        </button>
      </div>
    );
  }

  if (mission.eligibility === "needs_consent") {
    return (
      <div className="cta-row">
        <button className="btn btn-outline" type="button" onClick={onConsent}>
          Review how the Coach uses your voice
        </button>
      </div>
    );
  }

  const outOfMinutes = mission.eligibility === "needs_minutes";
  // F3-21 — a Free learner is not "unavailable", they are not on the plan.
  // Without this, needs_pro fell through to "The AI Coach isn't available yet",
  // which is both wrong and a lost answer to the question they just asked.
  const needsPro = mission.eligibility === "needs_pro";

  // ── FASE COACH-HONEST-COPY-001 ────────────────────────────────────────────
  //
  // THE ORIGINAL DEFECT. This said, unconditionally: "Your included minutes
  // renew with your plan", when no plan granted Coach minutes at all. Rather
  // than hard-code a new sentence, it was made to read the balance the backend
  // already sends, with a note that the original sentence would return on its
  // own "the moment a plan really does grant minutes, with no second code
  // change".
  //
  // F3-13 IS THAT MOMENT. Pro now carries 30 minutes per cycle, so a Pro
  // learner reaches the hasPlanAllowance branch and reads the right sentence
  // without anything here changing — the design held.
  //
  // What did NOT hold is the final branch, which is why it was rewritten
  // below: it is reached only by an account with no allowance and no credits,
  // and it told that learner Coach was not sold. See the note there.
  const hasPlanAllowance = mission.includedMinutes > 0;
  const deadEndTitle = needsPro
    ? "The AI Coach is part of Pro"
    : outOfMinutes
      ? hasPlanAllowance
        ? "You’re out of Coach minutes"
        : "The AI Coach isn’t part of your plan yet"
      : "The AI Coach isn’t available yet";
  // F3-13 UPDATE. The last branch used to say Live Coach minutes were "not
  // included in any plan on sale today". That was true when it was written and
  // is now false: Pro carries 30 minutes per cycle. It is reached only by an
  // account with no allowance and no credits — that is, a Free learner — so
  // getting it wrong meant telling exactly the person who could buy it that it
  // was not for sale.
  const deadEndBody = needsPro
    ? "Pro includes 30 minutes of live Coach conversation each month. Recorded Speaking Practice — record, submit, get a full assessment — stays unlimited on your allowance."
    : !outOfMinutes
      ? "Speaking Practice is ready whenever you are, and it is rated by the same engine."
      : hasPlanAllowance
        ? "Your included minutes renew with your plan. Recorded Speaking Practice stays unlimited on your allowance."
        : mission.purchasedMinutes > 0
          ? "Your purchased credits are used up, and they do not expire — anything you add stays. Recorded Speaking Practice stays unlimited on your allowance."
          : "The AI Coach is part of Pro, which includes 30 minutes each month. Recorded Speaking Practice — record, submit, get a full assessment — stays unlimited on your allowance.";

  return (
    <div className="coach-deadend">
      <p>
        <strong>{deadEndTitle}</strong>
      </p>
      <p className="muted">{deadEndBody}</p>
      <div className="cta-row">
        <Link className="btn btn-primary" href="/speaking/practice">
          Open Speaking Practice
        </Link>
      </div>
    </div>
  );
}

function ConsentPanel({ onAgree, failed }: { onAgree: () => void; failed: boolean }) {
  return (
    <article className="coach-panel">
      <p className="assessment-kind">Consent</p>
      <h2>{COACH_CONSENT_TITLE}</h2>
      <p className="coach-consent-body">{COACH_CONSENT_BODY}</p>
      {failed ? (
        <p className="coach-error" role="alert">
          Couldn’t save your choice — check your connection and try again.
        </p>
      ) : null}
      <div className="cta-row">
        <button className="btn btn-primary" type="button" onClick={onAgree}>
          I agree — start coaching
        </button>
        <Link className="btn btn-outline" href="/speaking">
          Not now
        </Link>
      </div>
      <p className="muted coach-policy">Policy version {COACH_CONSENT_POLICY_VERSION}. You can revoke it at any time.</p>
    </article>
  );
}

/**
 * Desktop-first, said out loud.
 *
 * The live circuit is confirmed on desktop. Mobile WebKit microphone and
 * background audio behaviour are unverified, so a phone is told before it
 * spends minutes rather than after.
 */
function DesktopOnlyNotice() {
  return (
    <article className="coach-panel" role="status">
      <p className="assessment-kind">Desktop only</p>
      <h2>The live Coach runs on a computer</h2>
      <p className="muted">
        Voice sessions need a stable microphone and an uninterrupted connection, which we have only verified on desktop.
        Open SLP Command on a computer for the Coach — or use recorded Speaking Practice here, rated by the same engine.
      </p>
      <div className="cta-row">
        <Link className="btn btn-primary" href="/speaking/practice">
          Open Speaking Practice
        </Link>
      </div>
    </article>
  );
}
