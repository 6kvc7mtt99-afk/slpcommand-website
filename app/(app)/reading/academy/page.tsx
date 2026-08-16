import Link from "next/link";
import { asString, isRecord } from "@/lib/api/decode";
import { stateLabel } from "@/lib/api/academy";
import { EmptyAcademy } from "@/components/academy/AcademyLessonView";
import { backendJson } from "@/lib/server/backend";
import { loadAcademyTargetLevel } from "@/lib/server/targetLevel";

export default async function ReadingAcademyPage() {
  const targetLevel = await loadAcademyTargetLevel();
  const result = await backendJson<Record<string, unknown>>({
    method: "POST",
    path: "/api/reading/academy/home",
    body: JSON.stringify({ targetLevel }),
    contentType: "application/json",
    cache: "no-store",
  });
  if (result.status >= 400 || !result.data) {
    return <EmptyAcademy title="Reading Academy" body="The Academy is unavailable right now. Nothing was invented locally." />;
  }
  const data = result.data;
  const focus = isRecord(data.focus) ? data.focus : {};
  const reason = isRecord(focus.reason) ? focus.reason : {};
  const lesson = isRecord(focus.lesson) ? focus.lesson : {};
  const state = isRecord(data.state) ? data.state : {};
  const summary = isRecord(state.summary) ? state.summary : {};
  const curriculum = Array.isArray(data.curriculum) ? data.curriculum : [];

  return (
    <section className="exercise page-skill skill-reading">
      <header className="page-head">
        <p className="section-eyebrow">Reading Academy</p>
        <h1>{asString(reason.headline, "Start here")}</h1>
        <p className="muted">{asString(reason.detail, "The backend chose this next class from your evidence.")}</p>
      </header>
      {asString(lesson.id) ? (
        <article className="academy-now">
          <p className="home-kicker">Today</p>
          <h2>{asString(lesson.title)}</h2>
          <p className="muted">{asString(lesson.learningObjective)}</p>
          <Link className="btn btn-primary" href={`/reading/academy/lesson/${encodeURIComponent(asString(lesson.id))}`}>
            Open the class
          </Link>
        </article>
      ) : null}
      <article className="home-card">
        <p className="home-kicker">Coverage</p>
        <p className="coverage-row">
          <span>Sustained {asString(summary.mastered, "0")}</span>
          <span>Developing {asString(summary.emerging, "0")}</span>
          <span>Needs work {asString(summary.weak, "0")}</span>
          <span>Not asked {asString(summary.untested, "0")}</span>
          <span>Waiting {asString(summary.blocked, "0")}</span>
        </p>
      </article>
      {curriculum.map((unit) => {
        const rec = isRecord(unit) ? unit : {};
        const lessons = Array.isArray(rec.lessons) ? rec.lessons : [];
        return (
          <article key={asString(rec.id, asString(rec.title))} className="academy-unit">
            <h2>{asString(rec.title)}</h2>
            <ul className="academy-path">
              {lessons.filter(isRecord).map((item) => (
                <li key={asString(item.id)}>
                  <Link href={`/reading/academy/lesson/${encodeURIComponent(asString(item.id))}`}>{asString(item.title)}</Link>
                </li>
              ))}
            </ul>
          </article>
        );
      })}
      <p>
        <Link href="/reading/academy/map">Competency map</Link>
        {" · "}
        <Link href="/reading/practice">Practice</Link>
      </p>
      <span className="muted">{stateLabel("mastered")}</span>
    </section>
  );
}
