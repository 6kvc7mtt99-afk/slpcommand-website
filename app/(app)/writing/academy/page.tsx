import Link from "next/link";
import { asString, isRecord } from "@/lib/api/decode";
import { EmptyAcademy } from "@/components/academy/AcademyLessonView";
import { backendJson } from "@/lib/server/backend";
import { loadAcademyTargetLevel } from "@/lib/server/targetLevel";

export default async function WritingAcademyPage() {
  const targetLevel = await loadAcademyTargetLevel();
  const result = await backendJson<Record<string, unknown>>({
    method: "POST",
    path: "/api/writing/academy/home",
    body: JSON.stringify({ targetLevel, sessionPhase: "start" }),
    contentType: "application/json",
    cache: "no-store",
  });
  if (result.status >= 400 || !result.data) {
    return <EmptyAcademy title="Writing Academy" body="The Academy is unavailable right now." />;
  }
  const data = result.data;
  const coach = isRecord(data.coach) ? data.coach : {};
  const focus = isRecord(data.todaysFocus) ? data.todaysFocus : {};
  const lesson = isRecord(data.lesson) ? data.lesson : {};
  const readiness = isRecord(data.readiness) ? data.readiness : {};
  const sessions = Array.isArray(data.sessions) ? data.sessions : [];
  const lessonId = asString(lesson.id, asString(isRecord(lesson.lesson) ? lesson.lesson.id : ""));

  return (
    <section className="exercise page-skill skill-writing">
      <header className="page-head">
        <p className="section-eyebrow">Writing Academy</p>
        <h1>{asString(focus.title, asString(coach.headline, "Writing Academy"))}</h1>
        <p>{asString(coach.detail, asString(focus.reasons ? "" : "The backend composed today’s materials."))}</p>
      </header>
      {lessonId ? (
        <article className="academy-now">
          <p className="home-kicker">Today’s class</p>
          <h2>{asString(lesson.title, asString(isRecord(lesson.lesson) ? lesson.lesson.title : "Lesson"))}</h2>
          <p className="muted">{asString(lesson.reason)}</p>
          <Link className="btn btn-primary" href={`/writing/academy/lesson/${encodeURIComponent(lessonId)}`}>
            Open the class
          </Link>
        </article>
      ) : null}
      <article className="home-card">
        <p className="home-kicker">Coverage</p>
        <p className="coverage-row">
          <span>Sustained {asString(readiness.mastered, "0")}</span>
          <span>Developing {asString(readiness.emerging, "0")}</span>
          <span>Needs work {asString(readiness.weak, "0")}</span>
          <span>Not asked {asString(readiness.untested, "0")}</span>
        </p>
      </article>
      {sessions.filter(isRecord).map((session) => (
        <article key={asString(session.id, asString(session.title))} className="academy-unit">
          <h2>{asString(session.title)}</h2>
          <p className="muted">
            {asString(session.subtitle)} {session.minutes != null ? `· ${asString(session.minutes)} min` : ""}
          </p>
        </article>
      ))}
      <p>
        <Link href="/writing/academy/search">Library search</Link>
        {" · "}
        <Link href="/writing/tools">Writing Tools</Link>
        {" · "}
        <Link href="/writing/practice">Practice</Link>
      </p>
    </section>
  );
}
