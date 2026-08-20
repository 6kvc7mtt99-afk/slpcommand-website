import Link from "next/link";

/**
 * Where this lesson sits in the real workflow.
 *
 * Every stage is a route that already exists — Intelligence, Academy,
 * Practice, Exam, Progress — not an invented product concept. "Learn" is
 * marked current because a lesson is a child of Academy; there is no
 * backend mastery percentage to report, so the last stage names the real
 * destination (Progress) rather than claiming a completion state.
 */
const STAGES = [
  { key: "diagnose", label: "Diagnose" },
  { key: "learn", label: "Learn" },
  { key: "practice", label: "Practice" },
  { key: "assess", label: "Assess" },
  { key: "progress", label: "Progress" },
] as const;

export function LessonStages({ skill }: { skill: string }) {
  const key = skill.trim().toLowerCase();
  const hrefFor: Record<(typeof STAGES)[number]["key"], string> = {
    diagnose: `/${key}/intelligence`,
    learn: `/${key}/academy`,
    practice: `/${key}/practice`,
    assess: `/${key}/exam`,
    progress: "/progress",
  };
  const currentIndex = 1;

  return (
    <nav className="lesson-stages" aria-label="Training stage">
      {STAGES.map((stage, i) => (
        <Link
          key={stage.key}
          href={hrefFor[stage.key]}
          className={`lesson-stage${i === currentIndex ? " is-current" : i < currentIndex ? " is-past" : ""}`}
          aria-current={i === currentIndex ? "step" : undefined}
        >
          <span className="lesson-stage-dot p-num">{String(i + 1).padStart(2, "0")}</span>
          <span className="lesson-stage-label">{stage.label}</span>
        </Link>
      ))}
    </nav>
  );
}
