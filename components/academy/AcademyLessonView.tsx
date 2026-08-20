import Link from "next/link";
import type { AcademyLesson } from "@/lib/api/academy";

export function AcademyLessonView({
  skill,
  lesson,
  practiceHref,
}: {
  skill: string;
  lesson: AcademyLesson;
  practiceHref?: string;
}) {
  return (
    <section className={`exercise page-skill skill-${skill.trim().toLowerCase()}`}>
      <p className="section-eyebrow">{skill} Academy</p>
      <p className="home-kicker">{lesson.module || lesson.unit || "Lesson"}</p>
      <h1>{lesson.title}</h1>
      {lesson.learningObjective ? <p>{lesson.learningObjective}</p> : null}
      {lesson.estimatedMinutes ? <p className="muted">{lesson.estimatedMinutes} minutes · {lesson.difficulty || "standard"}</p> : null}
      {lesson.conceptExplanation ? (
        <article className="home-card">
          <p className="home-kicker">Concept</p>
          <p>{lesson.conceptExplanation}</p>
        </article>
      ) : null}
      {lesson.strategy ? (
        <article className="home-card">
          <p className="home-kicker">Strategy</p>
          <p>{lesson.strategy}</p>
        </article>
      ) : null}
      {lesson.commonMisconception ? (
        <article className="home-card">
          <p className="home-kicker">Common misconception</p>
          <p>{lesson.commonMisconception}</p>
        </article>
      ) : null}
      {lesson.successCriteria.length ? (
        <article className="home-card">
          <p className="home-kicker">Success criteria</p>
          <ul>
            {lesson.successCriteria.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      ) : null}
      {lesson.reflectionQuestions.length ? (
        <article className="home-card">
          <p className="home-kicker">Reflection</p>
          <ul>
            {lesson.reflectionQuestions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      ) : null}
      {practiceHref ? (
        <p>
          <Link className="btn btn-primary" href={practiceHref}>
            Practise this
          </Link>
        </p>
      ) : null}
    </section>
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

export function EmptyAcademy({ title, body }: { title: string; body: string }) {
  return (
    <section className="exercise">
      <h1>{title}</h1>
      <div className="state-empty">
        <p className="muted">{body}</p>
      </div>
    </section>
  );
}
