/**
 * A Reading Intelligence briefing, as the product composes it: readiness
 * against the target level, a confidence label, the weakness profile ranked
 * with its trend, and the single next action the Academy recommends.
 * Every value here is illustrative.
 */
const READINESS = 42;

const WEAKNESSES: { label: string; accuracy: number; attempts: number; trend: "down" | "up" | "flat"; skill: string }[] = [
  { label: "Inference", accuracy: 58, attempts: 12, trend: "down", skill: "reading" },
  { label: "Specific detail", accuracy: 71, attempts: 9, trend: "up", skill: "reading" },
  { label: "Gist", accuracy: 84, attempts: 11, trend: "flat", skill: "reading" },
];

export function Briefing() {
  const r = 60;
  const circumference = 2 * Math.PI * r;
  const arcLen = (READINESS / 100) * circumference * 0.75;
  return (
    <figure className="s-instrument" role="group" aria-labelledby="brief-caption">
      <div className="s-instrument-bar">
        <span>
          <b>Reading Intelligence</b> <span className="s-desk">· target SLP 3</span>
        </span>
        <span className="s-tag">Illustrative</span>
      </div>
      <div className="s-instrument-body brief">
        <div className="brief-top">
          <div className="s-gauge" aria-hidden="true">
            <svg viewBox="0 0 148 148">
              <circle className="s-gauge-track" cx="74" cy="74" r={r} strokeDasharray={`${circumference * 0.75} ${circumference}`} transform="rotate(135 74 74)" />
              <circle className="s-gauge-arc" cx="74" cy="74" r={r} style={{ ["--len" as string]: arcLen } as React.CSSProperties} transform="rotate(135 74 74)" />
              <line className="s-gauge-tick" x1="74" y1="8" x2="74" y2="18" transform="rotate(112 74 74)" />
            </svg>
            <div className="s-gauge-val">
              <b>{READINESS}</b>
              <small>Readiness</small>
            </div>
          </div>
          <div className="brief-read">
            <span className="s-tag s-tag--signal">Limited evidence</span>
            <h4>Building profile</h4>
            <p>8 rated attempts at Level 3. Inference is the sub-skill that separates you from the target.</p>
          </div>
        </div>
        <ul className="brief-list" aria-label="Weakness profile, ranked">
          {WEAKNESSES.map((w) => (
            <li key={w.label} className="brief-row">
              <span className="brief-row-name">{w.label}</span>
              <span className="brief-row-meta">
                <b>{w.accuracy}%</b> · {w.attempts} attempts ·{" "}
                <span className={w.trend === "down" ? "is-down" : w.trend === "up" ? "is-up" : ""}>
                  {w.trend === "down" ? "↓ slipping" : w.trend === "up" ? "↑ improving" : "→ steady"}
                </span>
              </span>
              <span className="brief-bar" style={{ ["--w" as string]: `${w.accuracy}%`, ["--tint" as string]: `var(--s-${w.skill})` } as React.CSSProperties} aria-hidden="true" />
            </li>
          ))}
        </ul>
        <div className="brief-next">
          <p className="s-eyebrow">Train this first</p>
          <strong>Inference from orders</strong>
          <span>Academy · Reading · about 12 minutes · chosen from the same evidence</span>
        </div>
      </div>
      <figcaption id="brief-caption" className="s-vh">
        An illustrative Reading Intelligence briefing: readiness 42 with limited evidence, three sub-skills ranked by accuracy and trend, and one recommended lesson.
      </figcaption>
    </figure>
  );
}
