"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FrontendError } from "@/lib/api/client";
import { quotaReassurance } from "@/lib/api/errors";
import type { ListeningExamStart } from "@/lib/api/listeningExam";
import {
  clearListeningExamIntent,
  finishListeningExam,
  requestListeningPlay,
  startListeningExam,
  submitListeningExamAnswer,
  unsentAnswerPositions,
} from "@/lib/listening/examSession";
import { AudioPlayer } from "@/components/exercise/AudioPlayer";
import { CommercialCard, ExerciseShell } from "@/components/exercise/ExerciseShell";
import { ExamDisclaimerGate } from "@/components/exercise/ExamDisclaimerGate";
import { ExamTimer } from "@/components/exercise/ExamTimer";
import { OptionList } from "@/components/exercise/OptionList";
import { ExamResultCard } from "@/components/exercise/ExamResultCard";
import { decodeExamResult, type ExamResult } from "@/lib/api/examResult";

type Phase = "gate" | "starting" | "live" | "finishing" | "done" | "quota" | "error";

/**
 * A permanently-failed answer save, explained without inventing a cause.
 *
 * The three situations are genuinely different — one is unrecoverable, one is
 * recoverable by signing in again, one is a rejection this client cannot
 * interpret — so they get three sentences rather than one comfortable guess.
 */
const BLOCKED_MESSAGE: Record<string, string> = {
  session_closed: "This exam session is closed and can no longer record answers.",
  item_not_found: "The server no longer recognises this question.",
  auth_lost: "Your sign-in expired, so the server rejected this answer.",
  default: "The server rejected this answer and it cannot be re-sent.",
};

