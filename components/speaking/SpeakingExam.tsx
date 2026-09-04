"use client";

import { useEffect, useMemo, useState } from "react";
import { FrontendError } from "@/lib/api/client";
import { postSpeakingEvaluate } from "@/lib/api/speaking";
import { canSubmitSpeaking, decodeSpeakingEvaluate, speakingEvaluateKey, summariseExamTasks, type SpeakingEvaluateResult } from "@/lib/speaking/evaluate";
import { selectExamPrompts } from "@/lib/speaking/prompts";
import { ExamDisclaimerGate } from "@/components/exercise/ExamDisclaimerGate";
import { CommercialCard, ExerciseShell } from "@/components/exercise/ExerciseShell";
import { SpeakingRecorder } from "./SpeakingRecorder";
import { SpeakingResultCard } from "./SpeakingPractice";

type Phase = "gate" | "consent" | "intro" | "prep" | "recording" | "transition" | "evaluating" | "result" | "failed" | "quota";

const CONSENT = (userId: string) => `speaking_ai_consent_given:${userId}`;

export function SpeakingExam({ userId, level }: { userId: string; level: "2" | "3" }) {
  const prompts = useMemo(() => selectExamPrompts(level), [level]);
  const examSessionId = useMemo(() => crypto.randomUUID(), []);
  const [phase, setPhase] = useState<Phase>("gate");
  const [index, setIndex] = useState(0);
  const [prepLeft, setPrepLeft] = useState(60);
  // `takeId` rides with each clip: the evaluate key was a hash of a constant
  // filename plus the whole-second duration, so two clips of the same length —
  // in one sitting or across two — collided and the second was answered from
  // the first's cached evaluation. See speakingEvaluateKey.
  const [clips, setClips] = useState<Array<{ blob: Blob; seconds: number; takeId: string } | null>>([null, null, null]);
  const [results, setResults] = useState<SpeakingEvaluateResult[]>([]);
  const [message, setMessage] = useState("");
  const prompt = prompts[index];

  useEffect(() => {
    if (phase !== "prep") return;
    setPrepLeft(60);
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
  }, [phase, index]);

  useEffect(() => {
    if (phase !== "consent") return;
    try {
      if (localStorage.getItem(CONSENT(userId)) === "1") setPhase("intro");
    } catch {
      /* ignore */
    }
  }, [phase, userId]);

  if (phase === "gate") {
    return (
      <ExamDisclaimerGate
        skill="Speaking"
        onAccept={() => setPhase("consent")}
        onCancel={() => {
          window.location.href = "/speaking";
        }}
      />
    );
  }

  if (phase === "consent") {
    return (
      <ExerciseShell skill="Speaking" mode="Exam" title="Speaking AI consent">
        <p>Exam recordings are evaluated by the backend. This consent is separate from Coach.</p>
        <button
          className="btn btn-primary"
          type="button"
          onClick={() => {
            localStorage.setItem(CONSENT(userId), "1");
            setPhase("intro");
          }}
        >
          I agree
        </button>
      </ExerciseShell>
    );
  }

  async function evaluateAll() {
    setPhase("evaluating");
    const nextResults: SpeakingEvaluateResult[] = [];
    for (let i = 0; i < 3; i += 1) {
      const clip = clips[i];
      const item = prompts[i];
      if (!clip || !item) {
        setPhase("failed");
        setMessage("A recording was missing. The exam stopped.");
        return;
      }
      const form = new FormData();
      form.set("audio", clip.blob, "speaking.m4a");
      form.set("prompt_id", item.id);
      form.set("prompt_title", item.title);
      form.set("prompt_text", item.instruction);
      form.set("duration_seconds", String(clip.seconds));
      form.set("target_level", item.level);
      form.set("mode", "exam");
      form.set("exam_session_id", examSessionId);
      try {
        const key = await speakingEvaluateKey(clip.takeId, clip.seconds);
        const raw = await postSpeakingEvaluate(form, key);
        const decoded = decodeSpeakingEvaluate(raw);
        if (decoded) nextResults.push(decoded);
      } catch (err) {
        if (err instanceof FrontendError && (err.code === "quota" || err.code === "entitlement")) {
          setPhase("quota");
          setResults(nextResults);
          return;
        }
        setPhase("failed");
        setMessage(err instanceof FrontendError ? err.message : "Evaluation failed. Remaining tasks were not retried.");
        setResults(nextResults);
        return;
      }
    }
    setResults(nextResults);
    setPhase("result");
  }

  if (phase === "intro") {
    return (
      <ExerciseShell skill="Speaking" mode="Exam" title="Speaking exam">
        <p>Three prompts. 60 seconds to prepare (skippable). Record at least 15 seconds. Re-record is not allowed. The backend evaluates after all three clips.</p>
        <p className="muted">They do not average out. A single task never receives a decimal band.</p>
        <button className="btn btn-primary" type="button" onClick={() => setPhase("prep")}>
          Begin
        </button>
      </ExerciseShell>
    );
  }

  if (phase === "prep") {
    return (
      <ExerciseShell skill="Speaking" mode={`Prompt ${index + 1} of 3`} title={prompt.title}>
        <p>{prompt.instruction}</p>
        <p>Prepare: {prepLeft}s</p>
        <button className="btn btn-outline" type="button" onClick={() => setPhase("recording")}>
          Skip prep
        </button>
      </ExerciseShell>
    );
  }

  if (phase === "recording") {
    return (
      <ExerciseShell skill="Speaking" mode={`Prompt ${index + 1} of 3`} title={prompt.title}>
        <p>{prompt.instruction}</p>
        <SpeakingRecorder
          maxSeconds={prompt.suggestedSeconds || 90}
          minSubmitSeconds={15}
          allowRerecord={false}
          onBlob={(blob, seconds, takeId) => {
            if (!blob) {
              setPhase("failed");
              setMessage("The recording was interrupted. The exam cannot continue.");
              return;
            }
            if (!canSubmitSpeaking(seconds, 15)) return;
            const next = clips.slice() as Array<{ blob: Blob; seconds: number; takeId: string } | null>;
            next[index] = { blob, seconds, takeId: takeId ?? `clip-${index}-${seconds}` };
            setClips(next);
          }}
        />
        {clips[index] ? (
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => {
              if (index < 2) {
                setIndex(index + 1);
                setPhase("transition");
                window.setTimeout(() => setPhase("prep"), 1500);
              } else {
                void evaluateAll();
              }
            }}
          >
            {index < 2 ? "Next prompt" : "Submit exam"}
          </button>
        ) : null}
      </ExerciseShell>
    );
  }

  if (phase === "transition") {
    return (
      <ExerciseShell skill="Speaking" mode="Exam" title="Next task">
        <p>Moving to the next prompt…</p>
      </ExerciseShell>
    );
  }

  if (phase === "evaluating") {
    return (
      <ExerciseShell skill="Speaking" mode="Exam" title="Evaluating">
        <p>Submitting {results.length + 1} of 3. This is not retried automatically.</p>
      </ExerciseShell>
    );
  }

  if (phase === "quota") {
    return (
      <ExerciseShell skill="Speaking" mode="Exam" title="Plan limit">
        <CommercialCard title="Speaking AI feedback is not available on your current plan." />
      </ExerciseShell>
    );
  }

  if (phase === "failed") {
    return (
      <ExerciseShell skill="Speaking" mode="Exam" title="Exam stopped">
        <p className="err" role="alert">{message}</p>
      </ExerciseShell>
    );
  }

  /**
   * An UNASSESSED task is not a failed one.
   *
   * THE BUG THIS FIXES. The denominator was `results.length` — every task
   * attempted — while the numerator counted only `rating.credited`. A take the
   * engine declined to judge (too short to rate, no verdict returned) is
   * neither credited nor rated, so it was silently absorbed into the failures:
   * a learner who met the standard on one task, missed it on one, and had one
   * that was never assessed read "You met the full standard in 1 of 3 tasks."
   *
   * The card below each task already says "This take was not assessed", so this
   * line was also contradicting the detail directly under it. The rated tasks
   * are the ones a proportion can honestly be taken over; the rest are counted
   * out loud rather than folded in.
   */
  const { rated, credited, unassessed } = summariseExamTasks(results);
  return (
    <ExerciseShell skill="Speaking" mode="Exam" title="Exam result">
      {rated > 0 ? (
        <p>
          You met the full standard in {credited} of {rated}{" "}
          {rated === 1 ? "assessed task" : "assessed tasks"}.
        </p>
      ) : (
        <p>None of your tasks were assessed, so no standard was measured.</p>
      )}
      {unassessed > 0 ? (
        <p className="muted">
          {unassessed === 1 ? "One task was" : `${unassessed} tasks were`} not assessed and {unassessed === 1 ? "is" : "are"}{" "}
          not counted above.
        </p>
      ) : null}
      {results.map((item) => (
        <SpeakingResultCard key={item.attemptId} result={item} />
      ))}
    </ExerciseShell>
  );
}
