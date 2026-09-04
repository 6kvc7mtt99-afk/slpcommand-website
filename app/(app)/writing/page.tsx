import { SkillHub, type Destination } from "@/components/skill/SkillHub";
import { featureAccess, featureIsDescribed } from "@/lib/entitlements";
import { loadEntitlements, loadProgress, loadProgressFailed } from "@/lib/server/home";

export default async function WritingHome() {
  const [entitlements, progress, progressFailed] = await Promise.all([
    loadEntitlements(),
    loadProgress(),
    loadProgressFailed(),
  ]);
  const access = featureAccess(entitlements, "writing_ai_feedback");
  /**
   * QUOTA-KEY — the exam has its OWN credit, and the hub was spending the
   * wrong one's balance.
   *
   * Practice and Exam both used `writing_ai_feedback`, but the exam is metered
   * by `writing_exam_simulation` — a separate feature with its own counter
   * (Free 1/month), exactly as Reading and Listening already read their own
   * `*_exam_simulation` keys. Two concrete failures came out of the mix-up: a
   * learner who had used their 3 evaluations saw Exam rendered "Used up" while
   * their exam credit was untouched, and a learner who had used the exam credit
   * was told "2 of 3 left this month" and then refused at the wall.
   */
  // Fall back to the feedback allowance when the payload does not enumerate
  // the exam credit at all: metering against a key the server never mentioned
  // would render the exam locked for everyone. When the key IS present — as it
  // is in the backend's quota definitions — the exam is metered correctly.
  const planNote = "Writing evaluation is not available on your current plan. Pro makes AI evaluation unlimited.";
  const examMetered = featureIsDescribed(entitlements, "writing_exam_simulation");
  const examAccess = examMetered ? featureAccess(entitlements, "writing_exam_simulation") : access;
  // The refusal must name the allowance actually consulted, or it explains the
  // wrong limit to someone who just hit a wall.
  const examNote = examMetered
    ? "Writing exam simulation is not available on your current plan."
    : planNote;

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
      quota: examAccess,
      disabled: !examAccess.usable,
      disabledReason: examNote,
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
      href: "/writing/intelligence",
      mode: "learn",
      kind: "Understand",
      label: "Intelligence",
      detail: "The competencies blocking your target level, and why — from the same evidence Academy uses.",
      preview: "intelligence",
      cta: "View Intelligence",
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
      progressFailed={progressFailed}
      practiceHref="/writing/practice"
      destinations={destinations}
    />
  );
}
