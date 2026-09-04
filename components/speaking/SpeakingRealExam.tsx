"use client";

// EXAM-REAL-003, Checkpoint 3 — SLP3 Real Exam Speaking, Web.
//
// Renders the flow server.js's five /api/speaking/exam/* routes drive:
//   start -> warm-up (x3, unscored) -> transition -> [prep -> record -> examiner
//   follow-up(s) -> next task] x N -> finish -> result
//
// The backend is the sole authority on phase, timing, turn counts and scoring — this
// component never counts turns, decides when a task is "done", or invents a score. Every
// transition is driven by whatever the last /respond, /warmup/respond or /state response
// said, exactly like ListeningExam.tsx never derives lifecycle state of its own.
//
// Distinct from the LEGACY components/speaking/SpeakingExam.tsx (3 fixed client-known
// prompts, one evaluate-all-at-the-end call) — that component is untouched and still
// serves every non-SLP3 candidate; app/(app)/speaking/exam/page.tsx decides which of the
// two a candidate gets, mirroring the backend's own getListeningDesiredLevel gate.

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FrontendError } from "@/lib/api/client";
import { quotaReassurance } from "@/lib/api/errors";
import type {
  SpeakingExamFinish,
  SpeakingExamState,
  SpeakingExamTask,
  SpeakingExaminerTurn,
  SpeakingWarmupTurn,
} from "@/lib/api/speakingExam";
import {
  clearSpeakingExamIntent,
  finishSpeakingExam,
  loadSpeakingExamState,
  startSpeakingExam,
  submitTaskResponse,
  submitWarmupResponse,
} from "@/lib/speaking/examSession";
import { ExamDisclaimerGate } from "@/components/exercise/ExamDisclaimerGate";
import { CommercialCard, ExerciseShell } from "@/components/exercise/ExerciseShell";
import { ExamTimer } from "@/components/exercise/ExamTimer";
import { SpeakingRecorder } from "./SpeakingRecorder";

type Phase =
  | "gate"
  | "starting"
  | "resuming"
  | "warmup"
  | "warmup-submitting"
  | "transition"
  | "prep"
  | "recording"
  | "submitting"
  | "examiner-turn"
  | "task-transition"
  | "finishing"
  | "result"
  | "quota"
  | "error";

function storageKey(userId: string): string {
  return `speaking_real_exam_session:${userId}`;
}

