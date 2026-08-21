import { redirect } from "next/navigation";
import { EmptyAcademy } from "@/components/academy/AcademyLessonView";
import { SpeakingExam } from "@/components/speaking/SpeakingExam";
import { speakingTargetLevel } from "@/lib/speaking/prompts";
import { readAuthCookies } from "@/lib/server/authCookies";
import { loadProgress } from "@/lib/server/home";

export default async function SpeakingExamPage() {
  const auth = await readAuthCookies();
  if (!auth.userId) redirect("/login");
  const progress = await loadProgress();
  const level = speakingTargetLevel(progress?.targetLevel);
  if (!level) {
    return <EmptyAcademy title="Speaking exam" body="Your target level isn't available right now. Nothing was invented locally — try again shortly." />;
  }
  return <SpeakingExam userId={auth.userId} level={level} />;
}
