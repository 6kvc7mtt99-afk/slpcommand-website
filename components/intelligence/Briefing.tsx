import Link from "next/link";
import type { MissionItem, ReadinessCard, WeaknessItem } from "@/lib/api/intelligence";
import { ReadinessGauge } from "./ReadinessGauge";

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
  const stepNo = (name: string) => String(steps.indexOf(name) + 1).padStart(2, "0");

  return (
    <div className={`intel skill-${key}`}>
      <section className="p-hero intel-hero-row" data-enter>
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
      </section>

      {steps.includes("evidence") && bars.length ? (
        <section className="p-section intel-step" data-reveal>
          <div className="intel-step-head">
            <span className="intel-step-no p-num">{stepNo("evidence")}</span>
            <div>
              <h2>What the evidence shows</h2>
              <p>Accuracy the backend has actually recorded, by sub-skill.</p>
            </div>
          </div>
          <ul className="intel-bars">
            {bars.map((bar, i) => (
              <li key={bar.label} style={{ ["--i" as string]: i }}>
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
            <span className="intel-step-no p-num">{stepNo("diagnosis")}</span>
            <div>
              <h2>What is holding you back</h2>
              <p>Ranked by severity. Each one opens the class that trains it.</p>
            </div>
          </div>
          <ul className="intel-findings">
            {ranked.map((item, i) => {
              const tone = severityTone(item.severity);
              return (
                <li key={item.key} style={{ ["--i" as string]: i }}>
                  <Link href={weaknessHref(item)} className={`intel-finding tone-${tone}`}>
                    <span className="intel-finding-bar" aria-hidden="true" />
                    <span className="intel-finding-main">
                      <strong>{item.label || item.key}</strong>
                      <span className="intel-finding-meta">
                        {item.severity ? <em className={`intel-sev tone-${tone}`}>{item.severity}</em> : null}
                        {item.accuracy != null ? <span className="p-num">{Math.round(item.accuracy)}% accurate</span> : null}
                        {item.attempts > 0 ? <span className="p-num">{item.attempts} attempts</span> : null}
                        {item.trend ? <span>{item.trend}</span> : null}
                      </span>
                      {!item.reportable ? (
                        <span className="intel-thin">Too few attempts to state a level — this is a direction, not a verdict.</span>
                      ) : null}
                    </span>
                    <span className="intel-finding-go p-arrow" aria-hidden="true">→</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {steps.includes("priority") ? (
        <section className="p-section intel-step" data-reveal>
          <div className="intel-step-head">
            <span className="intel-step-no p-num">{stepNo("priority")}</span>
            <div>
              <h2>Train this first</h2>
              <p>Chosen by the backend from the same evidence — not a second opinion.</p>
            </div>
          </div>
          {missionsLocked ? (
            <p className="muted">Recommended missions are not available on your current plan.</p>
          ) : priority ? (
            <Link href={missionHref(priority)} className="intel-priority">
              <span className="intel-priority-mark" aria-hidden="true" />
              <span className="intel-priority-body">
                <span className="p-eyebrow">Priority</span>
                <strong>{priority.title}</strong>
                {priority.description ? <p>{priority.description}</p> : null}
                {priority.reason ? <p className="intel-priority-why">Why: {priority.reason}</p> : null}
              </span>
              <span className="intel-priority-go">
                Start
                <span className="p-arrow" aria-hidden="true">→</span>
              </span>
            </Link>
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
          <span className="intel-step-no p-num">{stepNo("action")}</span>
          <div>
            <h2>Where to go now</h2>
            <p>The Academy owns the class. Practice is where the evidence changes.</p>
          </div>
        </div>
        <div className="intel-exits">
          <Link href={academyHref} className="intel-exit is-primary">
            <span className="p-eyebrow">Learn</span>
            <strong>Open {skill} Academy</strong>
            <p>Structured classes chosen from this same evidence.</p>
            <span className="intel-exit-go">
              Open Academy <span className="p-arrow" aria-hidden="true">→</span>
            </span>
          </Link>
          <Link href={practiceHref} className="intel-exit">
            <span className="p-eyebrow">Train</span>
            <strong>Go to practice</strong>
            <p>Add attempts. Nothing here moves until you do.</p>
            <span className="intel-exit-go">
              Start practice <span className="p-arrow" aria-hidden="true">→</span>
            </span>
          </Link>
        </div>
      </section>
    </div>
  );
}
