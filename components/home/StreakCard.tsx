import type { StreakSnapshot } from "@/lib/api/types";

export function StreakCard({ streak }: { streak: StreakSnapshot | null }) {
  if (!streak || (streak.current == null && streak.longest == null)) return null;

  return (
    <article className="home-card">
      <p className="home-kicker">Streak</p>
      <p className="home-stat">{streak.current ?? 0} {(streak.current ?? 0) === 1 ? "day" : "days"}</p>
      {streak.longest != null ? <p className="muted">Longest: {streak.longest}</p> : null}
    </article>
  );
}
