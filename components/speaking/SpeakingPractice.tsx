"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FrontendError } from "@/lib/api/client";
import { postSpeakingEvaluate } from "@/lib/api/speaking";
import { decodeSpeakingEvaluate, speakingEvaluateKey, type SpeakingEvaluateResult } from "@/lib/speaking/evaluate";
import { promptsForLevel, type SpeakingPrompt } from "@/lib/speaking/prompts";
import { CommercialCard, ExerciseShell } from "@/components/exercise/ExerciseShell";
import { EvaluatingPanel } from "@/components/writing/EvaluatingPanel";
import { SpeakingRecorder } from "./SpeakingRecorder";

const CONSENT = (userId: string) => `speaking_ai_consent_given:${userId}`;

export function SpeakingPractice({ userId, level }: { userId: string; level: "2" | "3" }) {
  const prompts = useMemo(() => promptsForLevel(level), [level]);
  const [consent, setConsent] = useState(() => {
    try {
      return localStorage.getItem(CONSENT(userId)) === "1";
    } catch {
      return false;
    }
  });
  const [index, setIndex] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const [phase, setPhase] = useState<"ready" | "evaluating" | "result" | "quota" | "error">("ready");
  const [result, setResult] = useState<SpeakingEvaluateResult | null>(null);
  const [message, setMessage] = useState("");
  const prompt = prompts[index] ?? prompts[0];

  if (!consent) {
    return (
      <ExerciseShell skill="Speaking" mode="Practice" title="Speaking AI consent" layout="stage">
        <article className="skill-primary">
          <p className="home-kicker">Before you start</p>
          <h2>Audio consent</h2>
          <p>Audio is sent to the backend for transcription and evaluation. This consent is separate from Coach.</p>
          <div className="cta-row">
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => {
                localStorage.setItem(CONSENT(userId), "1");
                setConsent(true);
              }}
            >
              I agree
            </button>
          </div>
        </article>
      </ExerciseShell>
    );
  }

  async function submit() {
    if (!blob || !prompt || phase === "evaluating") return;
    setConfirm(false);
    setPhase("evaluating");
    setMessage("");
    const form = new FormData();
    form.set("audio", blob, "speaking.m4a");
    form.set("prompt_id", prompt.id);
    form.set("prompt_title", prompt.title);
    form.set("prompt_text", prompt.instruction);
    form.set("duration_seconds", String(seconds));
    form.set("target_level", prompt.level);
    form.set("mode", "practice");
    try {
      const key = await speakingEvaluateKey("speaking.m4a", seconds);
      const raw = await postSpeakingEvaluate(form, key);
      const decoded = decodeSpeakingEvaluate(raw);
      if (!decoded) {
        setMessage("The evaluator did not return a usable result.");
        setPhase("error");
        return;
      }
      setResult(decoded);
      setPhase("result");
    } catch (err) {
      if (err instanceof FrontendError && (err.code === "quota" || err.code === "entitlement")) {
        setPhase("quota");
        return;
      }
      setMessage(err instanceof FrontendError ? err.message : "Evaluation failed. You were not charged if this did not complete.");
      setPhase("error");
    }
  }

  return (
    <ExerciseShell skill="Speaking" mode="Practice" title={prompt?.title ?? "Speaking practice"} layout="stage">
      <div className="speak-stage">
      <div className="speak-brief">
        <p className="p-eyebrow">Your task</p>
        <p className="speak-instruction">{prompt?.instruction}</p>
        <p className="muted">No local score is computed. A single task never shows a decimal band.</p>
      </div>
      <SpeakingRecorder
        maxSeconds={180}
        allowRerecord
        onBlob={(next, duration) => {
          setBlob(next);
          setSeconds(duration);
        }}
      />
      {phase === "evaluating" ? (
        <EvaluatingPanel
          heading="Your recording is with the evaluator."
          body="Transcribed and scored against the rubric, server-side. Do not resubmit — the page will update the moment it's back."
        />
      ) : null}
      {phase === "quota" ? <CommercialCard title="Speaking AI feedback is not available on your current plan." /> : null}
      {phase === "error" ? <p className="err" role="alert">{message}</p> : null}
      {phase === "result" && result ? (
        <SpeakingResultCard
          result={result}
          onNext={() => {
            setPhase("ready");
            setResult(null);
            setBlob(null);
            setConfirm(false);
            setIndex((value) => (value + 1) % prompts.length);
          }}
          nextLabel="Practice another prompt"
          primaryAction
          secondaryHref="/speaking/history"
          secondaryLabel="See speaking history"
        />
      ) : null}
      {phase !== "evaluating" && phase !== "result" ? (
        <div className="speak-alt">
          <button className="btn btn-ghost" type="button" onClick={() => setIndex((value) => (value + 1) % prompts.length)}>
            Try a different prompt
          </button>
        </div>
      ) : null}
      {blob && phase !== "evaluating" && phase !== "result" ? (
        confirm ? (
          <div>
            <p>Submit this recording for evaluation? This uses one speaking credit and is not retried automatically.</p>
            <button className="btn btn-primary" type="button" onClick={() => void submit()}>
              Confirm submit
            </button>
          </div>
        ) : (
          <button className="btn btn-primary" type="button" onClick={() => setConfirm(true)} style={{ marginTop: 16 }}>
            Submit for evaluation
          </button>
        )
      ) : null}
      </div>
    </ExerciseShell>
  );
}

