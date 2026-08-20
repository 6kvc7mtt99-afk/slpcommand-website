import Link from "next/link";

export type PathLesson = { id: string; title: string; href: string; locked?: boolean };
export type PathUnit = { id: string; title: string; lessons: PathLesson[] };

/**
 * The training path.
 *
 * Academy's curriculum was a flat list of links under a heading, which
 * told a learner what exists but never where they are inside it. This
 * draws the same real curriculum as a path with a spine, so position is
 * the first thing you read.
 *
 * It marks only what the backend actually states: the lesson the
 * orchestrator chose (`focus.lesson.id`) is "now", and entitlement-locked
 * topics are locked. Nothing is marked complete, because no per-lesson
 * completion field exists in this response — inventing ticks would be
 * inventing progress.
 */
export function AcademyPath({
  units,
  currentLessonId,
  practiceHref,
}: {
  units: PathUnit[];
  currentLessonId?: string;
  practiceHref: string;
}) {
  if (units.length === 0) return null;
  let seenCurrent = false;

  return (
    <ol className="path">
      {units.map((unit, ui) => (
        <li key={unit.id} className="path-unit" data-reveal style={{ ["--i" as string]: ui }}>
          <div className="path-unit-head">
            <span className="path-node is-unit" aria-hidden="true" />
            <h3>{unit.title}</h3>
            <span className="path-count p-num">
              {unit.lessons.length} {unit.lessons.length === 1 ? "class" : "classes"}
            </span>
          </div>
          <ol className="path-lessons">
            {unit.lessons.map((lesson) => {
              const isNow = Boolean(currentLessonId) && lesson.id === currentLessonId;
              if (isNow) seenCurrent = true;
              return (
                <li key={lesson.id} className={`path-lesson${isNow ? " is-now" : ""}${lesson.locked ? " is-locked" : ""}`}>
                  <span className={`path-node${isNow ? " is-now" : ""}`} aria-hidden="true" />
                  {lesson.locked ? (
                    <span className="path-lesson-body">
                      <strong>{lesson.title}</strong>
                      <span className="path-tag is-locked">Locked</span>
                    </span>
                  ) : (
                    <Link href={lesson.href} className={`path-lesson-body${isNow ? " p-elevate is-current" : ""}`}>
                      <strong>{lesson.title}</strong>
                      {isNow ? <span className="path-tag is-now">You are here</span> : null}
                      <span className="path-go p-arrow" aria-hidden="true">→</span>
                    </Link>
                  )}
                  {isNow ? (
                    <div className="path-now-actions">
                      <Link className="btn btn-primary" href={lesson.href}>
                        Open the class
                        <span className="p-arrow" aria-hidden="true">→</span>
                      </Link>
                      <Link className="btn btn-outline" href={practiceHref}>
                        Go straight to practice
                      </Link>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </li>
      ))}
      {!seenCurrent && currentLessonId ? null : null}
    </ol>
  );
}
