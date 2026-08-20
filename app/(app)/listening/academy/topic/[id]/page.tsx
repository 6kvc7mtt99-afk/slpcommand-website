import Link from "next/link";
import { EmptyAcademy } from "@/components/academy/AcademyLessonView";
import { LessonStages } from "@/components/academy/LessonStages";
import { CommercialCard } from "@/components/exercise/ExerciseShell";
import { LISTENING_ACADEMY_CATEGORIES, isListeningTopicLocked, topicById } from "@/lib/listening/academyCatalog";
import { loadEntitlements } from "@/lib/server/home";

export default async function ListeningTopicPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ why?: string }>;
}) {
  const [{ id }, { why }] = await Promise.all([params, searchParams]);
  const topic = topicById(id);
  if (!topic) return <EmptyAcademy title="Topic" body="That Academy topic is not in the catalog." />;
  const entitlements = await loadEntitlements();
  const isPro = entitlements.status === "ready" && entitlements.isPro;
  const categoryLabel = LISTENING_ACADEMY_CATEGORIES.find((c) => c.key === topic.category)?.label || "Listening Academy";

  if (isListeningTopicLocked(topic.id, isPro)) {
    return (
      <div className="lesson page-skill skill-listening">
        <LessonStages skill="Listening" />
        <header data-enter>
          <p className="lesson-kicker">
            <span className="is-skill-text">Listening Academy</span>
            <span aria-hidden="true">·</span>
            <b>{categoryLabel}</b>
          </p>
          <h1 className="lesson-title">{topic.title}</h1>
          <p className="lesson-lead">{topic.description}</p>
        </header>
        <div className="lesson-block" data-reveal>
          <CommercialCard
            title="This topic is part of the complete Academy, included in SLP Command Pro."
            body="Subscriptions are managed in the iOS app until web billing exists."
          />
        </div>
      </div>
    );
  }

  const practiceHref = topic.targetSubSkill
    ? `/listening/practice?focusSubSkill=${encodeURIComponent(topic.targetSubSkill)}`
    : topic.targetSkill
      ? `/listening/practice?focusSkill=${encodeURIComponent(topic.targetSkill)}`
      : "/listening/practice";
  const ctaLabel = why ? "Train this weakness" : "Apply in practice";

  return (
    <div className="lesson page-skill skill-listening">
      <LessonStages skill="Listening" />

      {why ? (
        <p className="lesson-connect" data-enter>
          <strong>Your current priority</strong>
          <span>{why}</span>
        </p>
      ) : null}

      <header data-enter>
        <p className="lesson-kicker">
          <span className="is-skill-text">Listening Academy</span>
          <span aria-hidden="true">·</span>
          <b>{categoryLabel}</b>
        </p>
        <h1 className="lesson-title">{topic.title}</h1>
        {topic.whyItMatters ? <p className="lesson-lead">{topic.whyItMatters}</p> : null}
        {topic.level ? (
          <dl className="lesson-facts">
            <div>
              <dt>Level</dt>
              <dd>SLP {topic.level}</dd>
            </div>
          </dl>
        ) : null}
        <div className="lesson-cta">
          <Link className="btn btn-primary btn-hero" href={practiceHref}>
            {ctaLabel}
            <span className="p-arrow" aria-hidden="true">→</span>
          </Link>
        </div>
      </header>

      {topic.description ? (
        <section className="lesson-block is-primary" data-reveal>
          <p className="lesson-block-label">What to learn</p>
          <p>{topic.description}</p>
        </section>
      ) : null}

      {topic.commonMistakes.length ? (
        <section className="lesson-block" data-reveal>
          <p className="lesson-block-label">Watch for</p>
          <ul className="lesson-watch">
            {topic.commonMistakes.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {topic.examTips.length ? (
        <section className="lesson-block" data-reveal>
          <p className="lesson-block-label">How you&rsquo;ll know it worked</p>
          <ul className="lesson-checklist">
            {topic.examTips.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {topic.lessons.length ? (
        <section className="lesson-block" data-reveal>
          <p className="lesson-block-label">Inside this topic</p>
          <ul className="lesson-sublist">
            {topic.lessons.map((item) => (
              <li key={item.id}>
                <strong>{item.title}</strong>
                <p>{item.learningObjective}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="lesson-done" data-reveal>
        <p className="lesson-done-mark">End of this topic</p>
        <h2>Apply it before it fades</h2>
        <p>Reading this changes nothing on its own — the evidence only moves once you practise.</p>
        <div className="lesson-done-actions">
          <Link className="btn btn-primary" href={practiceHref}>
            {ctaLabel}
            <span className="p-arrow" aria-hidden="true">→</span>
          </Link>
          <Link className="btn btn-outline" href="/listening/academy">
            Back to Academy
          </Link>
        </div>
      </section>
    </div>
  );
}
