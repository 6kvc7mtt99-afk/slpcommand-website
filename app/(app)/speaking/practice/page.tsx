import { redirect } from "next/navigation";
import { SpeakingPractice } from "@/components/speaking/SpeakingPractice";
import { speakingTargetLevel } from "@/lib/speaking/prompts";
import { readAuthCookies } from "@/lib/server/authCookies";
import { loadProgress } from "@/lib/server/home";

export default async function SpeakingPracticePage() {
  const auth = await readAuthCookies();
  if (!auth.userId) redirect("/login");
  const progress = await loadProgress();
  return <SpeakingPractice userId={auth.userId} level={speakingTargetLevel(progress?.targetLevel)} />;
}
