import { SkillLaunch } from "@/components/exercise/ExerciseShell";
import { featureAccess } from "@/lib/entitlements";
import { loadEntitlements } from "@/lib/server/home";

export default async function ListeningHome() {
  const entitlements = await loadEntitlements();
  const practice = featureAccess(entitlements, "listening_practice");
  const exam = featureAccess(entitlements, "listening_exam_simulation");

  return (
    <SkillLaunch
      skill="Listening"
      title="Listening"
      lead="No transcript — just like the real exam. Academy uses the iOS catalog prefix rule."
      actions={[
        {
          href: "/listening/practice",
          label: "Practice",
          detail: "One clip, one question. Sustained target 70%.",
          disabled: !practice.usable,
          disabledReason: "Listening practice is not available on your current plan. Manage subscriptions in the iOS app.",
        },
        {
          href: "/listening/exam",
          label: "Exam",
          detail: "REDS-style simulation. Educational only — not an official result.",
          disabled: !exam.usable,
          disabledReason: "Listening exam simulation is not available on your current plan. Manage subscriptions in the iOS app.",
        },
        {
          href: "/listening/intelligence",
          label: "Intelligence",
          detail: "Readiness, weaknesses and missions from the backend.",
        },
        {
          href: "/listening/academy",
          label: "Academy",
          detail: "Cloud standing plus the free-set catalog. Pro topics stay locked.",
        },
      ]}
    />
  );
}
