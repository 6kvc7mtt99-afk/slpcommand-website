import { IntelligenceBriefing } from "@/components/intelligence/Briefing";
import { IntelligenceError } from "@/components/intelligence/IntelligencePanel";
import { decodeMissions, decodeReadiness } from "@/lib/api/intelligence";
import { backendJson } from "@/lib/server/backend";

export default async function ReadingIntelligencePage() {
  const [readiness, missions] = await Promise.all([
    backendJson<unknown>({ path: "/api/reading/intelligence/readiness", cache: "no-store" }),
    backendJson<unknown>({ path: "/api/reading/intelligence/missions", cache: "no-store" }),
  ]);
  if (readiness.status >= 500) {
    return <IntelligenceError message="Reading Intelligence could not be loaded just now." backHref="/reading" backLabel="Back to Reading" />;
  }
  const card = decodeReadiness(readiness.data);
  const locked = missions.status === 403;

  return (
    <IntelligenceBriefing
      skill="Reading"
      card={card}
      weaknesses={[]}
      missions={locked ? [] : decodeMissions(missions.data)}
      missionsLocked={locked}
      readinessFailed={readiness.status >= 400}
      weaknessHref={() => "/reading/academy"}
      missionHref={() => "/reading/academy"}
      academyHref="/reading/academy"
      practiceHref="/reading/practice"
    />
  );
}
