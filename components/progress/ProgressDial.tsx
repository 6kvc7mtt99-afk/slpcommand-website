/**
 * The estimated-SLP dial.
 *
 * Draws exactly one number — the overall level the backend already
 * computed — positioned on the 0–4 SLP scale. The arc is a
 * visualisation of that same figure, not a second metric, and the
 * scale ticks are labelled so the reading is never ambiguous. If the
 * backend has no overall level, the caller renders nothing rather than
 * an empty dial at zero.
 */
export function ProgressDial({
  level,
  caption,
  target,
}: {
  level: number;
  caption: string;
  target?: string | null;
}) {
  const R = 78;
  const CIRC = 2 * Math.PI * R;
  // 270° sweep, opening at the bottom — an instrument face, not a pie.
  const SWEEP = 0.75;
  const arc = CIRC * SWEEP;
  const pct = Math.max(0, Math.min(1, level / 4));

  return (
    <div className="p-dial">
      <svg viewBox="0 0 200 200" role="img" aria-label={`Estimated SLP ${level} of 4`}>
        <g transform="rotate(135 100 100)">
          <circle
            className="p-dial-track"
            cx="100"
            cy="100"
            r={R}
            strokeDasharray={`${arc} ${CIRC}`}
            strokeLinecap="round"
          />
          <circle
            className="p-dial-fill"
            cx="100"
            cy="100"
            r={R}
            strokeDasharray={`${arc} ${CIRC}`}
            strokeDashoffset={arc * (1 - pct)}
          />
        </g>
      </svg>
      <div className="p-dial-center">
        <b className="p-num">{level}</b>
        <span>{caption}</span>
      </div>
      <div className="p-dial-scale" aria-hidden="true">
        <span>0</span>
        <span>{target ? `target ${target}` : "SLP scale"}</span>
        <span>4</span>
      </div>
    </div>
  );
}
