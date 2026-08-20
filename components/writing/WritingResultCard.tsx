import Link from "next/link";
import type { WritingCorrection } from "@/lib/api/writing";

/**
 * The real evaluation payload has exactly two content fields:
 * `taskFulfilment` (a short verdict sentence) and `correction` (the AI
 * evaluator's full write-up). No score, no strengths/weaknesses arrays, no
 * pass/fail boolean exist in the real response — Speaking's result has a
 * `rating.credited` boolean and a criteria breakdown to build a verdict
 * heading from; Writing's does not. Inventing one here would be exactly the
 * kind of fabricated category the review explicitly ruled out, so this stays
 * two real fields, better presented — not a new data model.
 *
 * What was fixable without new data: `result.correction` rendered inside an
 * unstyled `<div className="passage-body">` — that class only has rules when
 * scoped under .doc-paper/.reading-passage/.writing-task, so it inherited
 * plain browser defaults, and `white-space: normal` collapsed the evaluator's
 * own paragraph breaks into one dense run of text. That is the "wall of AI
 * text" a reader immediately recognises as a chatbot, not a report. Splitting
 * on the response's own line breaks and giving `taskFulfilment` a distinct,
 * labelled verdict block — instead of an inline aside sentence — is a
 * presentation fix on real content, not new content.
 */
function paragraphsOf(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function WritingResultCard({
  result,
  onNext,
  nextLabel = "Next prompt",
  note,
  primaryAction = false,
}: {
  result: WritingCorrection;
  onNext: () => void;
  nextLabel?: string;
  /** A claims-safety line (e.g. "not a level" on a formative exam). Shown once, near the verdict — not buried after the full write-up. */
  note?: string;
  /** Exam's "Back to Writing" is the flow's only remaining action; Practice's "Next prompt" is one continuation among several. */
  primaryAction?: boolean;
}) {
  const paragraphs = paragraphsOf(result.correction);
  // The report arrives as a sequence — verdict, then the examiner's own
  // paragraphs, then what to do next — rather than a single block, since
  // that is genuinely the order a reader uses it in. Each section's
  // position in that real sequence drives its stagger delay; nothing
  // here is timed against the evaluator's actual response latency.
  let step = 0;
  return (
    <article className="assessment p-ignite">
      <header className="assessment-head p-reveal-item" style={{ ["--i" as string]: step++ }}>
        <p className="assessment-kind">{result.formative ? "Indicative assessment" : "Writing assessment"}</p>
        <h2>Your submission has been assessed</h2>
        {note ? <p className="assessment-note">{note}</p> : null}
      </header>

      {result.taskFulfilment ? (
        <section className="assessment-verdict p-reveal-item" style={{ ["--i" as string]: step++ }}>
          <p className="assessment-label">Task fulfilment</p>
          <p className="assessment-verdict-text">{result.taskFulfilment}</p>
        </section>
      ) : null}

      {paragraphs.length ? (
        <section className="assessment-body p-reveal-item" style={{ ["--i" as string]: step++ }}>
          <p className="assessment-label">Examiner’s report</p>
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </section>
      ) : null}

      <footer className="assessment-next p-reveal-item" style={{ ["--i" as string]: step++ }}>
        <p className="assessment-label">Next</p>
        <div className="assessment-next-actions">
          <button className={primaryAction ? "btn btn-primary" : "btn btn-outline"} type="button" onClick={onNext}>
            {nextLabel}
          </button>
          {/* The loop this report is part of — evaluate, then understand why,
              then train it — was real in the backend (Writing Intelligence's
              blockingPromotion evidence includes these same attempts) but had
              no path here before. Both destinations read the same evidence
              this report is drawn from, not a second opinion. */}
          <Link className="assessment-next-link" href="/writing/intelligence">
            What this means for my competencies
            <span className="p-arrow" aria-hidden="true">→</span>
          </Link>
          <Link className="assessment-next-link" href="/writing/academy">
            Open Writing Academy
            <span className="p-arrow" aria-hidden="true">→</span>
          </Link>
        </div>
      </footer>
    </article>
  );
}
