import { SkillHub, type Destination } from "@/components/skill/SkillHub";
import { featureAccess } from "@/lib/entitlements";
import { loadEntitlements, loadProgress } from "@/lib/server/home";

export default async function ListeningHome() {
  const [entitlements, progress] = await Promise.all([loadEntitlements(), loadProgress()]);
  const practice = featureAccess(entitlements, "listening_practice");
  const exam = featureAccess(entitlements, "listening_exam_simulation");
  const planNote = "Not available on your current plan. Subscriptions are managed in the iOS app.";

  const destinations: Destination[] = [
    {
      href: "/listening/practice",
      kind: "Train",
      label: "Practice",
      detail: "One clip, one question, no transcript. Sustained target is 70%.",
      preview: "listening",
      cta: "Start practice",
      disabled: !practice.usable,
      disabledReason: planNote,
    },
    {
      href: "/listening/exam",
      kind: "Assess",
      label: "Exam simulation",
      detail: "A REDS-style timed session built to the real audio budget. Educational only.",
      preview: "listening-exam",
      cta: "Start exam",
      disabled: !exam.usable,
      disabledReason: planNote,
    },
    {
      href: "/listening/academy",
      kind: "Learn",
      label: "Academy",
      detail: "Cloud standing plus the free-set catalog. Pro topics stay locked.",
      preview: "academy",
      cta: "Open Academy",
    },
    {
      href: "/listening/intelligence",
      kind: "Understand",
      label: "Intelligence",
      detail: "What is weak, how confident the estimate is, and what to train next.",
      preview: "intelligence",
      cta: "View Intelligence",
    },
  ];

  return (
    <SkillHub
      skill="Listening"
      title="No transcript. Just like the room."
      lead="One clip, one question, played the way the exam plays it. Nothing is replayed on demand and nothing is written down for you."
      primary={
        practice.usable
          ? { href: "/listening/practice", label: "Start practice" }
          : { href: "/listening/academy", label: "Open Academy" }
      }
      progress={progress}
      practiceHref="/listening/practice"
      destinations={destinations}
    />
  );
}
