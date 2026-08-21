import Link from "next/link";
import { asString, isRecord } from "@/lib/api/decode";
import { EmptyAcademy } from "@/components/academy/AcademyLessonView";
import { RecordState } from "@/components/academy/RecordState";
import { backendJson } from "@/lib/server/backend";
import { loadTargetLevel } from "@/lib/server/targetLevel";

export default async function ListeningAcademyMapPage() {
  const targetLevel = await loadTargetLevel();
  if (!targetLevel) {
    return <EmptyAcademy title="Listening map" body="Your target level isn't available right now." />;
  }
  const result = await backendJson<Record<string, unknown>>({
    path: "/api/listening/academy/map",
    search: `?targetLevel=${targetLevel}`,
    cache: "no-store",
  });
  if (result.status >= 400 || !result.data) {
    return <EmptyAcademy title="Listening map" body="The competency map is unavailable right now." />;
  }
  const skills = Array.isArray(result.data.skills) ? result.data.skills : [];

  return (
    <div className="records page-skill skill-listening">
      <header className="records-head" data-enter>
        <p className="p-eyebrow is-skill">Listening Academy</p>
        <h1 className="p-hero-title">Competency map</h1>
        <p className="p-lead">
          {skills.length > 0
            ? "Every listening competency the backend tracks, and where each one currently stands."
            : "No competencies are being tracked for your target level yet."}
        </p>
      </header>

      {skills.length ? (
        <section className="records-group" data-reveal>
          <ul className="records-list">
            {skills.filter(isRecord).map((skill) => {
              const key = asString(skill.key);
              return (
                <li className="records-row" key={key}>
                  <div className="records-row-main">
                    <strong>{asString(skill.label, key)}</strong>
                    <p className="records-meta">
                      <RecordState state={asString(skill.state)} />
                    </p>
                  </div>
                  <Link className="records-row-go" href={`/listening/academy/skill/${encodeURIComponent(key)}`}>
                    Open competency
                    <span className="p-arrow" aria-hidden="true">→</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <p className="records-back">
        <Link href="/listening/academy">Back to Listening Academy</Link>
      </p>
    </div>
  );
}
