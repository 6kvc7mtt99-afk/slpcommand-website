import Link from "next/link";
import { IntelligenceError, MissionsSection, ReadinessCardView, WeaknessSection } from "@/components/intelligence/IntelligencePanel";
import { decodeMissions, decodeReadiness, decodeWeaknesses } from "@/lib/api/intelligence";
import { isListeningTopicLocked, topicForSkillOrSubSkill } from "@/lib/listening/academyCatalog";
import { backendJson } from "@/lib/server/backend";
import { loadEntitlements } from "@/lib/server/home";

export default async function ListeningIntelligencePage() {
  const entitlements = await loadEntitlements();
  const isPro = entitlements.status === "ready" && entitlements.isPro;
  const [readiness, weakness, missions] = await Promise.all([
    backendJson<unknown>({ path: "/api/listening/intelligence/readiness", cache: "no-store" }),
    backendJson<unknown>({ path: "/api/listening/intelligence/weakness-profile", cache: "no-store" }),
    backendJson<unknown>({ path: "/api/listening/intelligence/missions", cache: "no-store" }),
  ]);
  if (readiness.status >= 500) return <IntelligenceError message="Intelligence is unavailable right now." />;
  const card = decodeReadiness(readiness.data);
  const weaknesses = decodeWeaknesses(weakness.data);
  const locked = missions.status === 403;

  return (
    <section className="exercise page-skill skill-listening">
      <header className="page-head">
        <p className="section-eyebrow">Listening Intelligence</p>
        <h1>Listening Intelligence</h1>
      </header>
      <div className="intel-layout">
        <div>
          {readiness.status >= 400 ? <IntelligenceError message="Readiness could not be loaded." /> : <ReadinessCardView card={card} />}
          <WeaknessSection
        items={weaknesses}
        hrefFor={(item) => {
          const topic = topicForSkillOrSubSkill(item.key);
          if (!topic) return "/listening/academy";
          if (isListeningTopicLocked(topic.id, isPro)) return "/listening/academy";
          return `/listening/academy/topic/${topic.id}`;
        }}
      />
        </div>
        <div>
      <MissionsSection
        missions={locked ? [] : decodeMissions(missions.data)}
        locked={locked}
        hrefFor={(mission) =>
          mission.targetSkill
            ? `/listening/practice?focusSkill=${encodeURIComponent(mission.targetSkill)}`
            : "/listening/practice"
        }
      />
      <p>
        <Link href="/listening/mastery">Mastery</Link>
        {" · "}
        <Link href="/listening/academy">Academy</Link>
      </p>
        </div>
      </div>
    </section>
  );
}
