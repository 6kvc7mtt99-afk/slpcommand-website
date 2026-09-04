import { SkillHub, type Destination } from "@/components/skill/SkillHub";
import { featureAccess, featureIsDescribed } from "@/lib/entitlements";
import { loadCoachAvailability } from "@/lib/server/coach";
import { loadEntitlements, loadProgress, loadProgressFailed } from "@/lib/server/home";

export default async function SpeakingHome() {
  const [entitlements, progress, progressFailed, coach] = await Promise.all([
    loadEntitlements(),
    loadProgress(),
    loadProgressFailed(),
    // Fails closed: an unreachable readiness call hides the Coach rather than
    // offering a door that can only fail.
    loadCoachAvailability(),
  ]);
  const access = featureAccess(entitlements, "speaking_ai_feedback");
  /** Same mix-up as Writing — the exam has its own credit. See writing/page.tsx. */
  // Fall back to the feedback allowance when the payload does not enumerate
  // the exam credit at all: metering against a key the server never mentioned
  // would render the exam locked for everyone. When the key IS present — as it
  // is in the backend's quota definitions — the exam is metered correctly.
  const planNote = "Speaking evaluation is not available on your current plan. Pro makes AI evaluation unlimited.";
  const examMetered = featureIsDescribed(entitlements, "speaking_exam_simulation");
  const examAccess = examMetered ? featureAccess(entitlements, "speaking_exam_simulation") : access;
  // The refusal must name the allowance actually consulted, or it explains the
  // wrong limit to someone who just hit a wall.
  const examNote = examMetered
    ? "Speaking exam simulation is not available on your current plan."
    : planNote;

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
      quota: examAccess,
      disabled: !examAccess.usable,
      disabledReason: examNote,
    },
    ...(coach.available
      ? [
          {
            href: "/speaking/coach",
            mode: "train" as const,
            kind: "Converse",
            label: "AI Coach",
            detail:
              "A live voice conversation built around one objective, then a debrief from the same engine that rates your recordings.",
            preview: "coach" as const,
            cta: "Open Coach",
          },
        ]
      : []),
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
      lead={
        coach.available
          ? "Recorded practice and exam, rated against the same criteria an examiner applies — and a live AI Coach that teaches to one objective."
          : "Recorded practice and exam, rated against the same criteria an examiner applies."
      }
      primary={
        access.usable
          ? { href: "/speaking/practice", label: "Start practice" }
          : { href: "/speaking/history", label: "View history" }
      }
      progress={progress}
      progressFailed={progressFailed}
      practiceHref="/speaking/practice"
      destinations={destinations}
    />
  );
}
