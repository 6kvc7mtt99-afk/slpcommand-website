import Link from "next/link";
import { EmptyAcademy } from "@/components/academy/AcademyLessonView";
import { CommercialCard } from "@/components/exercise/ExerciseShell";
import { isListeningTopicLocked, topicById } from "@/lib/listening/academyCatalog";
import { loadEntitlements } from "@/lib/server/home";

export default async function ListeningTopicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const topic = topicById(id);
  if (!topic) return <EmptyAcademy title="Topic" body="That Academy topic is not in the catalog." />;
  const entitlements = await loadEntitlements();
  const isPro = entitlements.status === "ready" && entitlements.isPro;
  if (isListeningTopicLocked(topic.id, isPro)) {
    return (
      <section className="exercise">
        <p className="section-eyebrow">Listening Academy</p>
        <h1>{topic.title}</h1>
        <CommercialCard
          title="This topic is part of the complete Academy, included in SLP Command Pro."
          body="Subscriptions are managed in the iOS app until web billing exists."
        />
      </section>
    );
  }
  const practice = topic.targetSubSkill
    ? `/listening/practice?focusSubSkill=${encodeURIComponent(topic.targetSubSkill)}`
    : topic.targetSkill
      ? `/listening/practice?focusSkill=${encodeURIComponent(topic.targetSkill)}`
      : "/listening/practice";
  return (
    <section className="exercise">
      <p className="section-eyebrow">Listening Academy</p>
      <h1>{topic.title}</h1>
      <p>{topic.description}</p>
      <article className="home-card">
        <p className="home-kicker">Why it matters</p>
        <p>{topic.whyItMatters}</p>
      </article>
      <article className="home-card">
        <p className="home-kicker">Common mistakes</p>
        <ul>
          {topic.commonMistakes.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </article>
      <article className="home-card">
        <p className="home-kicker">Exam tips</p>
        <ul>
          {topic.examTips.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </article>
      {topic.lessons.length ? (
        <article className="home-card">
          <p className="home-kicker">Lessons</p>
          <ul>
            {topic.lessons.map((lesson) => (
              <li key={lesson.id}>
                <strong>{lesson.title}</strong>
                <p className="muted">{lesson.learningObjective}</p>
              </li>
            ))}
          </ul>
        </article>
      ) : null}
      <p>
        <Link className="btn btn-primary" href={practice}>
          Practise this
        </Link>
      </p>
    </section>
  );
}
