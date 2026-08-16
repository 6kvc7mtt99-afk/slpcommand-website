import Link from "next/link";
import { asString, isRecord } from "@/lib/api/decode";
import { stateLabel } from "@/lib/api/academy";
import { EmptyAcademy } from "@/components/academy/AcademyLessonView";
import { backendJson } from "@/lib/server/backend";
import { loadAcademyTargetLevel } from "@/lib/server/targetLevel";

export default async function ListeningAcademyMapPage() {
  const targetLevel = await loadAcademyTargetLevel();
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
    <section className="exercise">
      <p className="section-eyebrow">Listening Academy</p>
      <h1>Competency map</h1>
      <ul className="home-blocks">
        {skills.filter(isRecord).map((skill) => (
          <li key={asString(skill.key)}>
            <Link href={`/listening/academy/skill/${encodeURIComponent(asString(skill.key))}`}>
              {asString(skill.label, asString(skill.key))}
            </Link>
            {" · "}
            {stateLabel(asString(skill.state))}
          </li>
        ))}
      </ul>
      <p>
        <Link href="/listening/academy">Back to Academy</Link>
      </p>
    </section>
  );
}
