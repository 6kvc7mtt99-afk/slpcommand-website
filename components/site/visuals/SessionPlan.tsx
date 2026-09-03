/**
 * Today's session, as the product composes it from the learner's evidence:
 * a headline and reason, a posture, timed blocks with the reason each is
 * there, and — on Professional — what to leave alone today. Illustrative.
 */
const BLOCKS = [
  { skill: "listening", name: "Listening", minutes: 12, posture: "Recover", why: "Specific-detail items slipped yesterday. Recovery comes before new material." },
  { skill: "reading", name: "Reading", minutes: 8, posture: null, why: "Inference at Level 3 — the sub-skill separating you from the target." },
  { skill: "writing", name: "Writing", minutes: 5, posture: null, why: "One sentence-feedback drill. A full task is scheduled for Thursday." },
];

export function SessionPlan() {
  return (
    <figure className="s-instrument" role="group" aria-labelledby="plan-caption">
      <div className="s-instrument-bar">
        <span>
          <b>Today&rsquo;s session</b> <span className="s-desk">· illustrative</span>
        </span>
        <span className="s-tag">Professional</span>
      </div>
      <div className="s-instrument-body">
        <div className="plan-head">
          <h4>Recover Listening</h4>
          <p>Yesterday slipped. Bring it back before anything new.</p>
          <div className="plan-meta">
            <span className="s-tag">25 min</span>
            <span className="s-tag s-tag--signal">Recovering</span>
            <span className="s-tag">3 blocks</span>
          </div>
        </div>
        <ol className="plan-blocks" aria-label="Session blocks">
          {BLOCKS.map((b) => (
            <li key={b.name} className="plan-block">
              <i className={`s-dot s-dot--${b.skill}`} aria-hidden="true" />
              <span className="plan-block-name">
                {b.name}
                {b.posture ? <span>{b.posture}</span> : null}
              </span>
              <span className="plan-block-why">{b.why}</span>
              <span className="plan-block-min">{b.minutes} min</span>
            </li>
          ))}
        </ol>
        <div className="plan-skip">
          <p className="s-eyebrow">Skipped today</p>
          <span>
            <b>Speaking</b> — current and well evidenced. Another session today buys very little; the time is worth more in Listening.
          </span>
        </div>
      </div>
      <figcaption id="plan-caption" className="s-vh">
        An illustrative daily session: recover Listening for 12 minutes, then Reading inference for 8 and one Writing drill for 5, with Speaking skipped because it is current.
      </figcaption>
    </figure>
  );
}
