import Link from "next/link";
import type { MissionItem, ReadinessCard, WeaknessItem } from "@/lib/api/intelligence";

export function ReadinessCardView({ card }: { card: ReadinessCard }) {
  return (
    <article className="home-card">
      <p className="home-kicker">Where you are</p>
      <div className="home-slp-top">
        <div>
          <h2>{card.label}</h2>
          <p className="muted">This is a readiness score, not Estimated SLP.</p>
          {card.milestone ? <p>{card.milestone}</p> : null}
          <p className="muted">{card.totalAttempts} attempts recorded by the backend.</p>
        </div>
        <div className="home-ring" aria-label={`Readiness ${card.readiness}`}>
          {card.readiness}
        </div>
      </div>
    </article>
  );
}

export function MissionsSection({
  missions,
  hrefFor,
  locked,
}: {
  missions: MissionItem[];
  hrefFor?: (mission: MissionItem) => string;
  locked?: boolean;
}) {
  if (locked) {
    return (
      <article className="home-card">
        <p className="home-kicker">What to do next</p>
        <p className="muted">Adaptive missions are included in SLP Command Pro.</p>
      </article>
    );
  }
  return (
    <article className="home-card">
      <p className="home-kicker">What to do next</p>
      {missions.length ? (
        <ul className="home-blocks">
          {missions.map((mission) => (
            <li key={mission.title}>
              <strong>{mission.title}</strong>
              <p className="muted">{mission.description || mission.reason}</p>
              {hrefFor ? (
                <Link className="btn btn-outline" href={hrefFor(mission)}>
                  Continue
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">No missions from the backend right now.</p>
      )}
    </article>
  );
}

export function WeaknessSection({ items, hrefFor }: { items: WeaknessItem[]; hrefFor?: (item: WeaknessItem) => string }) {
  return (
    <article className="home-card">
      <p className="home-kicker">What you are weak at</p>
      {items.length ? (
        <ul className="home-blocks">
          {items.map((item) => (
            <li key={item.key || item.label}>
              <strong>{item.label || item.key}</strong>
              <p className="muted">
                {item.reportable && item.accuracy != null
                  ? `${Math.round(item.accuracy * (item.accuracy <= 1 ? 100 : 1))}% on ${item.attempts} attempts`
                  : `Measured on ${item.attempts} attempts — too few to state a level yet.`}
                {item.trend ? ` · ${item.trend}` : ""}
              </p>
              {hrefFor ? (
                <Link href={hrefFor(item)}>Study this</Link>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">No weakness profile yet.</p>
      )}
    </article>
  );
}

export function IntelligenceError({ message }: { message: string }) {
  return (
    <article className="home-card" role="alert">
      <p className="home-kicker">Intelligence</p>
      <p className="muted">{message}</p>
    </article>
  );
}
