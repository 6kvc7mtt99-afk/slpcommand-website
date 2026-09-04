import Link from "next/link";
import type { ExamResult } from "@/lib/api/examResult";
import { examResultHeadline } from "@/lib/api/examResult";

/**
 * The result of a timed exam, as the backend measured it.
 *
 * Both exam screens used to render one line: Reading a bare unlabelled ratio
 * ("0.65") and Listening the literal word "Submitted." — while the server had
 * already returned the correct/total, the percentage, its own pass verdict, the
 * estimated level and, for Listening, the criterion-referenced REDS rating. A
 * learner spent their one exam of the month and was told nothing they could
 * use.
 *
 * Every value here comes from the response. Where the backend did not state
 * something — a verdict, a level — this renders nothing rather than deriving
 * one, which is the same rule the rest of the product follows.
 *
 * The disclaimer stays: an exam simulation is educational guidance, never an
 * official SLP result, and showing a real measurement makes saying so MORE
 * important, not less.
 */
export function ExamResultCard({
  result,
  skill,
  backHref,
  backLabel,
  practiceHref,
}: {
  result: ExamResult | null;
  skill: string;
  backHref: string;
  backLabel: string;
  /** Where to go to act on the result. The exam is not the end of the journey. */
  practiceHref?: string;
}) {
  return (
    <article className="exam-result">
      <p className="assessment-kind">{skill} exam simulation</p>
      <h2>{result ? examResultHeadline(result) : "Exam submitted"}</h2>

      {result ? (
        <dl className="exam-result-facts">
          {result.percentage != null ? (
            <div>
              <dt>Score</dt>
              <dd className="p-num">{result.percentage}%</dd>
            </div>
          ) : null}
          {/* The backend's own verdict, never a threshold applied here. */}
          {result.passed != null ? (
            <div>
              <dt>Criterion</dt>
              <dd>{result.passed ? "Sustained" : "Not sustained"}</dd>
            </div>
          ) : null}
          {result.estimatedSlpLevel ? (
            <div>
              <dt>Indicated level</dt>
              <dd className="p-num">SLP {result.estimatedSlpLevel}</dd>
            </div>
          ) : null}
          {result.reds ? (
            <div>
              <dt>Rating</dt>
              <dd>{result.reds}</dd>
            </div>
          ) : null}
        </dl>
      ) : (
        <p className="muted">
          Your answers were recorded. This session did not return a detailed result — your record is
          unaffected.
        </p>
      )}

      <p className="muted exam-result-note">
        This is educational guidance, not an official SLP result. Only an authorised examining body
        can award a qualification.
      </p>

      <div className="cta-row">
        {practiceHref ? (
          <Link className="btn btn-primary" href={practiceHref}>
            Train the weak points
          </Link>
        ) : null}
        <Link className={practiceHref ? "btn btn-outline" : "btn btn-primary"} href={backHref}>
          {backLabel}
        </Link>
      </div>
    </article>
  );
}
