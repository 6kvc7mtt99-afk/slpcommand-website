import { SkillHub, type Destination } from "@/components/skill/SkillHub";
import { featureAccess } from "@/lib/entitlements";
import { loadEntitlements, loadProgress } from "@/lib/server/home";

export default async function SpeakingHome() {
  const [entitlements, progress] = await Promise.all([loadEntitlements(), loadProgress()]);
  const access = featureAccess(entitlements, "speaking_ai_feedback");
  const planNote = "Speaking evaluation is not available on your current plan. Subscriptions are managed in the iOS app.";

  const destinations: Destination[] = [
    {
      href: "/speaking/practice",
      mode: "train",
      kind: "Train",
      label: "Practice",
      detail: "One prompt, one recording, one evaluation. Nothing is scored until it reaches the server.",
      preview: "speaking",
      cta: "Start practice",
      quota: access,
      disabled: !access.usable,
      disabledReason: planNote,
    },
    {
      href: "/speaking/exam",
      mode: "assess",
      kind: "Assess",
      label: "Exam simulation",
      detail: "Three prompts in one sitting, rated task by task. Educational only.",
      preview: "speaking-exam",
      cta: "Start exam",
      quota: access,
      disabled: !access.usable,
      disabledReason: planNote,
    },
    {
      href: "/speaking/history",
      mode: "review",
      kind: "Review",
      label: "History",
      detail: "Every past attempt with its recording, for as long as the signed link lives.",
      preview: "history",
      cta: "View history",
    },
  ];

  return (
    <SkillHub
      skill="Speaking"
      title="Record it. Then hear the verdict."
      lead="Recorded practice and exam, rated against the same criteria an examiner applies. Coach arrives later, as a separate gated feature."
      primary={
        access.usable
          ? { href: "/speaking/practice", label: "Start practice" }
          : { href: "/speaking/history", label: "View history" }
      }
      progress={progress}
      practiceHref="/speaking/practice"
      destinations={destinations}
    />
  );
}
