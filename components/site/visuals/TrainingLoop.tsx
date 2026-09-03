import { stagger } from "../primitives";

export type LoopNode = { index: string; title: string; body: string };

/**
 * The training loop — the site's structural signature.
 *
 * Practice → Assessment → Performance intelligence → Targeted improvement →
 * Progress, drawn as a rail with one small instrument glyph per node. The
 * glyphs are abstractions of real product surfaces (an item, a verdict, the
 * readiness gauge, a session plan, a level trend), not decoration.
 */
export function TrainingLoop({ nodes, returnLabel }: { nodes: LoopNode[]; returnLabel: string }) {
  return (
    <>
      <ol className="loop" aria-label="The training loop">
        {nodes.map((node, i) => (
          <li key={node.index} className="loop-node" data-reveal style={stagger(i)}>
            <span className="loop-index" aria-hidden="true">
              {node.index}
            </span>
            <h3 className="s-h3">{node.title}</h3>
            <div className="loop-glyph" aria-hidden="true">
              <Glyph kind={i} />
            </div>
            <p>{node.body}</p>
          </li>
        ))}
      </ol>
      <div className="loop-return" aria-hidden="true">
        <span>
          <svg width="40" height="14" viewBox="0 0 40 14" fill="none" stroke="currentColor" strokeWidth="1.4">
            <path d="M38 3H10a7 7 0 0 0 0 14" strokeLinecap="round" strokeDasharray="2 4" />
            <path d="M34 0l4 3-4 3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {returnLabel}
        </span>
      </div>
    </>
  );
}

function Glyph({ kind }: { kind: number }) {
  const ink = "var(--s-ink-2)";
  const line = "var(--s-line-strong)";
  const accent = "var(--s-accent)";
  const signal = "var(--s-signal)";
  switch (kind) {
    case 0:
      // An item: passage lines and a chosen option.
      return (
        <svg viewBox="0 0 120 60" fill="none">
          <rect x="6" y="8" width="60" height="4" rx="2" fill={line} />
          <rect x="6" y="18" width="52" height="4" rx="2" fill={line} />
          <rect x="6" y="28" width="58" height="4" rx="2" fill={line} />
          <rect x="76" y="8" width="38" height="12" rx="2" stroke={line} />
          <rect x="76" y="26" width="38" height="12" rx="2" stroke={ink} />
          <circle cx="82" cy="32" r="2" fill={ink} />
          <rect x="76" y="44" width="38" height="12" rx="2" stroke={line} />
        </svg>
      );
    case 1:
      // A verdict: criteria rows with met / unmet marks.
      return (
        <svg viewBox="0 0 120 60" fill="none">
          {[0, 1, 2, 3].map((r) => (
            <g key={r} transform={`translate(0 ${6 + r * 13})`}>
              <rect x="8" y="2" width={44 - r * 6} height="4" rx="2" fill={line} />
              <rect x="70" y="0" width="42" height="9" rx="2" stroke={line} />
              <path d={r === 2 ? "M88 2l4 5M92 2l-4 5" : "M86 5l3 3 6-6"} stroke={r === 2 ? signal : accent} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          ))}
        </svg>
      );
    case 2:
      // Readiness gauge.
      return (
        <svg viewBox="0 0 120 60" fill="none">
          <path d="M20 52a40 40 0 0 1 80 0" stroke={line} strokeWidth="6" strokeLinecap="round" />
          <path d="M20 52a40 40 0 0 1 40-40" stroke={signal} strokeWidth="6" strokeLinecap="round" />
          <text x="60" y="50" textAnchor="middle" fontFamily="var(--s-mono)" fontSize="14" fill={ink}>
            42
          </text>
          <line x1="96" y1="26" x2="104" y2="22" stroke={accent} strokeWidth="2" />
        </svg>
      );
    case 3:
      // Session plan blocks.
      return (
        <svg viewBox="0 0 120 60" fill="none">
          <rect x="8" y="8" width="104" height="12" rx="2" stroke={ink} />
          <rect x="8" y="24" width="72" height="12" rx="2" stroke={line} />
          <rect x="8" y="40" width="48" height="12" rx="2" stroke={line} />
          <circle cx="15" cy="14" r="2" fill="var(--s-listening)" />
          <circle cx="15" cy="30" r="2" fill="var(--s-reading)" />
          <circle cx="15" cy="46" r="2" fill="var(--s-writing)" />
          <rect x="92" y="26" width="20" height="8" rx="1.5" stroke={line} strokeDasharray="2 2" />
        </svg>
      );
    default:
      // Level trend with confidence ticks.
      return (
        <svg viewBox="0 0 120 60" fill="none">
          <line x1="8" y1="50" x2="112" y2="50" stroke={line} />
          <polyline points="12,42 32,40 52,34 72,36 92,26 108,22" stroke={ink} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
          {[12, 32, 52, 72, 92, 108].map((x, i) => (
            <circle key={x} cx={x} cy={[42, 40, 34, 36, 26, 22][i]} r="2.2" fill={i >= 4 ? accent : line} />
          ))}
          <text x="112" y="14" textAnchor="end" fontFamily="var(--s-mono)" fontSize="9" fill={ink}>
            SLP 2.4
          </text>
        </svg>
      );
  }
}
