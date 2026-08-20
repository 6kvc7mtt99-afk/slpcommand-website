/**
 * The threshold into exam mode.
 *
 * Practice is entered directly — it is exploratory, and a gate would
 * only add friction to something calm. An exam is a different kind of
 * room: once accepted, the environment itself changes (the task bar
 * switches to the assessment accent, a live clock starts, the mode
 * indicator begins to pulse). This screen is the moment before that
 * happens, so it is deliberately built like a pre-flight check rather
 * than a dismissible legal footnote — three real facts, then the one
 * action that arms the room. The disclaimer text itself is unchanged;
 * only its presentation earns the weight the transition deserves.
 */
export function ExamDisclaimerGate({
  skill,
  onAccept,
  onCancel,
}: {
  skill: string;
  onAccept: () => void;
  onCancel: () => void;
}) {
  return (
    <article className="exam-gate p-ignite">
      <div className="exam-gate-mark" aria-hidden="true">
        <span />
      </div>
      <p className="exam-gate-kicker">Entering exam mode</p>
      <h2>Educational simulation only</h2>
      <p>
        This {skill} exam is an educational simulation. It is not an official STANAG 6001 / SLP qualification
        and is not affiliated with NATO or any examining authority.
      </p>
      <p className="muted">
        Completing it does not confer, guarantee, or replace an official result. Only authorised examining
        bodies can award an official qualification.
      </p>
      <dl className="exam-gate-facts">
        <div>
          <dt>Format</dt>
          <dd>Timed, one pass, no pausing</dd>
        </div>
        <div>
          <dt>Scoring</dt>
          <dd>Server-side, on submission</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>Educational only</dd>
        </div>
      </dl>
      <div className="cta-row">
        <button className="btn btn-primary" type="button" onClick={onAccept}>
          I understand — start exam
        </button>
        <button className="btn btn-outline" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </article>
  );
}
