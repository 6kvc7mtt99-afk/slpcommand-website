import Link from "next/link";
import { asString, isRecord } from "@/lib/api/decode";
import { IntelligenceError } from "@/components/intelligence/IntelligencePanel";
import { CommercialCard } from "@/components/exercise/ExerciseShell";
import { backendJson } from "@/lib/server/backend";

export default async function ListeningMasteryPage() {
  const result = await backendJson<Record<string, unknown>>({
    path: "/api/listening/intelligence/mastery",
    cache: "no-store",
  });
  if (result.status === 403) {
    return (
      <section className="exercise">
        <h1>Listening mastery</h1>
        <CommercialCard title="Mastery trends are included in SLP Command Pro." />
      </section>
    );
  }
  if (result.status >= 400 || !result.data) {
    return <IntelligenceError message="Mastery data is unavailable right now." />;
  }
  const summary = isRecord(result.data.summary) ? result.data.summary : {};
  const skills = Array.isArray(result.data.skills) ? result.data.skills : [];
  return (
    <section className="exercise">
      <p className="section-eyebrow">Listening Intelligence</p>
      <h1>What is improving</h1>
      <p className="muted">{asString(result.data.message, "Backend mastery standing only. Nothing is derived in the browser.")}</p>
      <article className="home-card">
        <p>
          Mastered {asString(summary.mastered, "0")} · Developing {asString(summary.developing, "0")} · Needs work {asString(summary.needsWork, "0")}
        </p>
      </article>
      <ul className="home-blocks">
        {skills.filter(isRecord).map((item) => (
          <li key={asString(item.key)}>
            <strong>{asString(item.label, asString(item.key))}</strong>
            <p className="muted">
              {asString(item.status)}
              {item.reportable === true && item.accuracy != null ? ` · ${Math.round(Number(item.accuracy) * (Number(item.accuracy) <= 1 ? 100 : 1))}%` : ""}
              {asString(item.trend) ? ` · ${asString(item.trend)}` : ""}
            </p>
          </li>
        ))}
      </ul>
      <p>
        <Link href="/listening/intelligence">Back to Intelligence</Link>
      </p>
    </section>
  );
}
