"use client";

import { useMemo, useState } from "react";
import { FrontendError } from "@/lib/api/client";
import { postSpeakingEvaluate } from "@/lib/api/speaking";
import { decodeSpeakingEvaluate, speakingEvaluateKey, wasRated, type SpeakingEvaluateResult } from "@/lib/speaking/evaluate";
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
  /** Identifies THIS take; see speakingEvaluateKey for why it must not be a constant. */
  const [takeId, setTakeId] = useState<string | null>(null);
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
      const key = await speakingEvaluateKey(takeId ?? "no-take", seconds);
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
      /**
       * The client cannot observe billing, so it must not make a claim about
       * it. This said "You were not charged if this did not complete", which
       * was unverifiable here — and, on the paths that matter, unnecessary:
       * requireQuota consumes the allowance before the handler runs and its own
       * `res.on("finish")` hook refunds it on ANY 4xx/5xx (entitlements.js).
       * That hook is long-standing; an earlier pass in this project wrongly
       * read it as absent and added a second manual refund, which double-
       * credited every rejected upload until it was removed.
       *
       * What this message can honestly say is what the learner should do. The
       * conditional reassurance lives in `quotaReassurance`, which speaks only
       * where the client can actually know.
       */
      setMessage(
        err instanceof FrontendError
          ? err.message
          : "The evaluation did not complete. Your recording is still here — submit it again.",
      );
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
      {/* Keyed on the prompt so switching task drops the recorder's own take
          (its object URL and "stopped" state), not just the parent's copy of
          the blob. The unmount cleanup calls stopTracks() only — it does not
          fire onBlob(null, 0) — so this cannot race the reset above. */}
      <SpeakingRecorder
        key={prompt?.id ?? index}
        maxSeconds={180}
        allowRerecord
        onBlob={(next, duration, id) => {
          setBlob(next);
          setSeconds(duration);
          setTakeId(id);
        }}
      />
      {phase === "evaluating" ? <p>Evaluating… do not resubmit.</p> : null}
      {phase === "quota" ? <CommercialCard title="Speaking AI feedback is not available on your current plan." /> : null}
      {phase === "error" ? <p className="err" role="alert">{message}</p> : null}
      {phase === "result" && result ? <SpeakingResultCard result={result} /> : null}
      {phase !== "evaluating" && phase !== "result" ? (
        <div className="speak-alt">
          <button
            className="btn btn-ghost"
            type="button"
            /**
             * Changing the prompt invalidates the take.
             *
             * THE BUG THIS FIXES. This used to call setIndex alone. `blob`,
             * `seconds` and `confirm` all survived, the recorder was not
             * remounted, and the Submit button stayed rendered because it is
             * gated only on `blob`. So: record an answer to prompt A, press
             * "Try a different prompt", press "Submit for evaluation" — and
             * the FormData carried prompt B's id, title, text and target
             * level with prompt A's audio. The backend rated a recording
             * against a task it never heard, the learner was charged a
             * speaking credit, and the near-certain "task not met" verdict
             * was manufactured entirely by this component's state handling.
             *
             * The recorder is keyed on the prompt id below so its own
             * internal take is dropped too, not just the parent's copy.
             */
            onClick={() => {
              setIndex((value) => (value + 1) % prompts.length);
              setBlob(null);
              setSeconds(0);
              setTakeId(null);
              setConfirm(false);
              setPhase("ready");
              setMessage("");
            }}
          >
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

export function SpeakingResultCard({ result }: { result: SpeakingEvaluateResult }) {
  const rating = result.rating;
  const rated = wasRated(rating);
  return (
    <article className="speaking-result p-ignite">
      <p className="section-eyebrow">Speaking assessment</p>
      <div className="writing-result-verdict p-reveal-item" style={{ ["--i" as string]: 0 }}>
        <p className="home-kicker">Verdict</p>
        <p>
          {!rated
            ? "Not assessed"
            : rating.credited
              ? `This task met Level ${rating.levelAttempted}`
              : `This task did not meet Level ${rating.levelAttempted}`}
        </p>
      </div>
      <p className="muted">No band yet. A single task does not receive a decimal SLP.</p>
      {/* `ratableReason` is present on EVERY practice attempt by design — a
          single task is never a ratable sample — so styling it as an error
          painted a red line under every successful evaluation. It is a note
          about scope, not a fault. */}
      {!rating.ratable && rating.ratableReason ? (
        <p className="muted">{rating.ratableReason}</p>
      ) : null}

      {/* When the engine declined to judge, say so. Rendering four "Not met"
          chips from an absent verdict told the learner they had failed all four
          criteria on a recording that was never assessed. */}
      {rated ? (
        <ul className="criteria-list">
          {(["content", "tasks", "accuracy", "textProduced"] as const).map((key, i) => {
            const met = rating.criteria[key].met;
            return (
              <li key={key} className="p-reveal-item" style={{ ["--i" as string]: i + 1 }}>
                <span className={`criteria-status ${met === null ? "unknown" : met ? "met" : "unmet"}`}>
                  {met === null ? "Not judged" : met ? "Met" : "Not met"}
                </span>
                <span className="criteria-body">
                  <strong>{CRITERIA_LABEL[key]}</strong>
                  {rating.criteria[key].note ? <p>{rating.criteria[key].note}</p> : null}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="state state-empty is-panel" role="status">
          <strong className="state-title">This take was not assessed</strong>
          <p>
            {rating.failedOn.includes("insufficient_response")
              ? "The recording was too short to judge against the criteria. Record a longer answer and submit again."
              : "The evaluator did not return a verdict for this take. Nothing about your record has changed."}
          </p>
        </div>
      )}
    </article>
  );
}

export function pickPrompt(_prompts: SpeakingPrompt[], index: number): SpeakingPrompt | undefined {
  return _prompts[index];
}
