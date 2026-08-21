import { redirect } from "next/navigation";
import { SpeakingExam } from "@/components/speaking/SpeakingExam";
import { SpeakingRealExam } from "@/components/speaking/SpeakingRealExam";
import { speakingTargetLevel } from "@/lib/speaking/prompts";
import { readAuthCookies } from "@/lib/server/authCookies";
import { loadProgress } from "@/lib/server/home";

// EXAM-REAL-003, Checkpoint 3 — SLP3 ONLY. Mirrors the backend's own gate exactly
// (server.js getListeningDesiredLevel: `targetLevel.startsWith("2") ? 2 : 3`) rather than
// speakingTargetLevel's rounding below, which the LEGACY component below still uses for
// its own, unrelated purpose (picking which fixed 3-prompt set to show). Decided
// server-side, in the same server component that already resolves progress?.targetLevel,
// so there is no client-side flicker between the two completely different UIs.
function isSlp3RealExamCandidate(targetLevel: string | undefined): boolean {
  return !String(targetLevel ?? "3").startsWith("2");
}

export default async function SpeakingExamPage() {
  const auth = await readAuthCookies();
  if (!auth.userId) redirect("/login");
  const progress = await loadProgress();
  if (isSlp3RealExamCandidate(progress?.targetLevel)) {
    return <SpeakingRealExam userId={auth.userId} />;
  }
  return <SpeakingExam userId={auth.userId} level={speakingTargetLevel(progress?.targetLevel)} />;
}
