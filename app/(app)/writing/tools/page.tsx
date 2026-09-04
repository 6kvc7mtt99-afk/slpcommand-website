import { WritingToolsHome } from "@/components/writing/WritingTools";
import { decodeOrchestrator } from "@/lib/api/writingTools";
import { backendJson } from "@/lib/server/backend";
import { stateFromResult } from "@/lib/server/stateFromResult";
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
  const orchestrator = result.status < 400 ? decodeOrchestrator(result.data) : null;
  // The tools themselves work regardless, so this stays a panel on a live page
  // rather than replacing it — but it must not attribute the gap to a decision
  // the orchestrator never got to make.
  return (
    <WritingToolsHome
      targetLevel={targetLevel}
      orchestrator={orchestrator}
      orchestratorState={stateFromResult(result, { subject: "your next step" })}
    />
  );
}
