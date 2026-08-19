import { SkillLaunch } from "@/components/exercise/ExerciseShell";
import { featureAccess } from "@/lib/entitlements";
import { loadEntitlements } from "@/lib/server/home";

export default async function WritingHome() {
  const entitlements = await loadEntitlements();
  const access = featureAccess(entitlements, "writing_ai_feedback");

  return (
    <SkillLaunch
      skill="Writing"
      title="Writing"
      lead="Every evaluation is scored by the backend, not the browser — nothing here can be talked into a better mark."
      actions={[
        {
          href: "/writing/academy",
          label: "Academy",
          detail: "A single recommended class. Nothing to pick when there is nothing to recommend yet.",
        },
        {
          href: "/writing/practice",
          label: "Practice",
          detail: "One prompt, then a server-side correction.",
          disabled: !access.usable,
          disabledReason: "Writing AI feedback is not available on your current plan. Manage subscriptions in the iOS app.",
        },
        {
          href: "/writing/exam",
          label: "Exam",
          detail: "70-minute simulation. Formative below SLP 3 — not a level.",
          disabled: !access.usable,
          disabledReason: "Writing AI feedback is not available on your current plan. Manage subscriptions in the iOS app.",
        },
        {
          href: "/writing/tools",
          label: "Writing Tools",
          detail: "Transformer, examiner vision and exam strategy.",
        },
        {
          href: "/writing/history",
          label: "History",
          detail: "Every past correction, in order.",
        },
      ]}
    />
  );
}
