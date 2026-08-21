/**
 * The moment between submit and result — real AI evaluation, not a thing
 * to represent with a one-line disabled-editor caption. Replaces the
 * workspace entirely rather than sitting under a greyed-out editor, so a
 * wait that can genuinely run to a couple of minutes reads as "it's with
 * the evaluator" rather than "the page looks stuck."
 *
 * Shared by Writing Practice, Writing Exam, Speaking Practice, and
 * Speaking Exam — one real wait moment, one weight. Defaults keep
 * Writing's original copy so its two call sites are unchanged; Speaking
 * passes its own honest heading/body since the wait is transcription +
 * rubric scoring, not an essay read.
 */
export function EvaluatingPanel({
  kicker = "Evaluating",
  heading = "Your submission is with the examiner.",
  body = "Scored against the rubric, server-side. This can take a couple of minutes — the page will update the moment it's back.",
}: {
  kicker?: string;
  heading?: string;
  body?: string;
}) {
  return (
    <div className="examiner-loading p-ignite" role="status" aria-live="polite">
      <div className="examiner-loading-mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <p className="examiner-loading-kicker">{kicker}</p>
      <h2>{heading}</h2>
      <p className="muted">{body}</p>
    </div>
  );
}
