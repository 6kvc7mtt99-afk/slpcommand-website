"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { apiRequest, FrontendError } from "@/lib/api/client";
import { newIdempotencyKey } from "@/lib/api/idempotency";
import { decodeExaminer, decodeOrchestrator, decodeTransform, type ExaminerResult, type OrchestratorNext, type TransformResult } from "@/lib/api/writingTools";
import { CommercialDialog } from "@/components/exercise/CommercialDialog";
import { ProductState } from "@/components/ui/ProductState";
import type { ResolvedState } from "@/lib/server/stateFromResult";

export function WritingToolsHome({
  targetLevel,
  orchestrator,
  /**
   * Why there is no next step, when the loader knows. "The orchestrator did not
   * return a next step" was printed for an unreachable backend too — a claim
   * about what the orchestrator decided, made without having asked it.
   */
  orchestratorState,
}: {
  targetLevel: "2" | "3";
  orchestrator: OrchestratorNext | null;
  orchestratorState?: ResolvedState | null;
}) {
  return (
    <section className="exercise page-skill skill-writing">
      <header className="page-head">
        <p className="section-eyebrow">Writing Tools</p>
        <h1>Writing Tools</h1>
        <p className="muted">
          {targetLevel === "3"
            ? "Level 2→3 transformer, examiner vision and exam strategy."
            : "Examiner vision and exam strategy."}
        </p>
      </header>
      {orchestrator ? (
        <article className="academy-now">
          <p className="home-kicker">What should I do next</p>
          <h2>{orchestrator.coachHeadline || "Next step"}</h2>
          <p>{orchestrator.coachDetail}</p>
          {orchestrator.academyLessonId ? (
            <Link href={`/writing/academy/lesson/${encodeURIComponent(orchestrator.academyLessonId)}`}>
              {orchestrator.academyTitle || "Open the recommended class"}
            </Link>
          ) : null}
        </article>
      ) : orchestratorState ? (
        <ProductState
          kind={orchestratorState.kind}
          scope="panel"
          title="What should I do next"
          body={orchestratorState.body}
          detail={orchestratorState.detail}
          lockReason={orchestratorState.lockReason}
        />
      ) : (
        <p className="muted">The orchestrator did not return a next step.</p>
      )}
      <ul className="skill-destinations">
        <li>
          <strong>Level 2 → 3 Transformer</strong>
          <p className="muted">Upgrade one sentence. The backend remains the evaluator.</p>
          <Link className="btn btn-primary" href="/writing/tools/transform">
            Open transformer
          </Link>
        </li>
        <li>
          <strong>Examiner vision</strong>
          <p className="muted">Sentence-level feedback from the current writing evaluator.</p>
          <Link className="btn btn-outline" href="/writing/tools/examiner">
            Open examiner vision
          </Link>
        </li>
        <li>
          <strong>Exam strategy</strong>
          <p className="muted">Timer, checklist and emergency phrases. No invented scores.</p>
          <Link className="btn btn-outline" href="/writing/tools/strategy">
            Open strategy
          </Link>
        </li>
      </ul>
    </section>
  );
}

export function WritingTransformer() {
  const [sentence, setSentence] = useState("");
  const [result, setResult] = useState<TransformResult | null>(null);
  const [error, setError] = useState("");
  const [paywall, setPaywall] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const text = sentence.trim();
    if (text.length < 5 || text.length > 500) {
      setError("Enter between 5 and 500 characters.");
      return;
    }
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const raw = await apiRequest<unknown>("/writing/intelligence/transform", {
        method: "POST",
        idempotencyKey: newIdempotencyKey(),
        body: { sentence: text },
      });
      const decoded = decodeTransform(raw);
      if (!decoded) {
        setError("The transformer did not return an upgrade.");
        return;
      }
      setResult(decoded);
    } catch (err) {
      if (err instanceof FrontendError && (err.code === "quota" || err.code === "entitlement")) {
        setPaywall(true);
        return;
      }
      setError(err instanceof FrontendError ? err.message : "The transformer is unavailable.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="exercise">
      <p className="section-eyebrow">Writing Tools</p>
      <h1>Level 2 → 3 Transformer</h1>
      <form onSubmit={onSubmit}>
        <label htmlFor="sentence">Sentence</label>
        <textarea id="sentence" value={sentence} onChange={(e) => setSentence(e.target.value)} rows={4} style={{ width: "100%" }} />
        {error ? <p className="err" role="alert">{error}</p> : null}
        <button className="btn btn-primary" type="submit" disabled={busy} style={{ marginTop: 12 }}>
          {busy ? "Upgrading…" : "Upgrade sentence"}
        </button>
      </form>
      {result ? (
        <article className="home-card">
          <p className="home-kicker">Backend result</p>
          <p>{result.upgraded}</p>
          <p className="muted">{result.explanation}</p>
        </article>
      ) : null}
      <CommercialDialog open={paywall} onClose={() => setPaywall(false)} title="Writing AI feedback is not available on your current plan." />
    </section>
  );
}

