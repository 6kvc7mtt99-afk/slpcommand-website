import Link from "next/link";
import { TrainingPreview, type PreviewKind } from "./TrainingPreview";
import { SkillStatus } from "./SkillStatus";
import type { ProgressResponse } from "@/lib/api/types";

export type Destination = {
  href: string;
  /** Drives the panel's visual identity. "assess" mirrors the exam environment. */
  mode?: "train" | "assess" | "learn" | "review";
  /** Small uppercase category label, e.g. "Train". */
  kind: string;
  label: string;
  detail: string;
  preview: PreviewKind;
  cta: string;
  disabled?: boolean;
  disabledReason?: string;
  /**
   * Real remaining/limit from the entitlements response for this
   * destination's feature. The learner could previously only discover a
   * spent allowance by opening the task and hitting the wall — the
   * number existed on every request and was never shown. Omitted when
   * the plan reports no limit for the feature.
   */
  quota?: {
    remaining: number | null;
    limit: number | null;
    period: string | null;
    /**
     * WHY the destination is unusable, straight from `featureAccess`.
     *
     * Without it a spent allowance, a feature the plan never included and a
     * failed entitlements read are indistinguishable here — see lockReason.
     */
    reason?: "ok" | "spent" | "notOnPlan" | "unknown";
  };
};

function periodPhrase(period: string | null | undefined): string {
  return period === "weekly" ? " this week" : period === "monthly" ? " this month" : "";
}

/** "4 of 10 left this week" from real numbers only; null if either is missing. */
function quotaLine(quota: Destination["quota"]): string | null {
  if (!quota || quota.remaining == null || quota.limit == null) return null;
  return `${quota.remaining} of ${quota.limit} left${periodPhrase(quota.period)}`;
}

/**
 * Why a destination is unavailable.
 *
 * A spent allowance and an unentitled feature both arrive as
 * `usable: false`, and both used to render the plan's copy — so a
 * learner who had simply used their ten reading passages was told the
 * feature was "not available on your current plan", which is not what
 * happened. When the entitlements response says the limit was reached,
 * that is what this says.
 */
function lockReason(dest: Destination): string {
  const quota = dest.quota;
  /**
   * An entitlements read that FAILED is not an answer about the plan.
   *
   * `featureAccess` returns `reason: "unknown"` when the snapshot never
   * loaded — a 5xx, a proxy timeout, a cold Render dyno — and its own doc
   * comment says "the screen may block but must not claim a reason". This
   * function never read that field: it checked `remaining === 0`, then fell
   * through to the caller's `disabledReason`, which every hub hard-codes to
   * plan copy. So a Pro subscriber hitting a backend blip was told, on both
   * Practice and Exam, that what they pay for is "not available on your
   * current plan" — the exact failure lib/entitlements.ts was written to
   * prevent for the plan label, reappearing one layer up.
   */
  if (quota?.reason === "unknown") {
    return "We couldn't check your plan just now. Reload in a moment — nothing about your account has changed.";
  }
  if (quota && quota.remaining === 0 && quota.limit != null) {
    const resets =
      quota.period === "weekly" ? "next week" : quota.period === "monthly" ? "next month" : "with your plan";
    // "all 1 this month" reads as a bug even though the number is right.
    const spent =
      quota.limit === 1
        ? `You have used your one${periodPhrase(quota.period)}`
        : `You have used all ${quota.limit}${periodPhrase(quota.period)}`;
    return `${spent}. This resets ${resets}.`;
  }
  return dest.disabledReason ?? "Not available on your current plan.";
}

/**
 * A skill hub as a product surface rather than a list of links.
 *
 * The Phase 2 hub put Practice and Exam — the two things the product
 * exists to do — into a column of small text links beside a large
 * wordmark, with the rest of the viewport empty. Every destination is
 * now a panel carrying a schematic of the screen it opens, so the four
 * ways to train a skill are visible in one glance and the primary one
 * is a real button.
 *
 * `stat` is only ever passed a value the backend actually measured; the
 * caller omits it entirely when there is no evidence yet, rather than
 * this component inventing a placeholder.
 */
export function SkillHub({
  skill,
  title,
  lead,
  primary,
  destinations,
  progress,
  practiceHref,
  progressFailed = false,
}: {
  skill: string;
  title: string;
  lead: string;
  primary?: { href: string; label: string; disabled?: boolean; disabledReason?: string };
  destinations: Destination[];
  progress: ProgressResponse | null;
  practiceHref: string;
  /** The /api/progress read failed — see SkillStatus. */
  progressFailed?: boolean;
}) {
  const key = skill.trim().toLowerCase() as "reading" | "listening" | "writing" | "speaking";

  return (
    <div className={`p-skill-page skill-${key}`}>
      <section className="p-hero" data-enter>
        <div>
          <p className="p-eyebrow is-skill">{skill}</p>
          <h1 className="p-hero-title">{title}</h1>
          <p className="p-lead">{lead}</p>
          <div className="p-hero-actions">
            {primary && !primary.disabled ? (
              <Link className="btn btn-primary btn-hero" href={primary.href}>
                {primary.label}
                <span className="p-arrow" aria-hidden="true">→</span>
              </Link>
            ) : null}
          </div>
          {primary?.disabled && primary.disabledReason ? (
            <p className="muted" style={{ marginTop: 14, maxWidth: "44ch" }}>{primary.disabledReason}</p>
          ) : null}
        </div>
        <SkillStatus progress={progress} skill={key} practiceHref={practiceHref} progressFailed={progressFailed} />
      </section>

      <section className="p-section" aria-label={`${skill} training modes`}>
        <div className="p-section-head" data-reveal style={{ ["--i" as string]: 0 }}>
          <div>
            <h2>Ways to train {key}</h2>
            <p>Every mode reads the same evidence, so none of them disagree about where you stand.</p>
          </div>
        </div>
        <div className="p-destinations">
          {destinations.map((dest, index) => {
            const body = (
              <>
                <div className="p-dest-stage">
                  <TrainingPreview kind={dest.preview} />
                </div>
                <div className="p-dest-body">
                  <p className="p-dest-label">{dest.kind}</p>
                  <h3>{dest.label}</h3>
                  <p>{dest.detail}</p>
                  {dest.disabled ? (
                    <p className="p-dest-locked">
                      <span className="p-lock-chip">
                        {/* "Locked" is a claim about the plan. When the plan
                            could not be read, the honest chip says the check
                            failed — not that the learner lacks the feature. */}
                        {dest.quota?.reason === "unknown"
                          ? "Check failed"
                          : dest.quota?.remaining === 0 && dest.quota.limit != null
                            ? "Used up"
                            : "Locked"}
                      </span>
                      <span>{lockReason(dest)}</span>
                    </p>
                  ) : (
                    <p className="p-dest-go">
                      {dest.cta}
                      <span className="p-arrow" aria-hidden="true">→</span>
                      {quotaLine(dest.quota) ? (
                        <span className="p-dest-quota p-num">{quotaLine(dest.quota)}</span>
                      ) : null}
                    </p>
                  )}
                </div>
              </>
            );

            if (dest.disabled) {
              return (
                <div key={dest.href} className={`p-dest is-locked mode-${dest.mode ?? "learn"}`} data-reveal style={{ ["--i" as string]: index + 1 }}>
                  {body}
                </div>
              );
            }
            return (
              <Link key={dest.href} href={dest.href} className={`p-dest mode-${dest.mode ?? "learn"}`} data-reveal style={{ ["--i" as string]: index + 1 }}>
                {body}
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
