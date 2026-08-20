import Link from "next/link";
import { asString, isRecord } from "@/lib/api/decode";
import { EmptyAcademy } from "@/components/academy/AcademyLessonView";
import { LessonStages } from "@/components/academy/LessonStages";
import { RecordState } from "@/components/academy/RecordState";
import { topicForSkillOrSubSkill } from "@/lib/listening/academyCatalog";
import { backendJson } from "@/lib/server/backend";
import { loadAcademyTargetLevel } from "@/lib/server/targetLevel";

export default async function ListeningSkillPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const targetLevel = await loadAcademyTargetLevel();
  const result = await backendJson<Record<string, unknown>>({
    path: `/api/listening/academy/skill/${encodeURIComponent(key)}`,
    search: `?targetLevel=${targetLevel}`,
    cache: "no-store",
  });
  if (result.status >= 400 || !result.data) {
    return <EmptyAcademy title="Listening skill" body="No such listening competency." />;
  }
  const skill = isRecord(result.data.skill) ? result.data.skill : result.data;
  const skillKey = asString(skill.key, key);
  const topic = topicForSkillOrSubSkill(skillKey);
  // `corpusGap` means the backend has no items to serve for this
  // competency — a real state, and the one case where offering practice
  // would send the learner somewhere that cannot load.
  const practice =
    skill.corpusGap === true
      ? null
      : `/listening/practice?${skill.isSubSkill ? "focusSubSkill" : "focusSkill"}=${encodeURIComponent(skillKey)}`;
  const detail = asString(skill.description, asString(result.data.reason));

  return (
    <div className="lesson page-skill skill-listening">
      <LessonStages skill="Listening" />

      <header data-enter>
        <p className="lesson-kicker">
          <span className="is-skill-text">Listening Academy</span>
          <span aria-hidden="true">·</span>
          <b>Competency</b>
        </p>
        <h1 className="lesson-title">{asString(skill.label, key)}</h1>
        {detail ? <p className="lesson-lead">{detail}</p> : null}
        <dl className="lesson-facts">
          <div>
            <dt>Standing</dt>
            <dd>
              <RecordState state={asString(skill.state)} />
            </dd>
          </div>
        </dl>
        {practice ? (
          <div className="lesson-cta">
            <Link className="btn btn-primary btn-hero" href={practice}>
              Train this competency
              <span className="p-arrow" aria-hidden="true">→</span>
            </Link>
          </div>
        ) : (
          <p className="settings-note">
            No practice items exist for this competency yet, so there is nothing to train here. The rest of the
            listening catalog is unaffected.
          </p>
        )}
      </header>

      {topic ? (
        <section className="lesson-block" data-reveal>
          <p className="lesson-block-label">Study it first</p>
          <ul className="lesson-sublist">
            <li>
              <strong>
                <Link href={`/listening/academy/topic/${topic.id}`}>{topic.title}</Link>
              </strong>
              <p>{topic.whyItMatters || topic.description}</p>
            </li>
          </ul>
        </section>
      ) : null}

      <p className="records-back">
        <Link href="/listening/academy/map">Back to the competency map</Link>
      </p>
    </div>
  );
}
