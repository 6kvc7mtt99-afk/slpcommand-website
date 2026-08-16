import { SkillLaunch } from "@/components/exercise/ExerciseShell";
import { featureAccess } from "@/lib/entitlements";
import { loadEntitlements } from "@/lib/server/home";

export default async function SpeakingHome() {
  const entitlements = await loadEntitlements();
  const access = featureAccess(entitlements, "speaking_ai_feedback");

  return (
    <SkillLaunch
      skill="Speaking"
      title="Speaking"
      lead="Recorded practice and exam. Coach is a later, gated train."
      actions={[
        {
          href: "/speaking/practice",
          label: "Practice",
          detail: "One prompt, one recording. The backend evaluates. No local score.",
          disabled: !access.usable,
          disabledReason: "Speaking AI feedback is not available on your current plan. Manage subscriptions in the iOS app.",
        },
        {
          href: "/speaking/exam",
          label: "Exam",
          detail: "Three prompts, one session. Educational only — not an official result.",
          disabled: !access.usable,
          disabledReason: "Speaking AI feedback is not available on your current plan. Manage subscriptions in the iOS app.",
        },
        {
          href: "/speaking/history",
          label: "History",
          detail: "Past attempts from the backend. Signed audio URLs expire.",
        },
      ]}
    />
  );
}
