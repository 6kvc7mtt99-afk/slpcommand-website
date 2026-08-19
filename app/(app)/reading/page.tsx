import { SkillLaunch } from "@/components/exercise/ExerciseShell";
import { featureAccess } from "@/lib/entitlements";
import { loadEntitlements } from "@/lib/server/home";

export default async function ReadingHome() {
  const entitlements = await loadEntitlements();
  const practice = featureAccess(entitlements, "reading_practice");
  const exam = featureAccess(entitlements, "reading_exam_simulation");

  return (
    <SkillLaunch
      skill="Reading"
      title="Reading"
      lead="One passage, one question. Academy and Intelligence read the same evidence, so neither invents a second opinion."
      actions={[
        {
          href: "/reading/academy",
          label: "Academy",
          detail: "Structured classes from the live curriculum. No second syllabus.",
        },
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
          disabled: !exam.usable,
          disabledReason: "Reading exam simulation is not available on your current plan. Manage subscriptions in the iOS app.",
        },
        {
          href: "/reading/intelligence",
          label: "Intelligence",
          detail: "Where you stand, and what to train next.",
        },
      ]}
    />
  );
}
