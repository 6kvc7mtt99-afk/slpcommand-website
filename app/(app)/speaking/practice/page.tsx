import { redirect } from "next/navigation";
import { EmptyAcademy } from "@/components/academy/AcademyLessonView";
import { SpeakingPractice } from "@/components/speaking/SpeakingPractice";
import { speakingTargetLevel } from "@/lib/speaking/prompts";
import { readAuthCookies } from "@/lib/server/authCookies";
import { loadProgress } from "@/lib/server/home";

export default async function SpeakingPracticePage() {
  const auth = await readAuthCookies();
  if (!auth.userId) redirect("/login");
  const progress = await loadProgress();
  const level = speakingTargetLevel(progress?.targetLevel);
  if (!level) {
    return <EmptyAcademy title="Speaking practice" body="Your target level isn't available right now. Nothing was invented locally — try again shortly." />;
  }
  return <SpeakingPractice userId={auth.userId} level={level} />;
}
