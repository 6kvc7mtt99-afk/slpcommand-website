import Link from "next/link";
import { asString, isRecord } from "@/lib/api/decode";
import { EmptyAcademy } from "@/components/academy/AcademyLessonView";
import { RecordState } from "@/components/academy/RecordState";
import { backendJson } from "@/lib/server/backend";
import { loadTargetLevel } from "@/lib/server/targetLevel";

export default async function ReadingAcademyMapPage() {
  const targetLevel = await loadTargetLevel();
  if (!targetLevel) {
    return <EmptyAcademy title="Reading map" body="Your target level isn't available right now." />;
  }
  const result = await backendJson<Record<string, unknown>>({
    method: "POST",
    path: "/api/reading/academy/map",
    body: JSON.stringify({ targetLevel }),
    contentType: "application/json",
    cache: "no-store",
  });
  if (result.status >= 400 || !result.data) {
    return <EmptyAcademy title="Reading map" body="The competency map is unavailable right now." />;
  }
  const branches = Array.isArray(result.data.branches) ? result.data.branches : [];
  const total = branches
    .filter(isRecord)
    .reduce((n, b) => n + (Array.isArray(b.competencies) ? b.competencies.length : 0), 0);

  return (
    <div className="records page-skill skill-reading">
      <header className="records-head" data-enter>
        <p className="p-eyebrow is-skill">Reading Academy</p>
        <h1 className="p-hero-title">Competency map</h1>
        <p className="p-lead">
          {total > 0
            ? `Every reading competency the backend tracks, and where each one currently stands.`
            : "No competencies are being tracked for your target level yet."}
        </p>
      </header>

      {branches.filter(isRecord).map((branch) => {
        const items = (Array.isArray(branch.competencies) ? branch.competencies : []).filter(isRecord);
        if (!items.length) return null;
        return (
          <section className="records-group" key={asString(branch.id, asString(branch.name))} data-reveal>
            <h2 className="records-group-title">{asString(branch.name, asString(branch.title))}</h2>
            <ul className="records-list">
              {items.map((item) => {
                const lessonId = asString(item.lessonId);
                const name = asString(item.name, asString(item.title));
                return (
                  <li className="records-row" key={asString(item.competencyId, asString(item.id, name))}>
                    <div className="records-row-main">
                      <strong>{name}</strong>
                      <p className="records-meta">
                        <RecordState state={asString(item.state)} />
                      </p>
                    </div>
                    {lessonId ? (
                      <Link className="records-row-go" href={`/reading/academy/lesson/${encodeURIComponent(lessonId)}`}>
                        Open the class
                        <span className="p-arrow" aria-hidden="true">→</span>
                      </Link>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <p className="records-back">
        <Link href="/reading/academy">Back to Reading Academy</Link>
      </p>
    </div>
  );
}
