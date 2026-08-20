/**
 * Readiness as an instrument face.
 *
 * One real backend number (0–100) on a 240° arc, with the scale marked so
 * the reading is unambiguous. Server-rendered SVG — no canvas, no client
 * JS — because unlike the home instrument this value does not need to
 * react to a pointer to be understood. The sweep animates in via CSS.
 *
 * This is a readiness score, not Estimated SLP; the caption says so and
 * the two are never drawn on the same scale.
 */
export function ReadinessGauge({
  value,
  label,
  caption,
}: {
  value: number;
  label: string;
  caption?: string;
}) {
  const pct = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const R = 84;
  const CIRC = 2 * Math.PI * R;
  const SWEEP = 2 / 3; // 240°
  const arc = CIRC * SWEEP;

  return (
    <div className="gauge">
      <svg viewBox="0 0 200 200" role="img" aria-label={`${label} ${Math.round(pct)} out of 100`}>
        <g transform="rotate(150 100 100)">
          <circle
            className="gauge-track"
            cx="100"
            cy="100"
            r={R}
            strokeDasharray={`${arc} ${CIRC}`}
            strokeLinecap="round"
          />
          <circle
            className="gauge-fill"
            cx="100"
            cy="100"
            r={R}
            strokeDasharray={`${arc} ${CIRC}`}
            style={{ ["--dash" as string]: `${arc * (1 - pct / 100)}` }}
            strokeLinecap="round"
          />
        </g>
      </svg>
      <div className="gauge-core">
        <b className="p-num">{Math.round(pct)}</b>
        <span>{label}</span>
      </div>
      <div className="gauge-scale" aria-hidden="true">
        <span className="p-num">0</span>
        {caption ? <span className="gauge-caption">{caption}</span> : null}
        <span className="p-num">100</span>
      </div>
    </div>
  );
}
