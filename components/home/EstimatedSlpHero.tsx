/**
 * Two live surfaces that happen to share this file.
 *
 * The `EstimatedSlpHero` component this file is named after has been removed —
 * it had zero references. Its private helpers (`SKILLS`, `formatLevel`,
 * `ringPercent`) and the imports only it used went with it. `ConfidenceScaleCard`
 * and `TransitionBanner` below are both live: /progress renders the first, and
 * both /progress and HomeDashboard render the second. The filename is now a
 * historical label rather than a description; renaming it would churn two
 * import sites for no behavioural gain.
 */
import {
  firstConfidenceScale,
  readConfidencePosition,
} from "@/lib/api/progress";
import type { ProgressResponse } from "@/lib/api/types";

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

/**
 * This is the "what changed, and what should I do about it" content the
 * Progress review flagged as missing. It already existed in the API response
 * — `notice` (title/body) and `coach` (whyChanged/whatNow/howToRaise) — and
 * was invisible because `notice` used to be typed as a string when the real
 * field is an object; see the note on decodeTransitionNotice. No history is
 * fabricated here: the same real response marks `allowTrendAcross: false`
 * for this account, i.e. the backend itself says a continuous trend line
 * across a methodology change would misrepresent it, which is exactly why
 * this stays text (what changed and why) rather than a chart.
 */
export function TransitionBanner({ progress }: { progress: ProgressResponse | null }) {
  const { noticeable, notice, coach } = progress?.proficiencyTransition ?? { noticeable: false, notice: null, coach: null };
  if (!noticeable || !notice) return null;
  return (
    <aside className="home-banner transition-banner" role="status">
      {notice.title ? <p className="transition-banner-title">{notice.title}</p> : null}
      {notice.body ? <p>{notice.body}</p> : null}
      {coach ? (
        <dl className="transition-coach">
          {coach.whyChanged ? (
            <div>
              <dt>What changed</dt>
              <dd>{coach.whyChanged}</dd>
            </div>
          ) : null}
          {coach.whatNow ? (
            <div>
              <dt>What now</dt>
              <dd>{coach.whatNow}</dd>
            </div>
          ) : null}
          {coach.howToRaise ? (
            <div>
              <dt>How to raise it</dt>
              <dd>{coach.howToRaise}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </aside>
  );
}
