"use client";

import { useEffect, useRef, useState } from "react";
import { apiRequest, FrontendError } from "@/lib/api/client";
import {
  decodeWritingCorrection,
  decodeWritingPrompt,
  writingSubmitKey,
  type WritingCorrection,
  type WritingPrompt,
} from "@/lib/api/writing";
import { CommercialCard, ExerciseShell } from "@/components/exercise/ExerciseShell";
import { ErrorState, LoadingState } from "@/components/ui/ProductState";
import { WritingEditor } from "./WritingEditor";
import { WritingResultCard } from "./WritingResultCard";

const MIN = 80;
const MAX = 8000;

export function WritingPractice() {
  const [phase, setPhase] = useState<"loading" | "draft" | "evaluating" | "result" | "quota" | "error">("loading");
  const [prompt, setPrompt] = useState<WritingPrompt | null>(null);
  const [draft, setDraft] = useState("");
  const [result, setResult] = useState<WritingCorrection | null>(null);
  const [message, setMessage] = useState("");
  const started = useRef(Date.now());

  async function loadPrompt() {
    setPhase("loading");
    setDraft("");
    setResult(null);
    setMessage("");
    started.current = Date.now();
    try {
      const profile = await apiRequest<{ target_level?: string }>("/profile").catch(() => ({ target_level: "3" }));
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
        /**
         * WRITING-TRUTH — two defects, one branch.
         *
         * (1) "You were not charged" was a billing claim the client cannot
         *     make. `apiRequest` throws on any non-2xx, so reaching here means
         *     the backend returned 2xx and `POST /writing/submit` — a
         *     QUOTA_PATH — has already spent the learner's allowance. A Free
         *     learner with three submissions a month was told a spent one was
         *     free. (The identical sentence in lib/api/errors.ts is legitimate:
         *     there it is bound to the backend's own `ai_parse_failed` reason,
         *     where the SERVER states it did not charge.)
         *
         * (2) This set phase "error", which hides the whole workspace and
         *     offers an ErrorState whose only action is `loadPrompt()` — a NEW
         *     prompt. The learner's draft, possibly 300 words, was destroyed by
         *     the only recovery on offer.
         *
         * Staying on "draft" keeps the text on screen and lets them submit the
         * same words again. That resubmit genuinely costs nothing: the
         * idempotency key is a SHA-256 of `promptId:userText`
         * (lib/api/writing.ts:104-109), so an identical body is deduplicated
         * upstream — which is the one half of this sentence the client CAN
         * verify, and so the only half it asserts.
         */
        setMessage(
          "The evaluation came back in a form we couldn’t display. Your submission was recorded — submit the same text again (it will not be charged twice), or check History.",
        );
        setPhase("draft");
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
            <button
              className="btn btn-primary"
              type="button"
              disabled={phase !== "draft" || draft.length < MIN || draft.length > MAX}
              onClick={() => void submit()}
            >
              Submit for evaluation
            </button>
          </div>
        </div>
      ) : null}
      {phase === "result" && result ? <WritingResultCard result={result} onNext={() => void loadPrompt()} /> : null}
    </ExerciseShell>
  );
}
