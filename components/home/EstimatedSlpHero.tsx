import {
  displayOverallLevel,
  firstConfidenceScale,
  readConfidencePosition,
  shouldShowProgressRing,
} from "@/lib/api/progress";
import type { ProgressResponse } from "@/lib/api/types";

const SKILLS = ["reading", "listening", "writing", "speaking"] as const;

function formatLevel(level: string | number | null): string | null {
  if (level == null) return null;
  return String(level);
}

/** Visualise the same overall figure on the 0–4 SLP scale. Not a new metric. */
function ringPercent(overall: string): number {
  const n = Number(overall);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, (n / 4) * 100));
}

export function EstimatedSlpHero({ progress }: { progress: ProgressResponse | null }) {
  if (!progress) return null;

  const showRing = shouldShowProgressRing(progress);
  const overall = formatLevel(displayOverallLevel(progress));
  const label =
    progress.skills.reading.confidence_label ||
    progress.skills.listening.confidence_label ||
    progress.skills.writing.confidence_label ||
    progress.skills.speaking.confidence_label ||
    progress.overall.confidence;

  return (
    <article className="home-card home-slp">
      <div className="home-slp-top">
        <div>
          <p className="home-kicker">Estimated SLP</p>
          <p className="muted">Overall · all skills</p>
        </div>
        {showRing && overall ? (
          <div
            className="home-ring"
            aria-label={`Estimated SLP ${overall}`}
            style={{ ["--ring" as string]: ringPercent(overall) }}
          >
            <span>SLP {overall}</span>
          </div>
        ) : null}
      </div>

      {label ? <p>Confidence: {label}</p> : null}
      {progress.totalExercises > 0 ? (
        <p className="muted">{progress.totalExercises} recorded exercises</p>
      ) : null}

      <div className="home-skill-minis">
        {SKILLS.map((skill) => {
          const row = progress.skills[skill];
          const level = formatLevel(row.level);
          return (
            <div key={skill} className="home-skill-mini">
              <span className="home-skill-name">{skill}</span>
              <strong>{row.available && level ? `SLP ${level}` : "Not yet"}</strong>
            </div>
          );
        })}
      </div>
    </article>
  );
}

export function ConfidenceScaleCard({ progress }: { progress: ProgressResponse | null }) {
  if (!progress) return null;
  const position = readConfidencePosition(firstConfidenceScale(progress));
  if (!position) return null;

  return (
    <article className="home-card">
      <p className="home-kicker">Confidence scale</p>
      <div className="confidence-position">
        <strong>{position.label}</strong>
        {position.position != null && position.total != null ? (
          <span className="muted">
            {" "}
            — {position.position} of {position.total}
          </span>
        ) : null}
      </div>
      {position.total != null ? (
        <div className="confidence-rungs" aria-hidden="true">
          {Array.from({ length: position.total }, (_, i) => (
            <span key={i} className={i < (position.position ?? 0) ? "is-reached" : ""} />
          ))}
        </div>
      ) : null}
      {position.meaning ? <p className="muted">{position.meaning}</p> : null}
    </article>
  );
}

export function TransitionBanner({ progress }: { progress: ProgressResponse | null }) {
  if (!progress?.proficiencyTransition.noticeable || !progress.proficiencyTransition.notice) return null;
  return (
    <aside className="home-banner" role="status">
      {progress.proficiencyTransition.notice}
    </aside>
  );
}
