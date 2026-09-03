import { stagger } from "../primitives";

type Skill = "listening" | "speaking" | "reading" | "writing";

/**
 * The hero instrument: an illustrative Standardized Language Profile.
 *
 * Four skills in the SLP's own order (Listening, Speaking, Reading, Writing),
 * each measured on its own; a signal line at the lowest digit, because
 * requirements are set per digit and the lowest one decides whether a profile
 * meets them. Values are illustrative and say so.
 */
const PROFILE: { skill: Skill; label: string; level: number }[] = [
  { skill: "listening", label: "Listening", level: 2 },
  { skill: "speaking", label: "Speaking", level: 2 },
  { skill: "reading", label: "Reading", level: 3 },
  { skill: "writing", label: "Writing", level: 2 },
];

const MAX_LEVEL = 4;

export function ProfileInstrument() {
  const gate = Math.min(...PROFILE.map((p) => p.level));
  const gatePct = (gate / MAX_LEVEL) * 100;
  const description = `${PROFILE.map((p) => `${p.label} ${p.level}`).join(", ")}. The lowest digit is ${gate}; requirements are set per skill, so that digit decides whether the profile meets them.`;

  return (
    <figure className="s-instrument" role="group" aria-labelledby="profile-caption" data-hero="visual">
      <div className="s-instrument-bar">
        <span>
          <b>Estimated profile</b> <span className="s-desk">· illustrative</span>
        </span>
        <span className="s-tag">Target SLP 3</span>
      </div>
      <div className="s-instrument-body">
        <div className="profile-plot" aria-hidden="true">
          <div className="profile-scale">
            {[1, 2, 3].map((level) => (
              <i key={level} data-l={`L${level}`} style={{ top: `${100 - (level / MAX_LEVEL) * 100}%` }} />
            ))}
          </div>
          <div className="profile-gate" style={{ top: `${100 - gatePct}%` }}>
            <span>Gate · {gate}</span>
          </div>
          {PROFILE.map((p, i) => (
            <div key={p.skill} className={`profile-col profile-col--${p.skill}`} style={stagger(i)}>
              <div
                className="profile-bar"
                style={{ ["--h" as string]: `${(p.level / MAX_LEVEL) * 100}%`, ["--i" as string]: i } as React.CSSProperties}
              />
              <div className="profile-val" style={{ ["--h" as string]: `${(p.level / MAX_LEVEL) * 100}%`, ["--i" as string]: i } as React.CSSProperties}>
                {p.level}
                <small>SLP</small>
              </div>
            </div>
          ))}
        </div>
        <div className="profile-labels" aria-hidden="true">
          {PROFILE.map((p) => (
            <span key={p.skill}>
              <i className={`s-dot s-dot--${p.skill}`} />
              {p.label}
            </span>
          ))}
        </div>
        <p className="s-vh">{description}</p>
      </div>
      <div className="s-instrument-foot">
        <span>
          Reading <b>Reliable</b>
        </span>
        <span>
          Speaking <b>Limited evidence</b>
        </span>
        <span className="is-signal">
          Next: <b>Recover Listening · 25 min</b>
        </span>
      </div>
      <figcaption id="profile-caption" className="s-vh">
        An illustrative Standardized Language Profile: four skills measured separately, with the gating digit marked.
      </figcaption>
    </figure>
  );
}
