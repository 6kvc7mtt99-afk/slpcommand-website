"use client";

import { useEffect, useRef, useState } from "react";
import { apiRequest, FrontendError } from "@/lib/api/client";
import { newIdempotencyKey } from "@/lib/api/idempotency";
import {
  decodeWritingCorrection,
  decodeWritingPrompt,
  writingSubmitKey,
  type WritingCorrection,
  type WritingPrompt,
} from "@/lib/api/writing";
import { decodeExaminer, type ExaminerResult } from "@/lib/api/writingTools";
import { CommercialCard, ExerciseShell } from "@/components/exercise/ExerciseShell";
import { CommercialDialog } from "@/components/exercise/CommercialDialog";
import { ErrorState, LoadingState } from "@/components/ui/ProductState";
import { ExaminerFeedback } from "./ExaminerFeedback";
import { WritingEditor } from "./WritingEditor";
import { WritingResultCard } from "./WritingResultCard";

const MIN = 80;
const MAX = 8000;
const FEEDBACK_MIN = 40;

export function WritingPractice() {
  const [phase, setPhase] = useState<"loading" | "draft" | "evaluating" | "result" | "quota" | "error">("loading");
  const [prompt, setPrompt] = useState<WritingPrompt | null>(null);
  const [draft, setDraft] = useState("");
  const [result, setResult] = useState<WritingCorrection | null>(null);
  const [message, setMessage] = useState("");
  const started = useRef(Date.now());
  // A second, optional, quota-metered call — kept independent of `phase`
  // so a paywall or a read on this doesn't blow away the draft or the
  // submit flow the way the main phase machine does.
  const [feedback, setFeedback] = useState<ExaminerResult | null>(null);
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");
  const [feedbackPaywall, setFeedbackPaywall] = useState(false);

  async function loadPrompt() {
    setPhase("loading");
    setDraft("");
    setResult(null);
    setMessage("");
    setFeedback(null);
    setFeedbackError("");
    started.current = Date.now();
    try {
      // No fallback default: a real target level is required to ask for an
      // appropriately-leveled prompt. If /profile fails, this throws into
      // the catch below and shows the real "unavailable" state instead of
      // silently guessing SLP 3.
      const profile = await apiRequest<{ target_level?: string }>("/profile");
      const rawLevel = profile.target_level === "2+" ? "2+" : profile.target_level === "2" ? "2" : "3";
      const target = encodeURIComponent(rawLevel);
      const raw = await apiRequest<unknown>(`/writing/prompts/next?mode=practice&targetLevel=${target}`);
      const next = decodeWritingPrompt(raw);
      if (!next) throw new Error("invalid_prompt");
      setPrompt(next);
      setPhase("draft");
    } catch (err) {
      if (err instanceof FrontendError && (err.code === "quota" || err.code === "entitlement")) {
        setPhase("quota");
        return;
      }
      setMessage(err instanceof FrontendError ? err.message : "No writing prompt is available right now.");
      setPhase("error");
    }
  }

  useEffect(() => {
    void loadPrompt();
  }, []);

  async function submit() {
    if (!prompt || draft.length < MIN || draft.length > MAX) return;
    setPhase("evaluating");
    setMessage("");
    try {
      const key = await writingSubmitKey(prompt.writingPromptId, draft);
      const raw = await apiRequest<unknown>("/writing/submit", {
        method: "POST",
        idempotencyKey: key,
        body: {
          writingPromptId: prompt.writingPromptId,
          mode: "practice",
          userText: draft,
          timeSpentSeconds: Math.max(1, Math.round((Date.now() - started.current) / 1000)),
        },
      });
      const correction = decodeWritingCorrection(raw);
      if (!correction) {
        setMessage("We couldn’t read the evaluation. You were not charged.");
        setPhase("error");
        return;
      }
      setResult(correction);
      setPhase("result");
    } catch (err) {
      if (err instanceof FrontendError && (err.code === "quota" || err.code === "entitlement")) {
        setPhase("quota");
        return;
      }
      setMessage(err instanceof FrontendError ? err.message : "Something went wrong evaluating that text.");
      setPhase("draft");
    }
  }

  /**
   * Sentence-level feedback on the draft in progress, before it's spent on
   * a real submission. The endpoint already existed — Writing Tools' own
   * "Examiner vision" calls it — but only with placeholder prompt context
   * ("General professional writing task"), not the learner's real prompt.
   * This is the real prompt, mid-draft, which the standalone tool never has.
   */
  async function getFeedback() {
    if (!prompt || draft.trim().length < FEEDBACK_MIN) return;
    setFeedbackBusy(true);
    setFeedbackError("");
    try {
      const raw = await apiRequest<unknown>("/writing/sentence-feedback", {
        method: "POST",
        idempotencyKey: newIdempotencyKey(),
        body: {
          promptTitle: prompt.title,
          promptText: prompt.prompt,
          level2Task: prompt.level2Task,
          level3Task: prompt.level3Task,
          taskType: "article",
          mode: "practice",
          userText: draft,
          writingAttemptId: null,
        },
      });
      setFeedback(decodeExaminer(raw));
    } catch (err) {
      if (err instanceof FrontendError && (err.code === "quota" || err.code === "entitlement")) {
        setFeedbackPaywall(true);
        return;
      }
      setFeedbackError(err instanceof FrontendError ? err.message : "Feedback is unavailable right now.");
    } finally {
      setFeedbackBusy(false);
    }
  }

  return (
    <ExerciseShell skill="Writing" mode="Practice" title="Draft and evaluation" layout="stage">
      {phase === "quota" ? <CommercialCard /> : null}
      {phase === "loading" ? <LoadingState label="Loading a prompt…" lines={4} /> : null}
      {phase === "error" ? <ErrorState message={message} onRetry={() => void loadPrompt()} /> : null}
      {prompt && phase !== "quota" && phase !== "error" && phase !== "result" ? (
        <div className="writing-workspace">
          <aside className="writing-task">
            {prompt.title ? <h2>{prompt.title}</h2> : null}
            {prompt.audience || prompt.timeLimitMinutes ? (
              <p className="muted write-task-meta">
                {prompt.audience ? `To: ${prompt.audience}` : ""}
                {prompt.audience && prompt.timeLimitMinutes ? " · " : ""}
                {prompt.timeLimitMinutes ? `${prompt.timeLimitMinutes} min` : ""}
              </p>
            ) : null}
            <div className="passage-body">{prompt.prompt}</div>
            {prompt.checklist.length ? (
              <div>
                <p className="home-kicker">Before you submit</p>
                <ul className="write-checklist">{prompt.checklist.map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
            ) : null}
            {prompt.guidance.suggestedStructure.length ? (
              <div>
                <p className="home-kicker">Suggested structure</p>
                <ul>{prompt.guidance.suggestedStructure.map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
            ) : null}
            {prompt.guidance.practiceTips.length ? (
              <div>
                <p className="home-kicker">Practice tips</p>
                <ul>{prompt.guidance.practiceTips.map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
            ) : null}
          </aside>
          <div>
            <WritingEditor value={draft} onChange={setDraft} wordTarget={prompt.wordTarget || undefined} disabled={phase === "evaluating"} />
            {message ? <p className="err" role="status">{message}</p> : null}
            {phase === "evaluating" ? <p className="muted">Evaluating on the server…</p> : null}
            <div className="write-actions">
              <button
                className="btn btn-primary"
                type="button"
                disabled={phase !== "draft" || draft.length < MIN || draft.length > MAX}
                onClick={() => void submit()}
              >
                Submit for evaluation
              </button>
              <button
                className="btn btn-outline"
                type="button"
                disabled={phase !== "draft" || feedbackBusy || draft.trim().length < FEEDBACK_MIN}
                onClick={() => void getFeedback()}
              >
                {feedbackBusy ? "Reading…" : "Get feedback on this draft"}
              </button>
            </div>
            {feedbackError ? <p className="err" role="status">{feedbackError}</p> : null}
            {feedback ? (
              <section className="write-feedback p-ignite" aria-label="Sentence-level feedback on your draft">
                <p className="assessment-label">Examiner vision on this draft</p>
                <ExaminerFeedback result={feedback} />
              </section>
            ) : null}
          </div>
        </div>
      ) : null}
      {phase === "result" && result ? <WritingResultCard result={result} onNext={() => void loadPrompt()} /> : null}
      <CommercialDialog
        open={feedbackPaywall}
        onClose={() => setFeedbackPaywall(false)}
        title="Writing AI feedback is not available on your current plan."
      />
    </ExerciseShell>
  );
}
