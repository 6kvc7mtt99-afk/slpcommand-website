import type { WritingCorrection } from "@/lib/api/writing";

/**
 * The Writing evaluation, as the backend actually produces it.
 *
 * THIS DOCBLOCK USED TO BE WRONG, and its wrongness is why the defect below
 * survived five review phases. It asserted "the real evaluation payload has
 * exactly two content fields … no score, no strengths/weaknesses arrays" and
 * concluded that rendering more would be fabrication. The opposite was true:
 * `validateWritingCorrection` (server.js:8391) returns three SCORED rubric
 * dimensions plus strengths, weaknesses, criticalErrors and
 * studyRecommendations, and `decodeWritingCorrection` was throwing all of it
 * away by reading an object with asString(). Nothing here is invented — every
 * field below is one the evaluator computed and the learner paid for.
 *
 * `improvedVersion` is deliberately NOT rendered: claims registry C24 records
 * that the product does not offer "an improved version beside yours", and
 * marketingPages.test.ts pins that phrase out of the copy. Surfacing it is a
 * product decision, not a rendering one.
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
/** The three dimensions validateWritingCorrection scores, in reading order. */
const CRITERIA = [
  { key: "taskAchievement", label: "Task achievement" },
  { key: "contentAndOrganization", label: "Content and organisation" },
  { key: "languagePrecision", label: "Language precision" },
] as const;

/** The actionable lists, most useful first. */
const LISTS = [
  { key: "criticalErrors", label: "Fix these first" },
  { key: "weaknesses", label: "Weaknesses" },
  { key: "strengths", label: "Strengths" },
  { key: "studyRecommendations", label: "What to practise next" },
] as const;

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

      {/* The rubric, scored. These are the three dimensions the backend
          evaluates against — not a presentation invention. A dimension the
          evaluator did not score shows its feedback without a number rather
          than a zero, because an unscored dimension is not a zero-scored one. */}
      {CRITERIA.some((c) => result[c.key].feedback || result[c.key].score != null) ? (
        <section className="assessment-criteria p-reveal-item" style={{ ["--i" as string]: step++ }}>
          <p className="assessment-label">Against the rubric</p>
          <dl className="assessment-crit-list">
            {CRITERIA.map((c) => {
              const item = result[c.key];
              if (!item.feedback && item.score == null) return null;
              return (
                <div key={c.key} className="assessment-crit">
                  <dt>
                    {c.label}
                    {item.score != null ? <span className="assessment-crit-score p-num">{item.score}</span> : null}
                  </dt>
                  {item.feedback ? <dd>{item.feedback}</dd> : null}
                </div>
              );
            })}
          </dl>
        </section>
      ) : null}

      {LISTS.map((l) => {
        const items = result[l.key];
        if (!items.length) return null;
        return (
          <section key={l.key} className="assessment-list p-reveal-item" style={{ ["--i" as string]: step++ }}>
            <p className="assessment-label">{l.label}</p>
            <ul>
              {items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </section>
        );
      })}

      <footer className="assessment-next p-reveal-item" style={{ ["--i" as string]: step++ }}>
        <p className="assessment-label">Next</p>
        <button className={primaryAction ? "btn btn-primary" : "btn btn-outline"} type="button" onClick={onNext}>
          {nextLabel}
        </button>
      </footer>
    </article>
  );
}