const CRITERIA_LABEL: Record<"content" | "tasks" | "accuracy" | "textProduced", string> = {
  content: "Content",
  tasks: "Task fulfilment",
  accuracy: "Accuracy",
  textProduced: "Text produced",
};

export function SpeakingResultCard({
  result,
  onNext,
  nextLabel = "Continue",
  primaryAction = false,
  secondaryHref,
  secondaryLabel,
}: {
  result: SpeakingEvaluateResult;
  /** Omitted in the exam's per-task list, where one shared footer follows all three results instead of one per card. */
  onNext?: () => void;
  nextLabel?: string;
  primaryAction?: boolean;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  const rating = result.rating;
  return (
    <article className="speaking-result p-ignite">
      <p className="section-eyebrow">Speaking assessment</p>
      <div className="writing-result-verdict p-reveal-item" style={{ ["--i" as string]: 0 }}>
        <p className="home-kicker">Verdict</p>
        <p>{rating.credited ? `This task met Level ${rating.levelAttempted}` : `This task did not meet Level ${rating.levelAttempted}`}</p>
      </div>
      <p className="muted">No band yet. A single task does not receive a decimal SLP.</p>
      {!rating.ratable ? <p className="err">{rating.ratableReason || "Insufficient evidence to rate this attempt."}</p> : null}
      <ul className="criteria-list">
        {(["content", "tasks", "accuracy", "textProduced"] as const).map((key, i) => (
          <li key={key} className="p-reveal-item" style={{ ["--i" as string]: i + 1 }}>
            <span className={`criteria-status ${rating.criteria[key].met ? "met" : "unmet"}`}>
              {rating.criteria[key].met ? "Met" : "Not met"}
            </span>
            <span className="criteria-body">
              <strong>{CRITERIA_LABEL[key]}</strong>
              {rating.criteria[key].note ? <p>{rating.criteria[key].note}</p> : null}
            </span>
          </li>
        ))}
      </ul>
      {onNext ? (
        <footer className="assessment-next p-reveal-item" style={{ ["--i" as string]: 5 }}>
          <div className="assessment-next-actions">
            <button className={primaryAction ? "btn btn-primary" : "btn btn-outline"} type="button" onClick={onNext}>
              {nextLabel}
            </button>
            {secondaryHref ? (
              <Link className="assessment-next-link" href={secondaryHref}>
                {secondaryLabel}
                <span className="p-arrow" aria-hidden="true">→</span>
              </Link>
            ) : null}
          </div>
        </footer>
      ) : null}
    </article>
  );
}

export function pickPrompt(_prompts: SpeakingPrompt[], index: number): SpeakingPrompt | undefined {
  return _prompts[index];
}
