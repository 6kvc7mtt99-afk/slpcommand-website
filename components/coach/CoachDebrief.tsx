import Link from "next/link";
import { criterionLabel, type CoachSessionResult } from "@/lib/coach/result";

/**
 * The debrief.
 *
 * Not a metrics sheet: what you worked on, what held up, the one thing to
 * carry forward, and where to go next. Every line is the certified engine's
 * own verdict, reshaped by the backend and rendered here — the browser scores
 * nothing and infers nothing.
 *
 * Three real outcomes, all of them honest:
 *
 *  - rated       — strengths and growth areas with the learner's own words as
 *                  evidence, quoted verbatim by the rubric.
 *  - not ratable — "not enough evidence yet". Stated as a property of the
 *                  conversation, not a failure of the learner; it is exactly
 *                  what makes the estimates trustworthy.
 *  - still open  — the webhook has not landed inside the poll window. Say so
 *                  and point at history rather than blocking on a spinner.
 *
 * Reuses the product's assessment language (`.assessment*`), so a Coach
 * debrief and a Writing assessment are visibly the same kind of object.
 */
export function CoachDebrief({
  objective,
  result,
  onDone,
}: {
  objective: string;
  result: CoachSessionResult | null;
  onDone: () => void;
}) {
  // Sections arrive in the order a reader actually uses them; the index
  // drives the shared stagger, exactly as the Writing assessment does.
  let step = 0;
  const next = () => ({ ["--i" as string]: step++ });

  return (
    <article className="assessment p-ignite">
      <header className="assessment-head p-reveal-item" style={next()}>
        <p className="assessment-kind">Coach debrief</p>
        <h2>{result?.headline || "Session complete"}</h2>
        <p className="assessment-note">
          The Coach never grades you. This is the same evaluation engine that reviews your recorded Speaking, and it is
          never an official SLP or STANAG assessment.
        </p>
      </header>

      <section className="assessment-verdict p-reveal-item" style={next()}>
        <p className="assessment-label">You worked on</p>
        <p className="assessment-verdict-text">{result?.workedOn || objective}</p>
      </section>

      {result === null ? (
        <section className="assessment-body p-reveal-item" style={next()}>
          <p className="assessment-label">Evidence</p>
          <p>
            Your conversation is still being reviewed. The result will appear in your Speaking history — nothing was
            lost, and you were charged only for the minutes you spoke.
          </p>
        </section>
      ) : null}

      {result && !result.ratable ? (
        <section className="assessment-body p-reveal-item" style={next()}>
          <p className="assessment-label">Evidence</p>
          <p>
            Not enough conversation yet to update your estimate — that is the system being honest, not you failing. A
            longer session gives the engine something to read.
          </p>
        </section>
      ) : null}

      {result?.ratable && result.strengths.length ? (
        <section className="assessment-body p-reveal-item" style={next()}>
          <p className="assessment-label">What held up</p>
          <ul className="coach-notes">
            {result.strengths.map((item) => (
              <li key={`s-${item.criterion}`}>
                <strong>{criterionLabel(item.criterion)}</strong>
                {item.note ? <p>{item.note}</p> : null}
                {item.evidence ? <blockquote className="coach-evidence">“{item.evidence}”</blockquote> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {result?.ratable && result.growthAreas.length ? (
        <section className="assessment-body p-reveal-item" style={next()}>
          <p className="assessment-label">Keep working on</p>
          <ul className="coach-notes">
            {result.growthAreas.map((item) => (
              <li key={`g-${item.criterion}`}>
                <strong>{criterionLabel(item.criterion)}</strong>
                {item.note ? <p>{item.note}</p> : null}
                {item.evidence ? <blockquote className="coach-evidence">“{item.evidence}”</blockquote> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {result?.ratable && (result.functionsPracticed.length || result.functionsToTry.length) ? (
        <section className="assessment-body p-reveal-item" style={next()}>
          <p className="assessment-label">Task functions</p>
          {result.functionsPracticed.length ? (
            <p>
              <strong>Practised:</strong> {result.functionsPracticed.join(" · ")}
            </p>
          ) : null}
          {result.functionsToTry.length ? (
            <p>
              <strong>Not yet exercised:</strong> {result.functionsToTry.join(" · ")}
            </p>
          ) : null}
        </section>
      ) : null}

      {result?.professorNote ? (
        <section className="assessment-body p-reveal-item" style={next()}>
          <p className="assessment-label">Your coach’s note</p>
          <p>{result.professorNote}</p>
        </section>
      ) : null}

      {result?.nextObjective ? (
        <section className="assessment-body p-reveal-item" style={next()}>
          <p className="assessment-label">Next objective</p>
          <p>{result.nextObjective}</p>
          {result.nextRationale ? <p className="muted">{result.nextRationale}</p> : null}
        </section>
      ) : null}

      <footer className="assessment-next p-reveal-item" style={next()}>
        <p className="assessment-label">Next</p>
        <div className="cta-row">
          <button className="btn btn-primary" type="button" onClick={onDone}>
            Back to Speaking
          </button>
          <Link className="btn btn-outline" href="/speaking/history">
            Speaking history
          </Link>
        </div>
      </footer>
    </article>
  );
}
