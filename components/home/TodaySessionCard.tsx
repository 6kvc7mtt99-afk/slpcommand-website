import Link from "next/link";
import { hasSession } from "@/lib/api/sessionToday";
import type { SessionToday } from "@/lib/api/types";

const SKILL_HREF: Record<string, string> = {
  reading: "/reading/practice",
  listening: "/listening/practice",
  writing: "/writing/practice",
  speaking: "/speaking/practice",
};

export function TodaySessionCard({ today }: { today: SessionToday | null }) {
  if (!hasSession(today) || !today) return null;

  const { mission, session } = today;
  const coach = mission.coachLine;
  const firstSkill = session.blocks[0]?.skill;
  const firstHref = firstSkill ? SKILL_HREF[firstSkill] : undefined;

  return (
    <article className="home-card home-mission">
      <p className="home-kicker">Today’s mission</p>
      {mission.headline ? <h2>{mission.headline}</h2> : <h2>Today’s session</h2>}
      {mission.reason ? <p className="muted">{mission.reason}</p> : null}

      <ul className="home-blocks">
        {session.blocks.map((block, index) => (
          <li key={`${block.skill}-${index}`}>
            <div className="home-block-head">
              <strong className="home-skill-name">{block.skill}</strong>
              <span className="home-chip">{block.minutes} min</span>
              {block.posture ? <span className="home-chip">{block.posture}</span> : null}
            </div>
            {block.why ? <p>{block.why}</p> : null}
            {block.focus ? <p className="muted">Focus: {block.focus}</p> : null}
            {block.academyFocus ? <p className="muted">Academy: {block.academyFocus}</p> : null}
          </li>
        ))}
      </ul>

      {session.difficulty.level ? (
        <p className="muted">
          Difficulty: {session.difficulty.level}
          {session.difficulty.why ? ` — ${session.difficulty.why}` : ""}
        </p>
      ) : null}

      {session.skillsSkipped.length > 0 ? (
        <div className="home-skipped">
          <p className="home-kicker">Skipped</p>
          {session.skillsSkipped.map((item) => (
            <p key={item.skill} className="muted">
              {item.skill}
              {item.why ? ` — ${item.why}` : ""}
            </p>
          ))}
        </div>
      ) : null}

      {coach.headline || coach.why || coach.focus ? (
        <div className="home-coachline">
          {coach.headline ? <p><strong>{coach.headline}</strong></p> : null}
          {coach.why ? <p className="muted">{coach.why}</p> : null}
          {coach.focus ? <p className="muted">{coach.focus}</p> : null}
        </div>
      ) : null}

      {firstHref && firstSkill ? (
        <div className="cta-row">
          <Link className="btn btn-primary" href={firstHref}>
            Open {firstSkill}
          </Link>
        </div>
      ) : null}
    </article>
  );
}

export function ExpectedOutcomeCard({ today }: { today: SessionToday | null }) {
  if (!today) return null;
  const { certainties, projections } = today.expectedOutcome;
  if (certainties.length === 0 && projections.length === 0) return null;

  return (
    <article className="home-card">
      <p className="home-kicker">Expected outcome</p>
      {certainties.map((item, index) => (
        <p key={`c-${item.skill}-${index}`}>
          {item.skill ? <strong>{item.skill}. </strong> : null}
          {item.text}
        </p>
      ))}
      {projections.map((item, index) => (
        <p key={`p-${item.skill}-${index}`} className="muted">
          {item.skill ? `${item.skill}: ` : ""}
          {item.text}
        </p>
      ))}
    </article>
  );
}
