import Link from "next/link";
import { TrainingPreview, type PreviewKind } from "./TrainingPreview";
import { SkillStatus } from "./SkillStatus";
import type { ProgressResponse } from "@/lib/api/types";

export type Destination = {
  href: string;
  /** Small uppercase category label, e.g. "Train". */
  kind: string;
  label: string;
  detail: string;
  preview: PreviewKind;
  cta: string;
  disabled?: boolean;
  disabledReason?: string;
};

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
}: {
  skill: string;
  title: string;
  lead: string;
  primary?: { href: string; label: string; disabled?: boolean; disabledReason?: string };
  destinations: Destination[];
  progress: ProgressResponse | null;
  practiceHref: string;
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
        <SkillStatus progress={progress} skill={key} practiceHref={practiceHref} />
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
                      <span className="p-lock-chip">Locked</span>
                      <span>{dest.disabledReason ?? "Not available on your current plan."}</span>
                    </p>
                  ) : (
                    <p className="p-dest-go">
                      {dest.cta}
                      <span className="p-arrow" aria-hidden="true">→</span>
                    </p>
                  )}
                </div>
              </>
            );

            if (dest.disabled) {
              return (
                <div key={dest.href} className="p-dest is-locked" data-reveal style={{ ["--i" as string]: index + 1 }}>
                  {body}
                </div>
              );
            }
            return (
              <Link key={dest.href} href={dest.href} className="p-dest" data-reveal style={{ ["--i" as string]: index + 1 }}>
                {body}
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
