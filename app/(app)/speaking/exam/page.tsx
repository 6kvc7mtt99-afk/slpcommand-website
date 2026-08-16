import { redirect } from "next/navigation";
import { SpeakingExam } from "@/components/speaking/SpeakingExam";
import { speakingTargetLevel } from "@/lib/speaking/prompts";
import { readAuthCookies } from "@/lib/server/authCookies";
import { loadProgress } from "@/lib/server/home";

export default async function SpeakingExamPage() {
  const auth = await readAuthCookies();
  if (!auth.userId) redirect("/login");
  const progress = await loadProgress();
  return <SpeakingExam userId={auth.userId} level={speakingTargetLevel(progress?.targetLevel)} />;
}
