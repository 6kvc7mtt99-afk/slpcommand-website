import { EmptyAcademy } from "@/components/academy/AcademyLessonView";
import { WritingToolsHome } from "@/components/writing/WritingTools";
import { decodeOrchestrator } from "@/lib/api/writingTools";
import { backendJson } from "@/lib/server/backend";
import { loadTargetLevel } from "@/lib/server/targetLevel";

export default async function WritingToolsPage() {
  const targetLevel = await loadTargetLevel();
  if (!targetLevel) {
    return <EmptyAcademy title="Writing Tools" body="Your target level isn't available right now. Nothing was invented locally." />;
  }
  const result = await backendJson<unknown>({
    method: "POST",
    path: "/api/writing/orchestrator/next",
    body: JSON.stringify({ targetLevel, sessionPhase: "start" }),
    contentType: "application/json",
    cache: "no-store",
  });
  return (
    <WritingToolsHome
      targetLevel={targetLevel}
      orchestrator={result.status < 400 ? decodeOrchestrator(result.data) : null}
    />
  );
}
