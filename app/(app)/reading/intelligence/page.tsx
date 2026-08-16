import Link from "next/link";
import { IntelligenceError, MissionsSection, ReadinessCardView } from "@/components/intelligence/IntelligencePanel";
import { decodeMissions, decodeReadiness } from "@/lib/api/intelligence";
import { backendJson } from "@/lib/server/backend";

export default async function ReadingIntelligencePage() {
  const [readiness, missions] = await Promise.all([
    backendJson<unknown>({ path: "/api/reading/intelligence/readiness", cache: "no-store" }),
    backendJson<unknown>({ path: "/api/reading/intelligence/missions", cache: "no-store" }),
  ]);
  if (readiness.status >= 500) {
    return <IntelligenceError message="Intelligence is unavailable right now." />;
  }
  const card = decodeReadiness(readiness.data);
  const locked = missions.status === 403;
  const items = locked ? [] : decodeMissions(missions.data);

  return (
    <section className="exercise page-skill skill-reading">
      <header className="page-head">
        <p className="section-eyebrow">Reading Intelligence</p>
        <h1>Reading Intelligence</h1>
      </header>
      <div className="intel-layout">
        <div>
          {readiness.status >= 400 ? <IntelligenceError message="Readiness could not be loaded." /> : <ReadinessCardView card={card} />}
        </div>
        <div>
          <MissionsSection missions={items} locked={locked} hrefFor={() => "/reading/academy"} />
          <article className="home-card">
            <p className="home-kicker">What should I do next</p>
            <p>The Academy decides the next class from the same evidence. This screen does not invent a second plan.</p>
            <Link className="btn btn-primary" href="/reading/academy">
              Open Reading Academy
            </Link>
          </article>
        </div>
      </div>
    </section>
  );
}
