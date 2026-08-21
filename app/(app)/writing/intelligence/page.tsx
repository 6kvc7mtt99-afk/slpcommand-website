import Link from "next/link";
import { CoverageBar } from "@/components/academy/AcademyLessonView";
import { PriorityAction } from "@/components/training/PriorityAction";
import { decodeWritingCatalog, decodeWritingLearningState, lessonByCompetency } from "@/lib/api/writing";
import { backendJson } from "@/lib/server/backend";
import { loadTargetLevel } from "@/lib/server/targetLevel";

/**
 * Writing Intelligence.
 *
 * `/api/writing/intelligence/{readiness,missions,brain-profile,mastery}` are
 * retired ("legacy" — lib/server/proxyPolicy.ts). The real, current model is
 * `/api/writing/learning-state` (`writing_learning_state_v3` /
 * `writing_competencies_v3`, verified live) — a genuine evidence-based
 * competency graph, not a re-derivation of Academy's own coverage numbers.
 * It has no 0–100 readiness figure the way Reading/Listening's model does,
 * so this page has no gauge — a fabricated one would claim a precision the
 * backend doesn't measure.
 *
 * `blockingPromotion` competencies link to their real lesson through the
 * catalog's `competencyId` (`/api/writing/academy/lessons`), the same
 * competency ids the entries are already keyed by — not a guessed mapping.
 *
 * `state.targetLevel` (the response's own field) is NOT the learner's
 * chosen target — live-verified against a real account where /profile
 * said "2" and this field said "3" simultaneously. Checking the per-item
 * `band` values confirmed why: `blockingPromotion` spans the whole SLP
 * 1+->3 ladder in one list (bands 1+, 2, 2+ and 3 all present at once for
 * the same account), so this field is the model's ceiling, not a target.
 * The real target — the one thing Settings actually lets a learner set —
 * comes from `loadTargetLevel()` (/profile) instead, the same source
 * Home/Progress/every skill hub already read.
 */
