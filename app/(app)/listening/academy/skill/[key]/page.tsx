import Link from "next/link";
import { asString, isRecord } from "@/lib/api/decode";
import { stateLabel } from "@/lib/api/academy";
import { EmptyAcademy } from "@/components/academy/AcademyLessonView";
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
  const topic = topicForSkillOrSubSkill(asString(skill.key, key));
  const practice = skill.corpusGap === true ? null : `/listening/practice?${skill.isSubSkill ? "focusSubSkill" : "focusSkill"}=${encodeURIComponent(asString(skill.key, key))}`;
  return (
    <section className="exercise">
      <p className="section-eyebrow">Listening Academy</p>
      <h1>{asString(skill.label, key)}</h1>
      <p className="muted">{asString(skill.description, asString(result.data.reason))}</p>
      <p>{stateLabel(asString(skill.state))}</p>
      {practice ? (
        <p>
          <Link className="btn btn-primary" href={practice}>
            Train this skill
          </Link>
        </p>
      ) : (
        <p className="muted">No corpus items are available for this competency.</p>
      )}
      {topic ? (
        <p>
          <Link href={`/listening/academy/topic/${topic.id}`}>Study the Academy topic</Link>
        </p>
      ) : null}
    </section>
  );
}
