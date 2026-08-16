"use client";

import { useMemo, useState } from "react";
import { FrontendError } from "@/lib/api/client";
import { postSpeakingEvaluate } from "@/lib/api/speaking";
import { decodeSpeakingEvaluate, speakingEvaluateKey, type SpeakingEvaluateResult } from "@/lib/speaking/evaluate";
import { promptsForLevel, type SpeakingPrompt } from "@/lib/speaking/prompts";
import { CommercialCard, ExerciseShell } from "@/components/exercise/ExerciseShell";
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
      <ExerciseShell skill="Speaking" mode="Practice" title="Speaking AI consent">
        <p>Audio is sent to the backend for transcription and evaluation. This consent is separate from Coach.</p>
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
    <ExerciseShell skill="Speaking" mode="Practice" title={prompt?.title ?? "Speaking practice"}>
      <p>{prompt?.instruction}</p>
      <p className="muted">No local score is computed. A single task never shows a decimal band.</p>
      <div className="admin-row" style={{ margin: "12px 0" }}>
        <button className="btn btn-outline" type="button" onClick={() => setIndex((value) => (value + 1) % prompts.length)}>
          Next prompt
        </button>
      </div>
      <SpeakingRecorder
        maxSeconds={180}
        allowRerecord
        onBlob={(next, duration) => {
          setBlob(next);
          setSeconds(duration);
        }}
      />
      {phase === "evaluating" ? <p>Evaluating… do not resubmit.</p> : null}
      {phase === "quota" ? <CommercialCard title="Speaking AI feedback is not available on your current plan." /> : null}
      {phase === "error" ? <p className="err" role="alert">{message}</p> : null}
      {phase === "result" && result ? <SpeakingResultCard result={result} /> : null}
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
    </ExerciseShell>
  );
}

export function SpeakingResultCard({ result }: { result: SpeakingEvaluateResult }) {
  const rating = result.rating;
  return (
    <article className="home-card">
      <p className="home-kicker">Result</p>
      <h2>{rating.credited ? `This task met Level ${rating.levelAttempted}` : `This task did not meet Level ${rating.levelAttempted}`}</h2>
      <p className="muted">No band yet. A single task does not receive a decimal SLP.</p>
      {!rating.ratable ? <p>{rating.ratableReason || "Insufficient evidence to rate this attempt."}</p> : null}
      <ul>
        {(["content", "tasks", "accuracy", "textProduced"] as const).map((key) => (
          <li key={key}>
            {key}: {rating.criteria[key].met ? "met" : "not met"}
            {rating.criteria[key].note ? ` — ${rating.criteria[key].note}` : ""}
          </li>
        ))}
      </ul>
    </article>
  );
}

export function pickPrompt(_prompts: SpeakingPrompt[], index: number): SpeakingPrompt | undefined {
  return _prompts[index];
}
