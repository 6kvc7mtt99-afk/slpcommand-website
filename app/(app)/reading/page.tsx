import { SkillHub, type Destination } from "@/components/skill/SkillHub";
import { featureAccess } from "@/lib/entitlements";
import { loadEntitlements, loadProgress } from "@/lib/server/home";

export default async function ReadingHome() {
  const [entitlements, progress] = await Promise.all([loadEntitlements(), loadProgress()]);
  const practice = featureAccess(entitlements, "reading_practice");
  const exam = featureAccess(entitlements, "reading_exam_simulation");
  const planNote = "Not available on your current plan. Pro removes the weekly cap on Reading practice.";

  const destinations: Destination[] = [
    {
      href: "/reading/practice",
      mode: "train",
      kind: "Train",
      label: "Practice",
      detail: "One passage, one question, immediate feedback. Costs one credit per text.",
      preview: "reading",
      cta: "Start practice",
      quota: practice,
      disabled: !practice.usable,
      disabledReason: planNote,
    },
    {
      href: "/reading/exam",
      mode: "assess",
      kind: "Assess",
      label: "Exam simulation",
      detail: "A timed STANAG-style paper built from the same item pool. Educational only.",
      preview: "reading-exam",
      cta: "Start exam",
      quota: exam,
      disabled: !exam.usable,
      disabledReason: planNote,
    },
    {
      href: "/reading/academy",
      mode: "learn",
      kind: "Learn",
      label: "Academy",
      detail: "The class the backend chose from your evidence, inside the full curriculum.",
      preview: "academy",
      cta: "Open Academy",
    },
    {
      href: "/reading/intelligence",
      mode: "learn",
      kind: "Understand",
      label: "Intelligence",
      detail: "Where you stand, what the evidence supports, and what to train next.",
      preview: "intelligence",
      cta: "View Intelligence",
    },
  ];

  return (
    <SkillHub
      skill="Reading"
      title="Read like the exam reads you."
      lead="One passage, one question at a time. Academy and Intelligence read the same evidence, so neither invents a second opinion."
      primary={
        practice.usable
          ? { href: "/reading/practice", label: "Start practice" }
          : { href: "/reading/academy", label: "Open Academy", disabled: false }
      }
      progress={progress}
      practiceHref="/reading/practice"
      destinations={destinations}
    />
  );
}