export function ExaminerVision() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<ExaminerResult | null>(null);
  const [error, setError] = useState("");
  const [paywall, setPaywall] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (text.trim().length < 40 || text.length > 8000) {
      setError("Enter at least 40 characters and at most 8000.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const raw = await apiRequest<unknown>("/writing/sentence-feedback", {
        method: "POST",
        idempotencyKey: newIdempotencyKey(),
        body: {
          promptTitle: "Writing Task",
          promptText: "General professional writing task",
          level2Task: "Describe and explain the topic clearly",
          level3Task: "Analyse, argue and speculate using Level 3 language",
          taskType: "article",
          mode: "practice",
          userText: text,
          writingAttemptId: null,
        },
      });
      setResult(decodeExaminer(raw));
    } catch (err) {
      if (err instanceof FrontendError && (err.code === "quota" || err.code === "entitlement")) {
        setPaywall(true);
        return;
      }
      setError(err instanceof FrontendError ? err.message : "Examiner vision is unavailable.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="exercise">
      <p className="section-eyebrow">Writing Tools</p>
      <h1>Examiner vision</h1>
      <form onSubmit={onSubmit}>
        <label htmlFor="examiner-text">Text</label>
        <textarea id="examiner-text" value={text} onChange={(e) => setText(e.target.value)} rows={8} style={{ width: "100%" }} />
        {error ? <p className="err" role="alert">{error}</p> : null}
        <button className="btn btn-primary" type="submit" disabled={busy} style={{ marginTop: 12 }}>
          {busy ? "Reading…" : "Ask the examiner"}
        </button>
      </form>
      {result ? (
        <article className="home-card">
          <p>{result.summary}</p>
          <ul>
            {result.sentenceFeedback.map((item, index) => (
              <li key={index}>
                <strong>{item.category}</strong>: {item.explanation}
              </li>
            ))}
          </ul>
        </article>
      ) : null}
      <CommercialDialog open={paywall} onClose={() => setPaywall(false)} title="Writing AI feedback is not available on your current plan." />
    </section>
  );
}

const CHECKLIST = [
  "I answered the task, not a nearby topic.",
  "The opening states a clear position.",
  "Each paragraph has one job.",
  "I used evidence or example, not only opinion.",
  "I marked contrast where I changed direction.",
  "I used at least one passive where the actor is not the point.",
  "I used at least one conditional for a real consequence.",
  "Register stays professional throughout.",
  "The conclusion does not introduce a new claim.",
  "I would still stand by this if an examiner asked 'so what?'.",
];

export function ExamStrategy() {
  return (
    <section className="exercise">
      <p className="section-eyebrow">Writing Tools</p>
      <h1>Exam strategy</h1>
      <article className="home-card">
        <p className="home-kicker">45 minutes</p>
        <p>Plan 5 · Write 35 · Review 5. This timer is local guidance, not a scored exam.</p>
      </article>
      <article className="home-card">
        <p className="home-kicker">Before you submit</p>
        <ul>
          {CHECKLIST.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </article>
      <article className="home-card">
        <p className="home-kicker">Level 3 emergency phrases</p>
        <p>Opening: The central issue is…</p>
        <p>Argument: This follows because…</p>
        <p>Concession: That said, the constraint remains…</p>
        <p>Passive: A decision was taken to…</p>
        <p>Conditional: If the situation deteriorated, units would…</p>
        <p>Conclusion: The implication is therefore…</p>
      </article>
    </section>
  );
}
