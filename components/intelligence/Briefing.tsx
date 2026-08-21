import Link from "next/link";
import type { MissionItem, ReadinessCard, WeaknessItem } from "@/lib/api/intelligence";
import { ReadinessGauge } from "./ReadinessGauge";
import { PriorityAction } from "@/components/training/PriorityAction";
import { TransitionLink } from "@/components/TransitionLink";
import { TransitionTarget } from "@/components/TransitionTarget";

/**
 * The intelligence briefing.
 *
 * The previous screen was a readiness card beside a list of missions —
 * true, but it never said what it knew or what to do about it. This
 * composes the same real fields as a diagnostic sequence, because that is
 * genuinely what they are: the backend measures (evidence), identifies
 * where accuracy is weak (diagnosis), ranks what to fix first (priority),
 * and the Academy owns the class that fixes it (action). The numbering is
 * the actual order of that reasoning, not decoration.
 *
 * Every value is a real backend field. A step whose data the backend did
 * not return is omitted entirely rather than filled with a placeholder —
 * so a thin profile shows a short briefing, never an invented one.
 */

const SEVERITY_RANK: Record<string, number> = { high: 0, critical: 0, medium: 1, moderate: 1, low: 2 };

function severityTone(severity: string): "critical" | "warn" | "calm" {
  const s = severity.trim().toLowerCase();
  if (s === "high" || s === "critical") return "critical";
  if (s === "medium" || s === "moderate") return "warn";
  return "calm";
}

const SEVERITY_TIER_LABEL: Record<"critical" | "warn" | "calm", string> = {
  critical: "Needs attention",
  warn: "Developing",
  calm: "Minor",
};

/**
 * Groups the same real, already-ranked findings into near-to-far tiers
 * and reuses Writing Intelligence's `.intel-ladder` depth exactly (see
 * app/(app)/writing/intelligence/page.tsx's `bandTiers`) — critical
 * findings sit closest since they're what actually needs attention now,
 * developing recedes, minor recedes furthest. Same component, grouped
 * by severity instead of band, because Reading/Listening's diagnosis
 * step never carried a `band` field to group by in the first place.
 */
function severityTiers(items: WeaknessItem[]): Array<{ tone: "critical" | "warn" | "calm"; items: WeaknessItem[] }> {
  const byTone = new Map<"critical" | "warn" | "calm", WeaknessItem[]>();
  for (const item of items) {
    const tone = severityTone(item.severity);
    const list = byTone.get(tone);
    if (list) list.push(item);
    else byTone.set(tone, [item]);
  }
  return (["critical", "warn", "calm"] as const).filter((tone) => byTone.has(tone)).map((tone) => ({ tone, items: byTone.get(tone)! }));
}

