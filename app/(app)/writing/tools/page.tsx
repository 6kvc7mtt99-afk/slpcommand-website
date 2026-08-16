import { WritingToolsHome } from "@/components/writing/WritingTools";
import { decodeOrchestrator } from "@/lib/api/writingTools";
import { backendJson } from "@/lib/server/backend";
import { loadAcademyTargetLevel } from "@/lib/server/targetLevel";

export default async function WritingToolsPage() {
  const targetLevel = await loadAcademyTargetLevel();
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
