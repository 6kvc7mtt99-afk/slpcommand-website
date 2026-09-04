import { IntelligenceBriefing } from "@/components/intelligence/Briefing";
import { IntelligenceError } from "@/components/intelligence/IntelligencePanel";
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
  if (readiness.status >= 500) return <IntelligenceError message="Listening Intelligence could not be loaded just now." backHref="/listening" backLabel="Back to Listening" />;
  const locked = missions.status === 403;

  return (
    <IntelligenceBriefing
      skill="Listening"
      card={decodeReadiness(readiness.data)}
      weaknesses={decodeWeaknesses(weakness.data)}
      missions={locked ? [] : decodeMissions(missions.data)}
      missionsLocked={locked}
      readinessFailed={readiness.status >= 400}
      weaknessHref={(item) => {
        const topic = topicForSkillOrSubSkill(item.key);
        if (!topic || isListeningTopicLocked(topic.id, isPro)) return "/listening/academy";
        const why = [
          item.accuracy != null ? `${Math.round(item.accuracy)}% accurate` : null,
          item.attempts > 0 ? `${item.attempts} ${item.attempts === 1 ? "attempt" : "attempts"}` : null,
        ]
          .filter(Boolean)
          .join(" · ");
        return `/listening/academy/topic/${topic.id}${why ? `?why=${encodeURIComponent(why)}` : ""}`;
      }}
      missionHref={(mission) =>
        mission.targetSkill
          ? `/listening/practice?focusSkill=${encodeURIComponent(mission.targetSkill)}`
          : "/listening/practice"
      }
      masteryHref="/listening/mastery"
      academyHref="/listening/academy"
      practiceHref="/listening/practice"
    />
  );
}