export function IntelligenceBriefing({
  skill,
  card,
  weaknesses,
  missions,
  missionsLocked,
  weaknessHref,
  missionHref,
  academyHref,
  practiceHref,
  readinessFailed,
}: {
  skill: string;
  card: ReadinessCard;
  weaknesses: WeaknessItem[];
  missions: MissionItem[];
  missionsLocked: boolean;
  weaknessHref: (item: WeaknessItem) => string;
  missionHref: (item: MissionItem) => string;
  academyHref: string;
  practiceHref: string;
  readinessFailed?: boolean;
}) {
  const key = skill.trim().toLowerCase();
  const ranked = [...weaknesses].sort(
    (a, b) => (SEVERITY_RANK[a.severity.toLowerCase()] ?? 3) - (SEVERITY_RANK[b.severity.toLowerCase()] ?? 3)
  );
  const priority = missions[0] ?? null;
  const bars = card.scoreBars.filter((b) => b.label);
  const steps: string[] = [];
  if (bars.length) steps.push("evidence");
  if (ranked.length) steps.push("diagnosis");
  if (priority || missionsLocked) steps.push("priority");
  steps.push("action");
  const stepIdx = (name: string) => steps.indexOf(name);
  const stepNo = (name: string) => String(stepIdx(name) + 1).padStart(2, "0");
  const nodeStyle = (name: string) => ({ ["--i" as string]: stepIdx(name) });

  return (
    <div className={`intel skill-${key}`}>
      <TransitionTarget as="section" className="p-hero intel-hero-row" data-enter>
        <div>
          <p className="p-eyebrow is-skill">{skill} Intelligence</p>
          <h1 className="p-hero-title">{card.label || "What the evidence says"}</h1>
          <p className="p-lead">
            {card.milestone
              ? card.milestone
              : "Everything below is measured from work you submitted. Where the evidence is thin, this says so instead of guessing."}
          </p>
          <dl className="p-evidence intel-facts">
            {card.totalAttempts > 0 ? (
              <div>
                <dt>Evidence</dt>
                <dd className="p-num">{card.totalAttempts} attempts</dd>
              </div>
            ) : null}
            {card.activeLevel ? (
              <div>
                <dt>Working at</dt>
                <dd className="p-num">SLP {card.activeLevel}</dd>
              </div>
            ) : null}
            {ranked.length ? (
              <div>
                <dt>Weak areas</dt>
                <dd className="p-num">{ranked.length}</dd>
              </div>
            ) : null}
          </dl>
        </div>
        {readinessFailed ? null : (
          <div className="intel-gauge-bay">
            <ReadinessGauge value={card.readiness} label="Readiness" caption={card.status ? card.status.replace(/_/g, " ") : ""} />
            <p className="intel-gauge-note">This is a readiness score, not Estimated SLP.</p>
          </div>
        )}
      </TransitionTarget>

      <div className="intel-spine">
      {steps.includes("evidence") && bars.length ? (
        <section className="p-section intel-step" data-reveal>
          <div className="intel-step-head">
            <span className="intel-step-no p-num" style={nodeStyle("evidence")}>{stepNo("evidence")}</span>
            <div>
              <h2>What the evidence shows</h2>
              <p>Accuracy the backend has actually recorded, by sub-skill.</p>
            </div>
          </div>
          <ul className="intel-bars">
            {bars.map((bar, i) => (
              <li key={bar.label} className="p-reveal-item" style={{ ["--i" as string]: i }}>
                <span className="intel-bar-label">{bar.label}</span>
                <span className="intel-bar-track">
                  <i style={{ width: `${Math.max(0, Math.min(100, bar.value))}%` }} />
                </span>
                <span className="intel-bar-val p-num">{Math.round(bar.value)}%</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {steps.includes("diagnosis") ? (
        <section className="p-section intel-step" data-reveal>
          <div className="intel-step-head">
            <span className="intel-step-no p-num" style={nodeStyle("diagnosis")}>{stepNo("diagnosis")}</span>
            <div>
              <h2>What is holding you back</h2>
              <p>Ranked by severity. Each one opens the class that trains it.</p>
            </div>
          </div>
          <div className="intel-ladder">
            {severityTiers(ranked).map((tier, ti) => (
              <div key={tier.tone} className="intel-ladder-tier" style={{ ["--tier" as string]: ti }} data-reveal>
                <p className="intel-ladder-label p-num">{SEVERITY_TIER_LABEL[tier.tone]}</p>
                <ul className="intel-findings" aria-label={`${SEVERITY_TIER_LABEL[tier.tone]} weak areas`}>
                  {tier.items.map((item, i) => (
                    <li key={item.key} className="p-reveal-item" style={{ ["--i" as string]: i }}>
                      <TransitionLink href={weaknessHref(item)} className={`intel-finding tone-${tier.tone} p-elevate`}>
                        <span className="intel-finding-bar" aria-hidden="true" />
                        <span className="intel-finding-main">
                          <strong>{item.label || item.key}</strong>
                          <span className="intel-finding-meta">
                            {item.severity ? <em className={`intel-sev tone-${tier.tone}`}>{item.severity}</em> : null}
                            {item.accuracy != null ? <span className="p-num">{Math.round(item.accuracy)}% accurate</span> : null}
                            {item.attempts > 0 ? <span className="p-num">{item.attempts} attempts</span> : null}
                            {item.trend ? <span>{item.trend}</span> : null}
                          </span>
                          {!item.reportable ? (
                            <span className="intel-thin">Too few attempts to state a level — this is a direction, not a verdict.</span>
                          ) : null}
                        </span>
                        <span className="intel-finding-go p-arrow" aria-hidden="true">→</span>
                      </TransitionLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {steps.includes("priority") ? (
        <section className="p-section intel-step" data-reveal>
          <div className="intel-step-head">
            <span className="intel-step-no p-num" style={nodeStyle("priority")}>{stepNo("priority")}</span>
            <div>
              <h2>Train this first</h2>
              <p>Chosen by the backend from the same evidence — not a second opinion.</p>
            </div>
          </div>
          {missionsLocked ? (
            <p className="muted">Recommended missions are not available on your current plan.</p>
          ) : priority ? (
            <PriorityAction
              eyebrow="Priority"
              title={priority.title}
              detail={priority.description || undefined}
              evidence={priority.reason ? `Why: ${priority.reason}` : undefined}
              href={missionHref(priority)}
              ctaLabel="Start"
              secondaryHref={practiceHref}
              secondaryLabel="Straight to practice"
            />
          ) : null}
          {missions.length > 1 ? (
            <ul className="intel-queue">
              {missions.slice(1).map((m) => (
                <li key={m.title}>
                  <Link href={missionHref(m)}>{m.title}</Link>
                  {m.reason ? <span className="muted"> — {m.reason}</span> : null}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      <section className="p-section intel-step" data-reveal>
        <div className="intel-step-head">
          <span className="intel-step-no p-num" style={nodeStyle("action")}>{stepNo("action")}</span>
          <div>
            <h2>Where to go now</h2>
            <p>The Academy owns the class. Practice is where the evidence changes.</p>
          </div>
        </div>
        <div className="intel-exits">
          <TransitionLink href={academyHref} className="intel-exit is-primary p-elevate">
            <span className="p-eyebrow">Learn</span>
            <strong>Open {skill} Academy</strong>
            <p>Structured classes chosen from this same evidence.</p>
            <span className="intel-exit-go">
              Open Academy <span className="p-arrow" aria-hidden="true">→</span>
            </span>
          </TransitionLink>
          <TransitionLink href={practiceHref} className="intel-exit p-elevate">
            <span className="p-eyebrow">Train</span>
            <strong>Go to practice</strong>
            <p>Add attempts. Nothing here moves until you do.</p>
            <span className="intel-exit-go">
              Start practice <span className="p-arrow" aria-hidden="true">→</span>
            </span>
          </TransitionLink>
        </div>
      </section>

      <div className="intel-spine-end" data-reveal>
        <span className="intel-step-no" style={{ ["--i" as string]: steps.length }} aria-hidden="true" />
        <p>
          What you train from here updates <Link href="/progress">Progress</Link>.
        </p>
      </div>
      </div>
    </div>
  );
}