export function ListeningExam() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("gate");
  const [userId, setUserId] = useState<string | null>(null);
  const [exam, setExam] = useState<ListeningExamStart | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  /**
   * ER-02 — what the SERVER has, per item, as distinct from what is on screen.
   *
   * `answers` is the learner's selection. This is whether that selection was
   * actually persisted. Conflating the two is the whole defect: a dropped POST
   * left the option highlighted while the server scored the item unanswered.
   */
  const [saveState, setSaveState] = useState<Record<number, "saving" | "saved" | "failed">>({});
  /** Reason of the last failure that cannot be retried, or null while retrying is worth it. */
  const [blockedReason, setBlockedReason] = useState<string | null>(null);
  /** Positions the server never confirmed, at the moment the exam ended. */
  const [lostPositions, setLostPositions] = useState<number[]>([]);
  /** Finish was pressed with answers still unsent, and the flush did not fix it. */
  const [confirmLossyFinish, setConfirmLossyFinish] = useState(false);
  // EXAM-REAL-003 — the real-exam SLP3 session's SHARED replay budget. Stays null for a
  // legacy session (backend decides the engine from the candidate's own profile), in which
  // case the indicator below simply does not render — this client never showed a per-item
  // count either, so there is nothing to preserve for that path.
  const [globalReplaysRemaining, setGlobalReplaysRemaining] = useState<number | null>(null);
  const [globalReplayBudget, setGlobalReplayBudget] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<ExamResult | null>(null);
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const saveStateRef = useRef(saveState);
  saveStateRef.current = saveState;

  /**
   * Persist one answer, and record honestly whether it landed.
   *
   * The write is an UPDATE keyed by (session, position), so re-sending the same
   * answer is idempotent — retrying is safe and cannot double-count. Answering
   * costs no quota; the exam credit was spent at start.
   */
  const persistAnswer = useCallback(
    async (examSessionId: string, position: number, choice: number): Promise<boolean> => {
      setSaveState((prev) => ({ ...prev, [position]: "saving" }));
      const outcome = await submitListeningExamAnswer(examSessionId, position, choice);
      setSaveState((prev) => ({ ...prev, [position]: outcome.status === "saved" ? "saved" : "failed" }));
      if (outcome.status === "failed" && !outcome.retryable) setBlockedReason(outcome.reason);
      else if (outcome.status === "saved") setBlockedReason(null);
      return outcome.status === "saved";
    },
    [],
  );

  /**
   * Re-send every answer the server has not confirmed, and report what is STILL
   * missing. The return value is computed from the awaited results rather than
   * from `saveState`, which has not re-rendered yet by the time this returns.
   */
  const flushUnsaved = useCallback(
    async (payload: ListeningExamStart): Promise<number[]> => {
      const pending = unsentAnswerPositions(payload.items, answersRef.current, saveStateRef.current);
      const stillUnsent: number[] = [];
      for (const position of pending) {
        const at = payload.items.findIndex((it) => it.position === position);
        const choice = answersRef.current[at];
        if (choice == null || choice < 0) continue;
        if (!(await persistAnswer(payload.examSessionId, position, choice))) stillUnsent.push(position);
      }
      return stillUnsent;
    },
    [persistAnswer],
  );

  useEffect(() => {
    void fetch("/api/auth/me", { credentials: "same-origin" })
      .then((res) => res.json())
      .then((data: { userId?: string }) => setUserId(data.userId ?? "anon"));
  }, []);

  /**
   * ER-02 — finish must not silently convert an undelivered answer into a blank.
   *
   * `finishListeningExam` posts the session id and nothing else, so whatever the
   * server is missing at this moment is what it scores. Flush first; if anything
   * still has not landed, say so and make the learner choose. `force` is the
   * timer path: time is up, the exam ends either way, but it ends having tried
   * once more and having recorded what was lost.
   */
  const finish = useCallback(async (payload: ListeningExamStart, force = false) => {
    const stillUnsent = await flushUnsaved(payload);
    setLostPositions(stillUnsent);
    if (stillUnsent.length > 0 && !force) {
      setConfirmLossyFinish(true);
      return;
    }
    setConfirmLossyFinish(false);
    setPhase("finishing");
    try {
      const raw = await finishListeningExam(payload.examSessionId);
      if (userId) clearListeningExamIntent(userId);
      // The backend returns a full result — correct/total, percentage, its own
      // criterion verdict, the indicated level (and REDS for Listening). This
      // used to reduce all of it to `record.score`, which for Reading is a
      // RATIO (hence the bare "0.65") and for Listening does not exist at all
      // (hence the literal "Submitted."). See lib/api/examResult.ts.
      setResult(decodeExamResult(raw));
      setPhase("done");
    } catch (err) {
      if (err instanceof FrontendError && (err.code === "quota" || err.code === "entitlement")) {
        setPhase("quota");
        return;
      }
      setMessage(err instanceof FrontendError ? err.message : "This exam session is no longer available.");
      setPhase("error");
    }
  }, [flushUnsaved, userId]);

  const begin = useCallback(async () => {
    let uid = userId;
    if (!uid) {
      const me = (await fetch("/api/auth/me", { credentials: "same-origin" }).then((r) => r.json())) as { userId?: string };
      uid = me.userId ?? "anon";
      setUserId(uid);
    }
    setPhase("starting");
    try {
      const start = await startListeningExam(uid);
      setExam(start);
      setAnswers(start.items.map(() => -1));
      setIndex(0);
      setGlobalReplayBudget(start.globalReplayBudget);
      setGlobalReplaysRemaining(start.globalReplaysRemaining);
      setPhase("live");
    } catch (err) {
      if (err instanceof FrontendError && (err.code === "quota" || err.code === "entitlement")) {
        setPhase("quota");
        return;
      }
      /**
       * The reassurance is conditional because the truth is. See
       * quotaReassurance: it speaks only when the backend answered 4xx, where
       * requireQuota's finish hook has provably refunded the unit; it stays
       * silent for a 5xx or a dropped connection, which is exactly where the
       * old unconditional "You were not charged." could be false.
       */
      setMessage(`Couldn’t start the exam. ${quotaReassurance(err)}`.trim());
      setPhase("error");
    }
  }, [userId]);

  const expire = useCallback(() => {
    if (exam) void finish(exam, true);
  }, [exam, finish]);

  const item = exam?.items[index] ?? null;

  async function choose(choice: number) {
    if (!exam || !item) return;
    setAnswers((prev) => prev.map((value, i) => (i === index ? choice : value)));
    setConfirmLossyFinish(false);
    await persistAnswer(exam.examSessionId, item.position, choice);
  }

  const unsavedPositions = exam ? unsentAnswerPositions(exam.items, answers, saveState) : [];

  async function authorizePlay(): Promise<boolean> {
    if (!exam || !item) return false;
    try {
      const result = await requestListeningPlay(exam.examSessionId, item.position);
      // EXAM-REAL-003 — the server is the authority on the shared budget; this client only
      // mirrors what it returns, same discipline the legacy per-item count would have used.
      if (result.globalReplaysRemaining != null) setGlobalReplaysRemaining(result.globalReplaysRemaining);
      return result.allowed;
    } catch {
      return false;
    }
  }

  return (
    <ExerciseShell
      skill="Listening"
      mode="Exam"
      title="Exam simulation"
      progress={phase === "live" && exam ? { current: index + 1, total: exam.items.length } : null}
      toolbar={
        phase === "live" && exam ? (
          <div className="exam-toolbar">
            <ExamTimer seconds={exam.timeLimitSeconds} onExpire={expire} />
          </div>
        ) : null
      }
    >
      <p className="muted">No transcript — just like the real exam. Seeking is disabled.</p>
      {phase === "gate" ? (
        <ExamDisclaimerGate skill="listening" onAccept={() => void begin()} onCancel={() => router.push("/listening")} />
      ) : null}
      {phase === "starting" ? <p className="muted">Preparing the form…</p> : null}
      {phase === "quota" ? <CommercialCard title="Exam simulation is not available on your current plan." /> : null}
      {phase === "error" ? (
        <article className="home-card">
          <p>{message}</p>
          <button className="btn btn-primary" type="button" onClick={() => setPhase("gate")}>Back</button>
        </article>
      ) : null}
      {phase === "live" && exam && item ? (
        <div className="exam-live">
          {/* EXAM-REAL-003 — the timer and N/M count are now the shell's own toolbar/progress
              props above; this is the one piece they don't render. Null for a legacy session,
              same as before this merge — the shared budget only exists on a real-exam SLP3 session. */}
          {globalReplayBudget != null ? (
            <p className="muted" aria-live="polite">
              {globalReplaysRemaining} of {globalReplayBudget} repeats left (shared across the whole exam)
            </p>
          ) : null}
          <article className="audio-stage">
            <p className="home-kicker">Audio</p>
            <AudioPlayer key={`${exam.examSessionId}-${item.position}`} src={item.audioUrl} allowSeek={false} onPlayRequest={authorizePlay} />
          </article>
          <article className="question-pane">
            <h2>{item.prompt || "Choose the best answer."}</h2>
            <OptionList
              options={item.options}
              selected={answers[index] != null && answers[index]! >= 0 ? answers[index]! : null}
              locked={false}
              onSelect={(choice) => void choose(choice)}
            />
            {/* ER-02 — the learner must never believe an answer is recorded
                when the server does not have it. Finish posts only the session
                id, so an undelivered answer is scored as blank. */}
            {/* A short badge on the item itself; the panel below carries the
                explanation once, rather than repeating the same sentence. */}
            {saveState[item.position] === "failed" ? (
              <p className="state state-error is-inline" role="status">
                {blockedReason ? "Not recorded" : "Not recorded yet"}
              </p>
            ) : null}
            {unsavedPositions.length > 0 ? (
              <div className="state state-error is-panel" role="alert">
                <strong className="state-title">
                  {unsavedPositions.length === 1
                    ? `Question ${unsavedPositions[0]} hasn't reached the server`
                    : `${unsavedPositions.length} answers haven't reached the server`}
                </strong>
                <p>
                  {blockedReason
                    ? `${BLOCKED_MESSAGE[blockedReason] ?? BLOCKED_MESSAGE.default} Finishing will score them as unanswered.`
                    : "Finishing now would score them as unanswered. Re-sending is safe — an answer cannot be counted twice."}
                </p>
                {!blockedReason ? (
                  <div className="cta-row state-actions">
                    <button className="btn btn-primary" type="button" onClick={() => void flushUnsaved(exam)}>
                      Re-send
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
            {/* Finish is never blocked — a permanent save failure must not trap
                the learner inside a timed exam. It is acknowledged instead. */}
            {confirmLossyFinish ? (
              <div className="state state-error is-panel" role="alert">
                <strong className="state-title">
                  Finish with {lostPositions.length === 1 ? "1 answer" : `${lostPositions.length} answers`} unrecorded?
                </strong>
                <p>
                  {lostPositions.length === 1 ? "Question" : "Questions"} {lostPositions.join(", ")} will be
                  marked unanswered in your result.
                </p>
                <div className="cta-row state-actions">
                  <button className="btn btn-outline" type="button" onClick={() => setConfirmLossyFinish(false)}>
                    Keep trying
                  </button>
                  <button className="btn btn-primary" type="button" onClick={() => void finish(exam, true)}>
                    Finish anyway
                  </button>
                </div>
              </div>
            ) : null}
            <div className="cta-row">
              <button className="btn btn-outline" type="button" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>Previous</button>
              <button className="btn btn-outline" type="button" disabled={index >= exam.items.length - 1} onClick={() => setIndex((i) => i + 1)}>Next</button>
              <button className="btn btn-primary" type="button" onClick={() => void finish(exam)}>Finish exam</button>
            </div>
          </article>
        </div>
      ) : null}
      {phase === "finishing" ? <p className="muted">Submitting…</p> : null}
      {phase === "done" && lostPositions.length > 0 ? (
        <div className="state state-error is-panel" role="alert">
          <strong className="state-title">
            {lostPositions.length === 1 ? "1 answer" : `${lostPositions.length} answers`} never reached the server
          </strong>
          <p>
            {lostPositions.length === 1 ? "Question" : "Questions"} {lostPositions.join(", ")} were scored as
            unanswered. The result below is the server&apos;s, and it reflects that.
          </p>
        </div>
      ) : null}
      {phase === "done" ? (
        <ExamResultCard
          result={result}
          skill="Listening"
          backHref="/listening"
          backLabel="Back to Listening"
          practiceHref="/listening/practice"
        />
      ) : null}
    </ExerciseShell>
  );
}
