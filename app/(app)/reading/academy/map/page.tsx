import Link from "next/link";
import { asString, isRecord } from "@/lib/api/decode";
import { stateLabel } from "@/lib/api/academy";
import { EmptyAcademy } from "@/components/academy/AcademyLessonView";
import { backendJson } from "@/lib/server/backend";
import { loadAcademyTargetLevel } from "@/lib/server/targetLevel";

export default async function ReadingAcademyMapPage() {
  const targetLevel = await loadAcademyTargetLevel();
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
  return (
    <section className="exercise">
      <p className="section-eyebrow">Reading Academy</p>
      <h1>Competency map</h1>
      {branches.filter(isRecord).map((branch) => (
        <article key={asString(branch.id, asString(branch.name))} className="home-card">
          <h2>{asString(branch.name, asString(branch.title))}</h2>
          <ul>
            {(Array.isArray(branch.competencies) ? branch.competencies : []).filter(isRecord).map((item) => (
              <li key={asString(item.competencyId, asString(item.id))}>
                {asString(item.name, asString(item.title))} · {stateLabel(asString(item.state))}
                {asString(item.lessonId) ? (
                  <>
                    {" "}
                    <Link href={`/reading/academy/lesson/${encodeURIComponent(asString(item.lessonId))}`}>Lesson</Link>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        </article>
      ))}
      <p>
        <Link href="/reading/academy">Back to Academy</Link>
      </p>
    </section>
  );
}
