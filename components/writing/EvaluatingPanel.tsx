/**
 * The moment between submit and result — real AI evaluation, up to 180s
 * of real budget server-side (lib/server/backend.ts's AI_TIMEOUT), not a
 * thing to represent with a one-line disabled-editor caption. Replaces
 * the workspace entirely rather than sitting under a greyed-out editor,
 * so a wait that can genuinely run to a couple of minutes reads as "the
 * examiner has it" rather than "the page looks stuck."
 *
 * Shared by Writing Practice and Exam — same real wait, same weight.
 */
export function EvaluatingPanel() {
  return (
    <div className="examiner-loading p-ignite" role="status" aria-live="polite">
      <div className="examiner-loading-mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <p className="examiner-loading-kicker">Evaluating</p>
      <h2>Your submission is with the examiner.</h2>
      <p className="muted">Scored against the rubric, server-side. This can take a couple of minutes — the page will update the moment it&rsquo;s back.</p>
    </div>
  );
}
