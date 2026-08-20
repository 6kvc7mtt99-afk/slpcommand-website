import Link from "next/link";
import { asString, isRecord } from "@/lib/api/decode";
import { CoverageBar, EmptyAcademy } from "@/components/academy/AcademyLessonView";
import { AcademyPath, type PathUnit } from "@/components/academy/AcademyPath";
import { PriorityAction } from "@/components/training/PriorityAction";
import { backendJson } from "@/lib/server/backend";
import { loadAcademyTargetLevel } from "@/lib/server/targetLevel";

export default async function ReadingAcademyPage() {
  const targetLevel = await loadAcademyTargetLevel();
  const result = await backendJson<Record<string, unknown>>({
    method: "POST",
    path: "/api/reading/academy/home",
    body: JSON.stringify({ targetLevel }),
    contentType: "application/json",
    cache: "no-store",
  });
  if (result.status >= 400 || !result.data) {
    return <EmptyAcademy title="Reading Academy" body="The Academy is unavailable right now. Nothing was invented locally." />;
  }
  const data = result.data;
  const focus = isRecord(data.focus) ? data.focus : {};
  const reason = isRecord(focus.reason) ? focus.reason : {};
  const lesson = isRecord(focus.lesson) ? focus.lesson : {};
  const state = isRecord(data.state) ? data.state : {};
  const summary = isRecord(state.summary) ? state.summary : {};
  const curriculum = Array.isArray(data.curriculum) ? data.curriculum : [];

  // A real sentence built only from the coverage counts the backend
  // already returned — never a claim about the lesson itself.
  const weakN = Number(asString(summary.weak, "0")) || 0;
  const untestedN = Number(asString(summary.untested, "0")) || 0;
  const evidenceLine = [
    weakN > 0 ? `${weakN} ${weakN === 1 ? "class needs" : "classes need"} work` : null,
    untestedN > 0 ? `${untestedN} untested` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const units: PathUnit[] = curriculum.filter(isRecord).map((unit) => ({
    id: asString(unit.id, asString(unit.title)),
    title: asString(unit.title),
    lessons: (Array.isArray(unit.lessons) ? unit.lessons : []).filter(isRecord).map((item) => ({
      id: asString(item.id),
      title: asString(item.title),
      href: `/reading/academy/lesson/${encodeURIComponent(asString(item.id))}`,
    })),
  }));

  return (
    <div className="academy page-skill skill-reading">
      <header className="academy-masthead" data-enter>
        <p className="p-eyebrow is-skill">Reading Academy</p>
        <h1 className="p-hero-title">{asString(reason.headline, "Start here")}</h1>
        <p className="p-lead">{asString(reason.detail, "The backend chose this next class from your evidence.")}</p>
      </header>

      {asString(lesson.id) ? (
        <PriorityAction
          eyebrow="Recommended training"
          title={asString(lesson.title)}
          detail={asString(lesson.learningObjective) || undefined}
          evidence={evidenceLine || undefined}
          href={`/reading/academy/lesson/${encodeURIComponent(asString(lesson.id))}`}
          ctaLabel="Train this weakness"
          secondaryHref="/reading/practice"
          secondaryLabel="Straight to practice"
        />
      ) : null}

      <section className="p-section" data-reveal>
        <p className="p-eyebrow">Where you stand</p>
        <CoverageBar
          segments={[
            { label: "Sustained", value: Number(asString(summary.mastered, "0")) || 0, tone: "ok" },
            { label: "Developing", value: Number(asString(summary.emerging, "0")) || 0, tone: "accent" },
            { label: "Needs work", value: Number(asString(summary.weak, "0")) || 0, tone: "warn" },
            { label: "Not asked", value: Number(asString(summary.untested, "0")) || 0, tone: "muted" },
            { label: "Waiting", value: Number(asString(summary.blocked, "0")) || 0, tone: "muted" },
          ]}
        />
      </section>
      <section className="p-section" aria-label="Training path">
        <div className="p-section-head" data-reveal>
          <div>
            <h2>Your training path</h2>
            <p>The full reading curriculum. The marked class is the one your evidence points at.</p>
          </div>
        </div>
        <AcademyPath units={units} currentLessonId={asString(lesson.id)} practiceHref="/reading/practice" />
        <p className="academy-links">
          <Link href="/reading/academy/map">Competency map</Link>
          {" · "}
          <Link href="/reading/intelligence">Reading Intelligence</Link>
        </p>
      </section>
    </div>
  );
}
