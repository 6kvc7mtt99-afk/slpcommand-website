import { SkillLaunch } from "@/components/exercise/ExerciseShell";
import { featureAccess } from "@/lib/entitlements";
import { loadEntitlements } from "@/lib/server/home";

export default async function ReadingHome() {
  const entitlements = await loadEntitlements();
  const practice = featureAccess(entitlements, "reading_practice");

  return (
    <SkillLaunch
      skill="Reading"
      title="Reading"
      lead="One passage, one question. Academy and Intelligence stay hidden until Phase 8."
      actions={[
        {
          href: "/reading/practice",
          label: "Practice",
          detail: "Immediate feedback. One credit per text.",
          disabled: !practice.usable,
          disabledReason: "Reading practice is not available on your current plan. Manage subscriptions in the iOS app.",
        },
        {
          href: "/reading/exam",
          label: "Exam",
          detail: "STANAG-style simulation. Educational only — not an official result.",
        },
      ]}
    />
  );
}
