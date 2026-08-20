import Link from "next/link";
import { ConfidenceScaleCard, TransitionBanner } from "@/components/home/EstimatedSlpHero";
import { ReadinessInstrument, type InstrumentSkill } from "@/components/instrument/ReadinessInstrument";
import { displayOverallLevel } from "@/lib/api/progress";
import { loadProgress } from "@/lib/server/home";
import { evidenceUnit } from "@/lib/evidenceUnit";

const SKILLS = ["reading", "listening", "writing", "speaking"] as const;

export default async function ProgressPage() {
  const progress = await loadProgress();
  const overallRaw = progress ? displayOverallLevel(progress) : null;
  const overall = overallRaw == null ? null : Number(overallRaw);
  const hasDial = overall != null && Number.isFinite(overall);
  const confidence =
    progress?.skills.reading.confidence_label ||
    progress?.skills.listening.confidence_label ||
    progress?.overall.confidence ||
    "";

  // Same instrument Home uses, fed the same real per-skill shape — this
  // is the one place in the product where "where do I stand" and "where
  // am I heading" are the same four numbers, so they get the same
  // object rather than a second, flatter chart re-deriving it.
  const instrumentSkills: InstrumentSkill[] = SKILLS.map((skill) => {
    const row = progress?.skills[skill];
    const value = row?.available && row.level != null ? Number(row.level) : NaN;
    return { key: skill, label: skill, level: Number.isFinite(value) ? value : null };
  });
  const targetRaw = (progress?.targetLevel ?? "").toString().trim();
  const targetParsed = targetRaw === "" ? NaN : Number(targetRaw);
  const targetNum = Number.isFinite(targetParsed) && targetParsed > 0 ? targetParsed : null;

  return (
    <div className="p-progress-page">
      <section className="p-hero p-progress-hero" data-enter>
        <div>
          <p className="p-eyebrow">Progress</p>
          <h1 className="p-hero-title">
            {hasDial ? <>You are at SLP {overallRaw}.</> : <>No estimate yet.</>}
          </h1>
          <p className="p-lead">
            {hasDial
              ? "Every level here is measured from work you actually submitted — nothing is estimated to fill a gap. Where the evidence is thin, the confidence label says so."
              : "Estimated SLP appears once you have submitted enough work for the backend to measure it. Nothing is guessed to fill the gap."}
          </p>
          {progress ? (
            <dl className="p-evidence">
              {progress.totalExercises > 0 ? (
                <div>
                  <dt>Evidence</dt>
                  <dd className="p-num">{progress.totalExercises} exercises</dd>
                </div>
              ) : null}
              {confidence ? (
                <div>
                  <dt>Confidence</dt>
                  <dd>{confidence}</dd>
                </div>
              ) : null}
              {progress.targetLevel ? (
                <div>
                  <dt>Target</dt>
                  <dd className="p-num">SLP {progress.targetLevel}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </div>
        <aside className="p-instrument-bay" aria-label="Readiness by skill">
          <ReadinessInstrument skills={instrumentSkills} overall={overall} target={targetNum} size={360} />
        </aside>
      </section>

      <TransitionBanner progress={progress} />

      {progress ? (
        <section className="p-section" aria-label="Skill breakdown">
          <div className="p-section-head" data-reveal>
            <div>
              <h2>Where each skill stands</h2>
              <p>Four independent measurements. A skill with no evidence shows no level.</p>
            </div>
          </div>
          <div className="p-skill-table">
            {SKILLS.map((skill, index) => {
              const row = progress.skills[skill];
              const level = row.available && row.level != null ? Number(row.level) : null;
              const pct = level != null && Number.isFinite(level) ? Math.max(3, Math.min(100, (level / 4) * 100)) : 0;
              // Joined rather than concatenated with leading separators, so a
              // row with only a confidence label never renders a stray "· ".
              const meta: string[] = [];
              if (row.evidence?.count) meta.push(`${row.evidence.count} ${evidenceUnit(row.evidence.unit)}`);
              else if (level == null) meta.push("no evidence yet");
              if (row.confidence_label) meta.push(row.confidence_label);
              if (row.stale) meta.push("out of date");
              return (
                <div key={skill} className={`p-skill-row skill-${skill}`} data-reveal style={{ ["--i" as string]: index }}>
                  <div className="p-skill-row-id">
                    <span className="p-dotmark" aria-hidden="true" />
                    <strong>{skill}</strong>
                  </div>
                  <div className="p-skill-row-bar">
                    <span className="p-rung-bar">
                      <i style={{ width: `${pct}%`, background: "var(--p-skill)" }} />
                    </span>
                  </div>
                  <div className="p-skill-row-meta">
                    <span className="p-num">{meta.join(" · ")}</span>
                  </div>
                  <div className="p-skill-row-val">
                    {level != null ? (
                      <strong className="p-num">SLP {row.level}</strong>
                    ) : (
                      <Link className="p-status-link" href={`/${skill}/practice`}>
                        Set baseline
                        <span className="p-arrow" aria-hidden="true">→</span>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        <p className="muted">Estimated SLP is unavailable right now. The rest of the workspace still works.</p>
      )}

      {progress ? (
        <section className="p-section" data-reveal>
          <div className="p-section-head">
            <div>
              <h2>How sure we are</h2>
              <p>Confidence is a statement about the evidence, not about your English.</p>
            </div>
          </div>
          <ConfidenceScaleCard progress={progress} />
        </section>
      ) : null}
    </div>
  );
}