export default async function WritingIntelligencePage() {
  const [stateResult, catalogResult, targetLevel] = await Promise.all([
    backendJson<unknown>({ path: "/api/writing/learning-state", cache: "no-store" }),
    backendJson<unknown>({ path: "/api/writing/academy/lessons", cache: "no-store" }),
    loadTargetLevel(),
  ]);

  if (stateResult.status >= 400 || !stateResult.data) {
    return (
      <div className="intel skill-writing">
        <section className="p-hero" data-enter>
          <div>
            <p className="p-eyebrow is-skill">Writing Intelligence</p>
            <h1 className="p-hero-title">Unavailable right now</h1>
            <p className="p-lead">Nothing was invented locally. Writing Academy and Practice still work.</p>
          </div>
        </section>
      </div>
    );
  }

  const state = decodeWritingLearningState(stateResult.data);
  if (!state) {
    return (
      <div className="intel skill-writing">
        <section className="p-hero" data-enter>
          <div>
            <p className="p-eyebrow is-skill">Writing Intelligence</p>
            <h1 className="p-hero-title">Unavailable right now</h1>
            <p className="p-lead">The response didn’t match the expected shape. Nothing was invented locally.</p>
          </div>
        </section>
      </div>
    );
  }

  const catalog = decodeWritingCatalog(catalogResult.status < 400 ? catalogResult.data : null);
  const byCompetency = lessonByCompetency(catalog);
  const lessonHref = (competencyId: string): string | null => {
    const lesson = byCompetency.get(competencyId);
    return lesson ? `/writing/academy/lesson/${encodeURIComponent(lesson.id)}` : null;
  };

  const priority = state.nextTraining[0] ?? null;
  const { mastered, emerging, weak, untested, blocked } = state.summary;
  const coverageTotal = mastered + emerging + weak + untested + blocked;

  const steps: string[] = [];
  if (coverageTotal > 0) steps.push("evidence");
  if (state.blockingPromotion.length) steps.push("diagnosis");
  if (priority) steps.push("priority");
  steps.push("action");
  const stepIdx = (name: string) => steps.indexOf(name);
  const stepNo = (name: string) => String(stepIdx(name) + 1).padStart(2, "0");
  const nodeStyle = (name: string) => ({ ["--i" as string]: stepIdx(name) });

  return (
    <div className="intel skill-writing">
      <section className="p-hero" data-enter>
        <div>
          <p className="p-eyebrow is-skill">Writing Intelligence</p>
          <h1 className="p-hero-title">{state.hasEvidence ? "What your writing shows" : "Not enough evidence yet"}</h1>
          <p className="p-lead">
            {state.hasEvidence
              ? "Measured from the examiner reports on your own submissions. Where a competency has no evidence, it says so instead of guessing."
              : "Submit a writing task to start building this. Nothing here is estimated to fill the gap."}
          </p>
          <dl className="p-evidence intel-facts">
            {state.attempts > 0 ? (
              <div>
                <dt>Evidence</dt>
                <dd className="p-num">{state.attempts} submissions</dd>
              </div>
            ) : null}
            {targetLevel ? (
              <div>
                <dt>Target</dt>
                <dd className="p-num">SLP {targetLevel}</dd>
              </div>
            ) : null}
            {state.blockingPromotion.length ? (
              <div>
                <dt>Blocking promotion</dt>
                <dd className="p-num">{state.blockingPromotion.length}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </section>

      <div className="intel-spine">
        {steps.includes("evidence") ? (
          <section className="p-section intel-step" data-reveal>
            <div className="intel-step-head">
              <span className="intel-step-no p-num" style={nodeStyle("evidence")}>{stepNo("evidence")}</span>
              <div>
                <h2>Where you stand</h2>
                <p>Every competency the model tracks, by real state — {coverageTotal} total.</p>
              </div>
            </div>
            <CoverageBar
              segments={[
                { label: "Sustained", value: mastered, tone: "ok" },
                { label: "Developing", value: emerging, tone: "accent" },
                { label: "Needs work", value: weak, tone: "warn" },
                { label: "Not asked", value: untested, tone: "muted" },
                { label: "Waiting", value: blocked, tone: "muted" },
              ]}
            />
          </section>
        ) : null}

        {steps.includes("diagnosis") ? (
          <section className="p-section intel-step" data-reveal>
            <div className="intel-step-head">
              <span className="intel-step-no p-num" style={nodeStyle("diagnosis")}>{stepNo("diagnosis")}</span>
              <div>
                <h2>What is blocking your next promotion</h2>
                <p>Every competency still open, at any level up to SLP 3 — not only the ones tied to your current target. Each opens the class that trains it.</p>
              </div>
            </div>
            <ul className="intel-findings">
              {state.blockingPromotion.map((item, i) => {
                const href = lessonHref(item.id);
                const example = item.examples[0];
                const tone = example?.severity === "critical" ? "critical" : example?.severity === "recurrent" ? "warn" : "calm";
                const body = (
                  <>
                    <span className="intel-finding-bar" aria-hidden="true" />
                    <span className="intel-finding-main">
                      <strong>{item.title}</strong>
                      <span className="intel-finding-meta">
                        <em className={`intel-sev tone-${tone}`}>{item.state}</em>
                        <span className="p-num">{item.demonstrations} demonstrations</span>
                        {item.band ? <span>band {item.band}</span> : null}
                      </span>
                      {example ? <span className="intel-thin">“{example.text}”</span> : null}
                    </span>
                    {href ? <span className="intel-finding-go p-arrow" aria-hidden="true">→</span> : null}
                  </>
                );
                return (
                  <li key={item.id} className="p-reveal-item" style={{ ["--i" as string]: i }}>
                    {href ? (
                      <Link href={href} className={`intel-finding tone-${tone} p-elevate`}>
                        {body}
                      </Link>
                    ) : (
                      <div className={`intel-finding tone-${tone}`}>{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {steps.includes("priority") && priority ? (
          <section className="p-section intel-step" data-reveal>
            <div className="intel-step-head">
              <span className="intel-step-no p-num" style={nodeStyle("priority")}>{stepNo("priority")}</span>
              <div>
                <h2>Train this first</h2>
                <p>Chosen from the same evidence — not a second opinion.</p>
              </div>
            </div>
            <PriorityAction
              eyebrow="Priority"
              title={priority.title}
              evidence={priority.why || undefined}
              href={lessonHref(priority.id) || "/writing/academy"}
              ctaLabel="Start"
              secondaryHref="/writing/practice"
              secondaryLabel="Straight to practice"
            />
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
            <Link href="/writing/academy" className="intel-exit is-primary p-elevate">
              <span className="p-eyebrow">Learn</span>
              <strong>Open Writing Academy</strong>
              <p>Structured classes chosen from this same evidence.</p>
              <span className="intel-exit-go">
                Open Academy <span className="p-arrow" aria-hidden="true">→</span>
              </span>
            </Link>
            <Link href="/writing/practice" className="intel-exit p-elevate">
              <span className="p-eyebrow">Train</span>
              <strong>Go to practice</strong>
              <p>Add attempts. Nothing here moves until you do.</p>
              <span className="intel-exit-go">
                Start practice <span className="p-arrow" aria-hidden="true">→</span>
              </span>
            </Link>
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
