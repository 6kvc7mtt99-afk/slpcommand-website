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
  return (
    <article className="writing-result">
      <p className="section-eyebrow">{result.formative ? "Indicative feedback" : "Evaluation"}</p>
      {note ? <p className="muted">{note}</p> : null}
      {result.taskFulfilment ? (
        <div className="writing-result-verdict">
          <p className="home-kicker">Task fulfilment</p>
          <p>{result.taskFulfilment}</p>
        </div>
      ) : null}
      {paragraphs.length ? (
        <div className="writing-result-body">
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      ) : null}
      <button className={primaryAction ? "btn btn-primary" : "btn btn-outline"} type="button" onClick={onNext}>
        {nextLabel}
      </button>
    </article>
  );
}
