import Link from "next/link";
import { asString, isRecord } from "@/lib/api/decode";
import { EmptyAcademy } from "@/components/academy/AcademyLessonView";
import { LISTENING_ACADEMY_CATEGORIES, isListeningTopicLocked, topicsFor } from "@/lib/listening/academyCatalog";
import { backendJson } from "@/lib/server/backend";
import { loadEntitlements } from "@/lib/server/home";
import { loadAcademyTargetLevel } from "@/lib/server/targetLevel";

export default async function ListeningAcademyPage() {
  const [targetLevel, entitlements] = await Promise.all([loadAcademyTargetLevel(), loadEntitlements()]);
  const isPro = entitlements.status === "ready" && entitlements.isPro;
  const result = await backendJson<Record<string, unknown>>({
    path: "/api/listening/academy/home",
    search: `?targetLevel=${targetLevel}`,
    cache: "no-store",
  });
  const data = result.status < 400 && result.data ? result.data : {};
  const decision = isRecord(data.decision) ? data.decision : {};
  const reason = isRecord(decision.reason) ? decision.reason : {};
  const counts = isRecord(data.counts) ? data.counts : {};
  const nextStep = asString(decision.nextStep);
  const practiceHref =
    nextStep === "exam"
      ? "/listening/exam"
      : `/listening/practice${asString(isRecord(decision.target) ? decision.target.key : "") ? `?focusSkill=${encodeURIComponent(asString(isRecord(decision.target) ? decision.target.key : ""))}` : ""}`;

  return (
    <section className="exercise page-skill skill-listening">
      <header className="page-head">
        <p className="section-eyebrow">Listening Academy</p>
        <h1>{asString(reason.headline, "Listening Academy")}</h1>
        <p className="muted">{asString(reason.detail, "Cloud standing plus the iOS catalog. A 200 does not unlock every topic.")}</p>
      </header>
      {result.status >= 400 ? <EmptyAcademy title="Cloud standing" body="Cloud Academy standing is unavailable. The local catalog below still follows the free-set rule." /> : null}
      <article className="academy-now">
        <p className="home-kicker">Coverage</p>
        <p className="coverage-row">
          <span>Sustained {asString(counts.mastered, "0")}</span>
          <span>Developing {asString(counts.emerging, "0")}</span>
          <span>Needs work {asString(counts.weak, "0")}</span>
          <span>Not asked {asString(counts.untested, "0")}</span>
          <span>Waiting {asString(counts.blocked, "0")}</span>
        </p>
        <Link className="btn btn-primary" href={practiceHref}>
          {nextStep === "exam" ? "Take the exam" : nextStep === "prerequisite" ? "Train the prerequisite" : decision.hasEvidence ? "Start training" : "Record a baseline"}
        </Link>
      </article>
      {LISTENING_ACADEMY_CATEGORIES.map((category) => (
        <article key={category.key} className="academy-unit">
          <h2>{category.label}</h2>
          <ul className="academy-path">
            {topicsFor(category.key).map((topic) => {
              const locked = isListeningTopicLocked(topic.id, isPro);
              return (
                <li key={topic.id} className={locked ? "is-locked" : ""}>
                  {locked ? (
                    <span>
                      {topic.title} <span className="muted">Pro</span>
                    </span>
                  ) : (
                    <Link href={`/listening/academy/topic/${topic.id}`}>{topic.title}</Link>
                  )}
                </li>
              );
            })}
          </ul>
        </article>
      ))}
      <p>
        <Link href="/listening/academy/map">Competency map</Link>
        {" · "}
        <Link href="/listening/intelligence">Intelligence</Link>
      </p>
    </section>
  );
}
