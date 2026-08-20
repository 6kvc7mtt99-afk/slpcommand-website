import Link from "next/link";
import { EmptyAcademy } from "@/components/academy/AcademyLessonView";
import { decodeWritingCatalog, decodeWritingModuleTitles } from "@/lib/api/writing";
import { backendJson } from "@/lib/server/backend";

/**
 * The writing competency map — Reading and Listening have had one since
 * Phase 4; Writing never did, not because the data doesn't exist but
 * because `/api/writing/academy/lessons` was never wired into web. It
 * returns the real 49-lesson catalog with each lesson's real
 * `competencyId` (`W3.6`, …) — the same ids Writing Intelligence's
 * blocking-competency list already links through.
 */
export default async function WritingAcademyMapPage() {
  const result = await backendJson<unknown>({ path: "/api/writing/academy/lessons", cache: "no-store" });
  if (result.status >= 400 || !result.data) {
    return <EmptyAcademy title="Writing map" body="The competency map is unavailable right now." />;
  }
  const lessons = decodeWritingCatalog(result.data);
  if (!lessons.length) {
    return <EmptyAcademy title="Writing map" body="The competency map is unavailable right now." />;
  }
  const moduleTitles = decodeWritingModuleTitles(result.data);

  const modules = new Map<string, typeof lessons>();
  for (const lesson of lessons) {
    const key = lesson.module || "general";
    const list = modules.get(key) ?? [];
    list.push(lesson);
    modules.set(key, list);
  }

  return (
    <div className="records page-skill skill-writing">
      <header className="records-head" data-enter>
        <p className="p-eyebrow is-skill">Writing Academy</p>
        <h1 className="p-hero-title">Competency map</h1>
        <p className="p-lead">Every writing class in the curriculum, grouped by module — {lessons.length} in total.</p>
      </header>

      {[...modules.entries()].map(([moduleKey, items]) => (
        <section className="records-group" key={moduleKey} data-reveal>
          <h2 className="records-group-title">{moduleTitles.get(moduleKey) || moduleKey.replace(/_/g, " ")}</h2>
          <ul className="records-list">
            {items.map((lesson) => (
              <li className="records-row" key={lesson.id}>
                <div className="records-row-main">
                  <strong>
                    <Link href={`/writing/academy/lesson/${encodeURIComponent(lesson.id)}`}>{lesson.title}</Link>
                  </strong>
                  <p className="records-meta">
                    {lesson.level ? <span>SLP {lesson.level}</span> : null}
                    {lesson.estimatedMinutes ? <span>{lesson.estimatedMinutes} min</span> : null}
                  </p>
                </div>
                <Link className="records-row-go" href={`/writing/academy/lesson/${encodeURIComponent(lesson.id)}`}>
                  Open the class
                  <span className="p-arrow" aria-hidden="true">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <p className="records-back">
        <Link href="/writing/academy">Back to Writing Academy</Link>
      </p>
    </div>
  );
}
