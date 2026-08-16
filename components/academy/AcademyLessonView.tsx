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

export function EmptyAcademy({ title, body }: { title: string; body: string }) {
  return (
    <section className="exercise">
      <h1>{title}</h1>
      <p className="muted">{body}</p>
    </section>
  );
}
