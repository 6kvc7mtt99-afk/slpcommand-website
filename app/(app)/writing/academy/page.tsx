import Link from "next/link";
import { asString, isRecord } from "@/lib/api/decode";
import { CoverageBar, EmptyAcademy } from "@/components/academy/AcademyLessonView";
import { PriorityAction } from "@/components/training/PriorityAction";
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
  const lessonTitle = asString(lesson.title, asString(isRecord(lesson.lesson) ? lesson.lesson.title : "Lesson"));
  // `focus.reasons` was fetched but never rendered anywhere in the previous
  // version of this page. Its shape isn't documented, so this reads it the
  // same defensive way `sessions` already is below: render it if it turns
  // out to be a real string list, render nothing if it isn't.
  const reasons = Array.isArray(focus.reasons) ? focus.reasons.map((r) => asString(r)).filter(Boolean) : [];

  const weakN = Number(asString(readiness.weak, "0")) || 0;
  const untestedN = Number(asString(readiness.untested, "0")) || 0;
  const evidenceLine = [
    weakN > 0 ? `${weakN} ${weakN === 1 ? "task needs" : "tasks need"} work` : null,
    untestedN > 0 ? `${untestedN} untested` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="academy page-skill skill-writing">
      <header className="academy-masthead" data-enter>
        <p className="p-eyebrow is-skill">Writing Academy</p>
        <h1 className="p-hero-title">{asString(coach.headline, asString(focus.title, "Writing Academy"))}</h1>
        <p className="p-lead">{asString(coach.detail, "The backend composed today’s materials from your submissions.")}</p>
      </header>

      {lessonId ? (
        <PriorityAction
          eyebrow="Today’s class"
          title={lessonTitle}
          detail={asString(lesson.reason) || undefined}
          evidence={evidenceLine || undefined}
          href={`/writing/academy/lesson/${encodeURIComponent(lessonId)}${evidenceLine ? `?why=${encodeURIComponent(evidenceLine)}` : ""}`}
          ctaLabel="Open today’s class"
          secondaryHref="/writing/practice"
          secondaryLabel="Straight to practice"
        />
      ) : null}

      {reasons.length ? (
        <section className="p-section" data-reveal>
          <p className="p-eyebrow">Why this class</p>
          <ul className="academy-reasons">
            {reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="p-section" data-reveal>
        <p className="p-eyebrow">Where you stand</p>
        <CoverageBar
          segments={[
            { label: "Sustained", value: Number(asString(readiness.mastered, "0")) || 0, tone: "ok" },
            { label: "Developing", value: Number(asString(readiness.emerging, "0")) || 0, tone: "accent" },
            { label: "Needs work", value: weakN, tone: "warn" },
            { label: "Not asked", value: untestedN, tone: "muted" },
          ]}
        />
      </section>

      {sessions.filter(isRecord).length ? (
        <section className="p-section" aria-label="Today's writing plan">
          <div className="p-section-head" data-reveal>
            <div>
              <h2>Today’s plan</h2>
              <p>The Academy sequenced these for today’s submission, in order.</p>
            </div>
          </div>
          <ol className="academy-sessions">
            {sessions.filter(isRecord).map((session, i) => (
              <li key={asString(session.id, asString(session.title))} style={{ ["--i" as string]: i }}>
                <span className="academy-session-no p-num">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <strong>{asString(session.title)}</strong>
                  {asString(session.subtitle) ? <p>{asString(session.subtitle)}</p> : null}
                </div>
                {session.minutes != null ? <span className="academy-session-min p-num">{asString(session.minutes)} min</span> : null}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <p className="academy-links">
        <Link href="/writing/academy/search">Search the library</Link>
        {" · "}
        <Link href="/writing/tools">Writing tools</Link>
      </p>
    </div>
  );
}
