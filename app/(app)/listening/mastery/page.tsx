import Link from "next/link";
import { asString, isRecord } from "@/lib/api/decode";
import { IntelligenceError } from "@/components/intelligence/IntelligencePanel";
import { CommercialCard } from "@/components/exercise/ExerciseShell";
import { CoverageBar } from "@/components/academy/AcademyLessonView";
import { RecordState } from "@/components/academy/RecordState";
import { backendJson } from "@/lib/server/backend";

export default async function ListeningMasteryPage() {
  const result = await backendJson<Record<string, unknown>>({
    path: "/api/listening/intelligence/mastery",
    cache: "no-store",
  });
  if (result.status === 403) {
    return (
      <div className="records page-skill skill-listening">
        <header className="records-head" data-enter>
          <p className="p-eyebrow is-skill">Listening Intelligence</p>
          <h1 className="p-hero-title">What is improving</h1>
        </header>
        <div className="records-group">
          <CommercialCard title="Mastery trends are included in SLP Command Pro." />
        </div>
        <p className="records-back">
          <Link href="/listening/intelligence">Back to Listening Intelligence</Link>
        </p>
      </div>
    );
  }
  if (result.status >= 400 || !result.data) {
    return <IntelligenceError message="Mastery data is unavailable right now." />;
  }
  const summary = isRecord(result.data.summary) ? result.data.summary : {};
  const skills = Array.isArray(result.data.skills) ? result.data.skills : [];
  const mastered = Number(asString(summary.mastered, "0")) || 0;
  const developing = Number(asString(summary.developing, "0")) || 0;
  const needsWork = Number(asString(summary.needsWork, "0")) || 0;

  return (
    <div className="records page-skill skill-listening">
      <header className="records-head" data-enter>
        <p className="p-eyebrow is-skill">Listening Intelligence</p>
        <h1 className="p-hero-title">What is improving</h1>
        <p className="p-lead">
          {asString(result.data.message, "Backend mastery standing only. Nothing here is derived in the browser.")}
        </p>
      </header>

      {mastered + developing + needsWork > 0 ? (
        <section className="records-group" data-reveal>
          <h2 className="records-group-title">Where you stand</h2>
          <CoverageBar
            segments={[
              { label: "Sustained", value: mastered, tone: "ok" },
              { label: "Developing", value: developing, tone: "accent" },
              { label: "Needs work", value: needsWork, tone: "warn" },
            ]}
          />
        </section>
      ) : null}

      {skills.length ? (
        <section className="records-group" data-reveal>
          <h2 className="records-group-title">By competency</h2>
          <ul className="records-list">
            {skills.filter(isRecord).map((item) => {
              // Accuracy arrives either as a 0–1 ratio or an already-scaled
              // percentage, and is only shown when the backend says the
              // sample is large enough to report.
              const raw = Number(item.accuracy);
              const showAccuracy = item.reportable === true && Number.isFinite(raw);
              const pct = showAccuracy ? Math.round(raw * (raw <= 1 ? 100 : 1)) : null;
              const trend = asString(item.trend);
              return (
                <li className="records-row" key={asString(item.key)}>
                  <div className="records-row-main">
                    <strong>{asString(item.label, asString(item.key))}</strong>
                    <p className="records-meta">
                      <RecordState state={asString(item.status)} />
                      {pct != null ? <span className="p-num">{pct}% accurate</span> : null}
                      {trend ? <span>{trend}</span> : null}
                      {item.reportable === false ? <span>too few attempts to report</span> : null}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <p className="records-back">
        <Link href="/listening/intelligence">Back to Listening Intelligence</Link>
      </p>
    </div>
  );
}
