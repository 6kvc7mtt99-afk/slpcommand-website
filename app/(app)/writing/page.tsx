import { SkillHub, type Destination } from "@/components/skill/SkillHub";
import { featureAccess } from "@/lib/entitlements";
import { loadEntitlements, loadProgress } from "@/lib/server/home";

export default async function WritingHome() {
  const [entitlements, progress] = await Promise.all([loadEntitlements(), loadProgress()]);
  const access = featureAccess(entitlements, "writing_ai_feedback");
  const planNote = "Writing evaluation is not available on your current plan. Subscriptions are managed in the iOS app.";

  const destinations: Destination[] = [
    {
      href: "/writing/practice",
      mode: "train",
      kind: "Train",
      label: "Practice",
      detail: "One prompt, a full editor, then a server-side correction against the rubric.",
      preview: "writing",
      cta: "Start practice",
      quota: access,
      disabled: !access.usable,
      disabledReason: planNote,
    },
    {
      href: "/writing/exam",
      mode: "assess",
      kind: "Assess",
      label: "Exam simulation",
      detail: "A 70-minute timed paper. Formative below SLP 3 — indicative, never a level.",
      preview: "writing-exam",
      cta: "Start exam",
      quota: access,
      disabled: !access.usable,
      disabledReason: planNote,
    },
    {
      href: "/writing/academy",
      mode: "learn",
      kind: "Learn",
      label: "Academy",
      detail: "The class the orchestrator chose, inside the full writing curriculum.",
      preview: "academy",
      cta: "Open Academy",
    },
    {
      href: "/writing/tools",
      mode: "review",
      kind: "Sharpen",
      label: "Writing tools",
      detail: "Level 2→3 transformer, examiner vision and exam strategy.",
      preview: "tools",
      cta: "Open tools",
    },
    {
      href: "/writing/history",
      mode: "review",
      kind: "Review",
      label: "History",
      detail: "Every past correction from the backend, in order.",
      preview: "history",
      cta: "View history",
    },
  ];

  return (
    <SkillHub
      skill="Writing"
      title="Marked on the server. Every time."
      lead="Every evaluation is scored by the backend against the rubric — nothing in this browser can be talked into a better mark."
      primary={
        access.usable
          ? { href: "/writing/practice", label: "Start practice" }
          : { href: "/writing/academy", label: "Open Academy" }
      }
      progress={progress}
      practiceHref="/writing/practice"
      destinations={destinations}
    />
  );
}
