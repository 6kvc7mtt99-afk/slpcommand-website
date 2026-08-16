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
      lead="Evaluation stays on the server. Tools and Academy stay hidden until Phase 8."
      actions={[
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
        },
        {
          href: "/writing/history",
          label: "History",
          detail: "Past corrections from the backend. Nothing is scored in the browser.",
        },
      ]}
    />
  );
}
