import Link from "next/link";
import type { AcademyLesson } from "@/lib/api/academy";
import { LessonStages } from "./LessonStages";
import { AcademyCompletionBeacon } from "./AcademyCompletionBeacon";
import { ProductState } from "@/components/ui/ProductState";

/**
 * The lesson experience shared by Reading and Writing (Listening's topic
 * page has its own composition — a topic can bundle several sub-lessons,
 * a lesson cannot, so it isn't force-fit into this shape).
 *
 * Five real fields answer the five questions a learner actually has:
 * WHAT (title/kicker), WHY (learningObjective, plus `why` — the evidence
 * the linking Academy page already computed, only when it was passed
 * through), WHAT TO LEARN (conceptExplanation, the dominant block),
 * HOW TO DEMONSTRATE IT (successCriteria), WHAT'S NEXT (the practice
 * CTA, repeated at the natural end of the content). `strategy` and
 * `commonMisconception` are real fields with no equivalent in the five
 * questions above; they get their own quieter blocks. Nothing here is
 * synthesised — a lesson missing a field just omits that block.
 */
export function AcademyLessonView({
  skill,
  lesson,
  practiceHref,
  why,
}: {
  skill: string;
  lesson: AcademyLesson;
  practiceHref?: string;
  /** Real evidence the linking Academy/Intelligence page already computed — absent when the lesson was reached from the map, search, or a direct link. */
  why?: string;
}) {
  const key = skill.trim().toLowerCase();
  const ctaLabel = why ? "Train this weakness" : "Apply in practice";
  return (
    <div className={`lesson page-skill skill-${key}`}>
      <LessonStages skill={skill} />

      {why ? (
        <p className="lesson-connect" data-enter>
          <strong>Your current priority</strong>
          <span>{why}</span>
        </p>
      ) : null}

      <header data-enter>
        <p className="lesson-kicker">
          <span className="is-skill-text">{skill} Academy</span>
          {lesson.competencyTitle || lesson.module || lesson.unit ? (
            <>
              <span aria-hidden="true">·</span>
              <b>{lesson.competencyTitle || lesson.module || lesson.unit}</b>
            </>
          ) : null}
        </p>
        <h1 className="lesson-title">{lesson.title}</h1>
        {lesson.learningObjective ? <p className="lesson-lead">{lesson.learningObjective}</p> : null}
        <dl className="lesson-facts">
          {lesson.level ? (
            <div>
              <dt>Level</dt>
              <dd>SLP {lesson.level}</dd>
            </div>
          ) : null}
          {lesson.estimatedMinutes ? (
            <div>
              <dt>Time</dt>
              <dd className="p-num">{lesson.estimatedMinutes} min</dd>
            </div>
          ) : null}
          {lesson.difficulty ? (
            <div>
              <dt>Difficulty</dt>
              <dd>{lesson.difficulty}</dd>
            </div>
          ) : null}
        </dl>
        {practiceHref ? (
          <div className="lesson-cta">
            <Link className="btn btn-primary btn-hero" href={practiceHref}>
              {ctaLabel}
              <span className="p-arrow" aria-hidden="true">→</span>
            </Link>
          </div>
        ) : null}
      </header>

      {lesson.conceptExplanation ? (
        <section className="lesson-block is-primary" data-reveal>
          <p className="lesson-block-label">What to learn</p>
          <p>{lesson.conceptExplanation}</p>
        </section>
      ) : null}

      {lesson.strategy ? (
        <section className="lesson-block" data-reveal>
          <p className="lesson-block-label">Technique</p>
          <p>{lesson.strategy}</p>
        </section>
      ) : null}

      {lesson.commonMisconception ? (
        <section className="lesson-block" data-reveal>
          <p className="lesson-block-label">Watch for</p>
          <ul className="lesson-watch">
            <li>{lesson.commonMisconception}</li>
          </ul>
        </section>
      ) : null}

      {lesson.successCriteria.length ? (
        <section className="lesson-block" data-reveal>
          <p className="lesson-block-label">How you&rsquo;ll know it worked</p>
          <ul className="lesson-checklist">
            {lesson.successCriteria.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {lesson.reflectionQuestions.length ? (
        <section className="lesson-block" data-reveal>
          <p className="lesson-block-label">Reflect</p>
          <ul className="lesson-reflect">
            {lesson.reflectionQuestions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {practiceHref ? (
        <section className="lesson-done" data-reveal>
          <p className="lesson-done-mark">End of this lesson</p>
          <h2>Apply it before it fades</h2>
          <p>Reading this changes nothing on its own — the evidence only moves once you practise.</p>
          <div className="lesson-done-actions">
            <Link className="btn btn-primary" href={practiceHref}>
              {ctaLabel}
              <span className="p-arrow" aria-hidden="true">→</span>
            </Link>
            <Link className="btn btn-outline" href={`/${key}/academy`}>
              Back to Academy
            </Link>
          </div>
        </section>
      ) : null}

      {/*
        FASE ACADEMY-LOOP-CLOSURE-001 — the completion signal, placed after the
        last content block so it can only be reached by scrolling past the
        lesson. It records "reached the end of the lesson content", which is the
        strongest honest claim this page can make; see AcademyCompletionBeacon
        for why it is not fired on mount.

        `lesson:` prefixed to match the iOS client's AcademyActivityID, so the
        same lesson read on either client is the same activity row rather than
        two.
      */}
      <AcademyCompletionBeacon skill={key} activityId={`lesson:${lesson.id}`} />
    </div>
  );
}

/**
 * The four/five coverage counts are real (mastered/emerging/weak/untested,
 * optionally blocked) but rendering them as plain text gave the curriculum
 * no sense of shape — a learner could not see at a glance whether they were
 * mostly sustained or mostly untested. The bar is a proportion of the same
 * numbers already printed below it, not a new metric.
 */
export function CoverageBar({ segments }: { segments: Array<{ label: string; value: number; tone: "ok" | "accent" | "warn" | "muted" }> }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  return (
    <div className="coverage-bar-wrap">
      <div className="coverage-bar" role="img" aria-label={segments.map((s) => `${s.label} ${s.value}`).join(", ")}>
        {segments.map((s) =>
          s.value > 0 ? (
            <span
              key={s.label}
              className={`coverage-seg tone-${s.tone}`}
              style={{ flexGrow: s.value, flexBasis: 0 }}
            />
          ) : null
        )}
        {total === 0 ? <span className="coverage-seg tone-muted" style={{ flexGrow: 1, flexBasis: 0 }} /> : null}
      </div>
      <p className="coverage-row">
        {segments.map((s) => (
          <span key={s.label}>
            {s.label} {s.value}
          </span>
        ))}
      </p>
    </div>
  );
}

/**
 * An Academy route with nothing to render.
 *
 * THE PROBLEM THIS HAD. One component served two different facts. Nine call
 * sites used it for "the Academy is unavailable right now" — an OUTAGE — and
 * five for "no such lesson" / "that topic is not in the catalog" — a bad URL.
 * A learner could not tell a broken backend from a stale bookmark, and neither
 * case offered a way out: no retry, no link back, just a heading and a grey
 * line.
 *
 * `kind` now separates them, and every instance gets a route back. It renders
 * through ProductState's page scope, so an Academy failure and an Intelligence
 * failure finally look like the same product.
 */
export function EmptyAcademy({
  title,
  body,
  kind = "empty",
  backHref,
  backLabel,
}: {
  title: string;
  body: string;
  kind?: "empty" | "error" | "locked";
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <section className="exercise">
      <ProductState
        kind={kind}
        scope="page"
        title={title}
        body={body}
        detail={
          kind === "error"
            ? "Nothing about your record has changed. Try again in a moment."
            : kind === "locked"
              ? "Open your plan to see what changes."
              : undefined
        }
        actions={
          backHref ? [{ kind: "link", label: backLabel ?? "Back", href: backHref }] : undefined
        }
      />
    </section>
  );
}
