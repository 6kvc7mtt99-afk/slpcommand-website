import Link from "next/link";
import { asString, isRecord } from "@/lib/api/decode";
import { CoverageBar, EmptyAcademy } from "@/components/academy/AcademyLessonView";
import { AcademyPath, type PathUnit } from "@/components/academy/AcademyPath";
import {
  LISTENING_ACADEMY_CATEGORIES,
  isListeningTopicLocked,
  topicForSkillOrSubSkill,
  topicsFor,
} from "@/lib/listening/academyCatalog";
import { backendJson } from "@/lib/server/backend";
import { loadEntitlements } from "@/lib/server/home";
import { loadAcademyTargetLevel } from "@/lib/server/targetLevel";

export default async function ListeningAcademyPage() {
  const [targetLevel, entitlements] = await Promise.all([loadAcademyTargetLevel(), loadEntitlements()]);
  const isPro = entitlements.status === "ready" && entitlements.isPro;
  // The decision names a skill key, not a topic id — map it through the
  // catalog so the path can mark the right node, and leave it unmarked
  // when the key has no matching topic rather than guessing one.
  const result = await backendJson<Record<string, unknown>>({
    path: "/api/listening/academy/home",
    search: `?targetLevel=${targetLevel}`,
    cache: "no-store",
  });
  const data = result.status < 400 && result.data ? result.data : {};
  const decision = isRecord(data.decision) ? data.decision : {};
  const reason = isRecord(decision.reason) ? decision.reason : {};
  const counts = isRecord(data.counts) ? data.counts : {};
  const nextStep = asString(decision.nextStep);
  // The decision names a skill key, not a topic id — map it through the
  // catalog so the path marks the right node, and leave it unmarked when
  // the key matches no topic rather than guessing one.
  const targetKey = asString(isRecord(decision.target) ? decision.target.key : "");
  const targetTopicId = targetKey ? topicForSkillOrSubSkill(targetKey)?.id : undefined;
  const practiceHref =
    nextStep === "exam"
      ? "/listening/exam"
      : `/listening/practice${asString(isRecord(decision.target) ? decision.target.key : "") ? `?focusSkill=${encodeURIComponent(asString(isRecord(decision.target) ? decision.target.key : ""))}` : ""}`;

  return (
    <div className="academy page-skill skill-listening">
      <section className="p-hero academy-hero" data-enter>
        <div>
          <p className="p-eyebrow is-skill">Listening Academy</p>
          <h1 className="p-hero-title">{asString(reason.headline, "Listening Academy")}</h1>
          <p className="p-lead">{asString(reason.detail, "Cloud standing plus the catalog. A free plan does not unlock every topic.")}</p>
          <div className="p-hero-actions">
            <Link className="btn btn-primary btn-hero" href={practiceHref}>
              {nextStep === "exam" ? "Take the exam" : nextStep === "prerequisite" ? "Train the prerequisite" : decision.hasEvidence ? "Start training" : "Record a baseline"}
              <span className="p-arrow" aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
        <aside className="academy-objective p-panel">
          <p className="p-eyebrow">Coverage</p>
        <CoverageBar
          segments={[
            { label: "Sustained", value: Number(asString(counts.mastered, "0")) || 0, tone: "ok" },
            { label: "Developing", value: Number(asString(counts.emerging, "0")) || 0, tone: "accent" },
            { label: "Needs work", value: Number(asString(counts.weak, "0")) || 0, tone: "warn" },
            { label: "Not asked", value: Number(asString(counts.untested, "0")) || 0, tone: "muted" },
            { label: "Waiting", value: Number(asString(counts.blocked, "0")) || 0, tone: "muted" },
          ]}
        />
        </aside>
      </section>
      {result.status >= 400 ? <EmptyAcademy title="Cloud standing" body="Cloud Academy standing is unavailable. The catalog below still follows the free-set rule." /> : null}
      <section className="p-section" aria-label="Training path">
        <div className="p-section-head" data-reveal>
          <div>
            <h2>Your training path</h2>
            <p>The full listening catalog. Pro topics stay locked until the plan allows them.</p>
          </div>
        </div>
        <AcademyPath
          units={LISTENING_ACADEMY_CATEGORIES.map((category): PathUnit => ({
            id: category.key,
            title: category.label,
            lessons: topicsFor(category.key).map((topic) => ({
              id: topic.id,
              title: topic.title,
              href: `/listening/academy/topic/${topic.id}`,
              locked: isListeningTopicLocked(topic.id, isPro),
            })),
          }))}
          currentLessonId={targetTopicId}
          practiceHref={practiceHref}
        />
        <p className="academy-links">
          <Link href="/listening/academy/map">Competency map</Link>
          {" · "}
          <Link href="/listening/intelligence">Listening Intelligence</Link>
        </p>
      </section>
    </div>
  );
}