export function SpeakingRealExam({ userId }: { userId: string }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("gate");
  const [examSessionId, setExamSessionId] = useState<string | null>(null);
  const [timeLimitSeconds, setTimeLimitSeconds] = useState<number | null>(null);
  const [warmup, setWarmup] = useState<SpeakingWarmupTurn | null>(null);
  const [task, setTask] = useState<SpeakingExamTask | null>(null);
  const [pendingExaminerTurn, setPendingExaminerTurn] = useState<SpeakingExaminerTurn | null>(null);
  const [tasksCompleted, setTasksCompleted] = useState(0);
  const [prepLeft, setPrepLeft] = useState(0);
  const [message, setMessage] = useState("");
  const [finalResult, setFinalResult] = useState<SpeakingExamFinish | null>(null);
  const examSessionIdRef = useRef<string | null>(null);
  examSessionIdRef.current = examSessionId;

  const persistSession = useCallback(
    (id: string) => {
      try {
        sessionStorage.setItem(storageKey(userId), id);
      } catch {
        /* best-effort — a lost resume marker just means a refresh restarts the exam */
      }
    },
    [userId],
  );
  const clearStoredSession = useCallback(() => {
    try {
      sessionStorage.removeItem(storageKey(userId));
    } catch {
      /* ignore */
    }
  }, [userId]);

  const finish = useCallback(
    async (id: string) => {
      setPhase("finishing");
      try {
        const result = await finishSpeakingExam(id);
        clearSpeakingExamIntent(userId);
        clearStoredSession();
        setFinalResult(result);
        setPhase("result");
      } catch (err) {
        setMessage(err instanceof FrontendError ? err.message : "Could not retrieve the exam result.");
        setPhase("error");
      }
    },
    [userId, clearStoredSession],
  );

  const hydrateFromState = useCallback(
    (id: string, state: SpeakingExamState) => {
      setExamSessionId(id);
      setTimeLimitSeconds(state.timeLimitSeconds);
      setTasksCompleted(state.tasksCompleted);
      if (state.terminal) {
        void finish(id);
        return;
      }
      if (state.phase === "warmup") {
        setWarmup(state.warmup);
        setPhase("warmup");
        return;
      }
      setTask(state.task);
      if (state.pendingExaminerTurn) {
        setPendingExaminerTurn(state.pendingExaminerTurn);
        setPhase("examiner-turn");
        return;
      }
      // A fresh task the candidate has not yet recorded a first response to (turnsSoFar
      // === 0) goes to prep; one where they had already recorded but the tab closed
      // before the server's reply arrived goes straight to recording — the backend's own
      // concurrency guard (expectedUpdatedAt) is what actually protects a real double
      // submission, not anything decided here.
      setPendingExaminerTurn(null);
      setPhase(state.turnsSoFar > 0 ? "recording" : "prep");
    },
    [finish],
  );

  // Resume-on-mount: backend is the sole source of truth for what to show — this never
  // reconstructs UI state from anything except a fresh /exam/state response.
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = sessionStorage.getItem(storageKey(userId));
    } catch {
      /* ignore */
    }
    if (!stored) return;
    const id = stored;
    setPhase("resuming");
    void loadSpeakingExamState(id)
      .then((state) => hydrateFromState(id, state))
      .catch(() => {
        clearStoredSession();
        setPhase("gate");
      });
    // Runs once on mount only — resume is a one-time check, not a subscription.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const begin = useCallback(async () => {
    setPhase("starting");
    try {
      const start = await startSpeakingExam(userId);
      setExamSessionId(start.examSessionId);
      persistSession(start.examSessionId);
      setTimeLimitSeconds(start.timeLimitSeconds);
      setWarmup(start.warmup);
      setPhase("warmup");
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
      setMessage(
        err instanceof FrontendError
          ? err.message
          : `Couldn’t start the exam. ${quotaReassurance(err)}`.trim(),
      );
      setPhase("error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const expire = useCallback(() => {
    const id = examSessionIdRef.current;
    if (id) void finish(id);
  }, [finish]);

  async function onWarmupBlob(blob: Blob | null, seconds: number) {
    if (!blob || !examSessionId) {
      setMessage("The recording was interrupted. The exam cannot continue.");
      setPhase("error");
      return;
    }
    setPhase("warmup-submitting");
    try {
      const result = await submitWarmupResponse(examSessionId, blob, seconds);
      if (!result.warmupComplete) {
        setWarmup(result.warmup);
        setPhase("warmup");
        return;
      }
      setTimeLimitSeconds(result.timeLimitSeconds);
      setTask(result.task);
      setPendingExaminerTurn(null);
      setPhase("transition");
      window.setTimeout(() => setPhase("prep"), 1800);
    } catch (err) {
      setMessage(err instanceof FrontendError ? err.message : "Could not submit the warm-up response.");
      setPhase("error");
    }
  }

  async function onTaskBlob(blob: Blob | null, seconds: number) {
    if (!blob || !examSessionId) {
      setMessage("The recording was interrupted. The exam cannot continue.");
      setPhase("error");
      return;
    }
    setPhase("submitting");
    try {
      const result = await submitTaskResponse(examSessionId, blob, seconds);
      if (!result.taskComplete) {
        setPendingExaminerTurn(result.examinerTurn);
        setPhase("examiner-turn");
        return;
      }
      if (result.sessionComplete) {
        void finish(examSessionId);
        return;
      }
      setTask(result.task);
      setPendingExaminerTurn(null);
      setTasksCompleted((n) => n + 1);
      setPhase("task-transition");
      window.setTimeout(() => setPhase("prep"), 1500);
    } catch (err) {
      setMessage(err instanceof FrontendError ? err.message : "Could not submit the response.");
      setPhase("error");
    }
  }

  // Preparation countdown — client-side display only. The 45s figure itself is never
  // invented here: it always comes from task.preparationSeconds, which the backend
  // derives from lib/speakingExamPolicy.js's declared TIMING, not a UI default.
  useEffect(() => {
    if (phase !== "prep" || !task) return;
    setPrepLeft(task.preparationSeconds);
    const id = window.setInterval(() => {
      setPrepLeft((value) => {
        if (value <= 1) {
          window.clearInterval(id);
          setPhase("recording");
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase, task]);

  if (phase === "gate") {
    return <ExamDisclaimerGate skill="Speaking" onAccept={() => void begin()} onCancel={() => router.push("/speaking")} />;
  }
  if (phase === "resuming" || phase === "starting") {
    return (
      <ExerciseShell skill="Speaking" mode="Exam" title="Speaking exam">
        <p className="muted">{phase === "resuming" ? "Resuming your exam…" : "Preparing the exam…"}</p>
      </ExerciseShell>
    );
  }
  if (phase === "quota") {
    return (
      <ExerciseShell skill="Speaking" mode="Exam" title="Plan limit">
        <CommercialCard title="Speaking exam simulation is not available on your current plan." />
      </ExerciseShell>
    );
  }
  if (phase === "error") {
    return (
      <ExerciseShell skill="Speaking" mode="Exam" title="Exam stopped">
        <p className="err" role="alert">{message}</p>
        <button className="btn btn-primary" type="button" onClick={() => router.push("/speaking")}>
          Back to Speaking
        </button>
      </ExerciseShell>
    );
  }
  if (phase === "finishing") {
    return (
      <ExerciseShell skill="Speaking" mode="Exam" title="Finishing">
        <p className="muted">Scoring your session…</p>
      </ExerciseShell>
    );
  }
  if (phase === "result" && finalResult) {
    return <SpeakingRealExamResult result={finalResult} onDone={() => router.push("/speaking")} />;
  }

  const timer = timeLimitSeconds != null ? <ExamTimer seconds={timeLimitSeconds} onExpire={expire} /> : null;

  if (phase === "warmup" || phase === "warmup-submitting") {
    return (
      <ExerciseShell skill="Speaking" mode="Exam — warm-up (not scored)" title="Warm-up">
        {timer}
        <p className="muted">This warm-up is not evaluated. It is a brief, informal check-in before the timed exam begins.</p>
        {warmup ? (
          <>
            <p className="home-kicker">
              Turn {warmup.turnIndex + 1} of {warmup.totalTurns}
            </p>
            <h2>{warmup.question ?? "…"}</h2>
          </>
        ) : null}
        {phase === "warmup-submitting" ? (
          <p className="muted">Submitting…</p>
        ) : (
          <SpeakingRecorder
            maxSeconds={warmup?.secondsAllotted ?? 100}
            allowRerecord
            onBlob={(blob, seconds) => void onWarmupBlob(blob, seconds)}
          />
        )}
      </ExerciseShell>
    );
  }

  if (phase === "transition") {
    return (
      <ExerciseShell skill="Speaking" mode="Exam" title="Warm-up complete">
        <p>Moving to the evaluated part of the exam…</p>
      </ExerciseShell>
    );
  }
  if (phase === "task-transition") {
    return (
      <ExerciseShell skill="Speaking" mode="Exam" title="Next task">
        <p>Moving to the next task…</p>
      </ExerciseShell>
    );
  }

  if (phase === "prep" && task) {
    return (
      <ExerciseShell skill="Speaking" mode={`Exam — task ${task.taskIndex + 1}`} title={task.prompt?.title ?? "Task"}>
        {timer}
        <p className="muted">{tasksCompleted} task(s) completed so far</p>
        <p>{task.prompt?.instruction}</p>
        <p>Prepare: {prepLeft}s</p>
        <button className="btn btn-outline" type="button" onClick={() => setPhase("recording")}>
          Skip prep
        </button>
      </ExerciseShell>
    );
  }

  if (phase === "recording" && task) {
    return (
      <ExerciseShell skill="Speaking" mode={`Exam — task ${task.taskIndex + 1}`} title={task.prompt?.title ?? "Task"}>
        {timer}
        <p>{task.prompt?.instruction}</p>
        <SpeakingRecorder
          maxSeconds={task.speakingSecondsPerTurn}
          allowRerecord={false}
          onBlob={(blob, seconds) => void onTaskBlob(blob, seconds)}
        />
      </ExerciseShell>
    );
  }

  if (phase === "submitting" && task) {
    return (
      <ExerciseShell skill="Speaking" mode={`Exam — task ${task.taskIndex + 1}`} title={task.prompt?.title ?? "Task"}>
        {timer}
        <p className="muted">Submitting…</p>
      </ExerciseShell>
    );
  }

  if (phase === "examiner-turn" && task && pendingExaminerTurn) {
    return (
      <ExerciseShell skill="Speaking" mode={`Exam — task ${task.taskIndex + 1}`} title="Examiner follow-up">
        {timer}
        <p className="home-kicker">The examiner asks</p>
        <h2>{pendingExaminerTurn.utterance}</h2>
        <SpeakingRecorder
          maxSeconds={task.speakingSecondsPerTurn}
          allowRerecord={false}
          onBlob={(blob, seconds) => void onTaskBlob(blob, seconds)}
        />
      </ExerciseShell>
    );
  }

  return null;
}

function SpeakingRealExamResult({ result, onDone }: { result: SpeakingExamFinish; onDone: () => void }) {
  return (
    <ExerciseShell skill="Speaking" mode="Exam" title="Exam result">
      {result.ratable === false ? (
        <>
          <p>This session was not a ratable sample.</p>
          {result.ratableReason ? <p className="muted">{result.ratableReason}</p> : null}
        </>
      ) : (
        <>
          <p className="home-kicker">Rating</p>
          <h2>{result.rating.ratingText}</h2>
          {result.rating.ceilingUntested ? <p className="muted">Ceiling not tested at this stage count.</p> : null}
        </>
      )}
      <p className="muted">This is educational guidance, not an official SLP result.</p>
      <button className="btn btn-primary" type="button" onClick={onDone}>
        Back to Speaking
      </button>
    </ExerciseShell>
  );
}
