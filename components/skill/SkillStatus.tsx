import type { ProgressResponse } from "@/lib/api/types";

/**
 * "Where you stand in this skill" — the instrument beside each hub hero.
 *
 * Every value is read straight from GET /api/progress. When the backend
 * says this skill is not available, or has no level yet, the panel does
 * not fall back to a zero or a dash — it renders an honest baseline
 * state that explains what is missing and points at the one action that
 * fixes it. Nothing here is derived, rounded, or estimated in the
 * browser.
 */
export function SkillStatus({
  progress,
  skill,
  practiceHref,
}: {
  progress: ProgressResponse | null;
  skill: "reading" | "listening" | "writing" | "speaking";
  practiceHref: string;
}) {
  const row = progress?.skills?.[skill] ?? null;
  const measured = Boolean(row?.available && row?.level != null);
  const target = progress?.targetLevel ? String(progress.targetLevel) : null;
  const evidence = row?.evidence;

  return (
    <aside className="p-status p-panel" aria-label={`${skill} standing`}>
      <p className="p-eyebrow">Your standing</p>

      {measured ? (
        <>
          <p className="p-status-level p-num">
            SLP <b>{String(row!.level)}</b>
          </p>
          {row!.confidence_label ? (
            <p className="p-status-conf">
              <span className="p-dotmark" aria-hidden="true" />
              {row!.confidence_label}
              {row!.stale ? " · out of date" : ""}
            </p>
          ) : null}
        </>
      ) : (
        <>
          <p className="p-status-level is-empty">No level yet</p>
          <p className="p-status-conf">Your first attempts set the baseline.</p>
        </>
      )}

      <dl className="p-status-rows">
        {evidence && evidence.count > 0 ? (
          <div>
            <dt>Evidence</dt>
            <dd className="p-num">
              {evidence.count} {evidence.unit || "attempts"}
            </dd>
          </div>
        ) : null}
        {target ? (
          <div>
            <dt>Target</dt>
            <dd className="p-num">SLP {target}</dd>
          </div>
        ) : null}
      </dl>

      <a className="p-status-link" href={practiceHref}>
        {measured ? "Add evidence" : "Set your baseline"}
        <span className="p-arrow" aria-hidden="true">→</span>
      </a>
    </aside>
  );
}
