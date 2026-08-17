"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { apiRequest } from "@/lib/api/client";
import { decodeAchievements, decodeRecent } from "@/lib/api/activity";
import { clampSessionMinutes, decodeSessionToday, hasSession } from "@/lib/api/sessionToday";
import type { AchievementItem, RecentActivityItem, SessionToday } from "@/lib/api/types";
import type { HomeV2Payload } from "@/lib/home/types";
import {
  clampWeeklyGoal,
  readLocalPrefs,
  writeExamDate,
  writeSessionMinutes,
  writeWeeklyGoal,
} from "@/lib/home/prefs";
import { displayOverallLevel, shouldShowProgressRing } from "@/lib/api/progress";
import { TransitionBanner } from "./EstimatedSlpHero";
import { EmptyState, LoadingState } from "@/components/ui/ProductState";

const SKILL_HREF: Record<string, string> = {
  reading: "/reading/practice",
  listening: "/listening/practice",
  writing: "/writing/practice",
  speaking: "/speaking/practice",
};

function greetingForNow(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function HomeDashboard({
  initial,
  userId,
}: {
  initial: HomeV2Payload;
  userId: string | null;
}) {
  const [sessionToday, setSessionToday] = useState<SessionToday | null>(initial.sessionToday);
  const [prefs, setPrefs] = useState(() => ({
    weeklyGoalDays: 5,
    targetExamDate: "",
    minutes: initial.minutes,
  }));
  const [achievements, setAchievements] = useState<AchievementItem[] | null>(null);
  const [recent, setRecent] = useState<RecentActivityItem[] | null>(null);
  const [hello, setHello] = useState("Welcome back");
  const fetchedLazy = useRef(false);

  useEffect(() => {
    setPrefs(readLocalPrefs(userId));
    setHello(greetingForNow());
  }, [userId]);

  useEffect(() => {
    if (fetchedLazy.current) return;
    fetchedLazy.current = true;
    let cancelled = false;
    (async () => {
      try {
        const raw = await apiRequest<unknown>("/activity/achievements");
        if (!cancelled) setAchievements(decodeAchievements(raw));
      } catch {
        if (!cancelled) setAchievements([]);
      }
      try {
        const raw = await apiRequest<unknown>("/activity/recent?limit=20");
        if (!cancelled) setRecent(decodeRecent(raw));
      } catch {
        if (!cancelled) setRecent([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onMinutesChange(next: number) {
    const minutes = clampSessionMinutes(next);
    writeSessionMinutes(minutes);
    setPrefs((prev) => ({ ...prev, minutes }));
    try {
      const raw = await apiRequest<unknown>(`/session/today?minutes=${minutes}`);
      setSessionToday(decodeSessionToday(raw));
    } catch {
      /* keep the SSR mission */
    }
  }

  const name = initial.greetingName;
  const flagsDown = !initial.flags.reading_enabled && !initial.flags.listening_enabled && !initial.flags.writing_enabled;
  const today = hasSession(sessionToday) ? sessionToday : null;
  const block = today?.session.blocks[0];
  const href = block?.skill ? SKILL_HREF[block.skill] : undefined;
  const overall = initial.progress ? displayOverallLevel(initial.progress) : null;
  const showRing = shouldShowProgressRing(initial.progress);
  const plan = initial.entitlements.status === "ready" && initial.entitlements.isPro
    ? "SLP Command Professional"
    : "SLP Command Free";

  return (
    <div className="home briefing">
      <div>
        <p className="briefing-hello">
          {hello}
          {name ? `, ${name}` : ""}
        </p>
        {today ? (
          <section className="briefing-mission">
            <p className="section-eyebrow">Today’s mission</p>
            <h1>
              <span className="visually-hidden">
                {hello}
                {name ? `, ${name}` : ""}
              </span>
              {today.mission.headline || "Today’s session"}
            </h1>
            {today.mission.reason ? <p className="briefing-dek">{today.mission.reason}</p> : null}
            <div className="briefing-spec">
              {today.session.blocks.map((item, index) => (
                <span key={`${item.skill}-${index}`} className="home-block-head">
                  <strong className="home-skill-name">{item.skill}</strong>
                  {item.minutes != null ? <span className="home-chip">{item.minutes} min</span> : null}
                  {item.posture ? <span className="home-chip">{item.posture}</span> : null}
                </span>
              ))}
            </div>
            {block?.why ? <p>{block.why}</p> : null}
            {block?.focus ? <p className="muted">Focus: {block.focus}</p> : null}
            {today.mission.coachLine.headline ? (
              <p className="muted">
                <strong>{today.mission.coachLine.headline}</strong>
                {today.mission.coachLine.why ? ` — ${today.mission.coachLine.why}` : ""}
                {today.mission.coachLine.focus ? ` · ${today.mission.coachLine.focus}` : ""}
              </p>
            ) : null}
            {href && block ? (
              <Link className="btn btn-primary btn-command" href={href}>
                Open {block.skill}
              </Link>
            ) : null}
          </section>
        ) : (
          <header className="briefing-mission">
            <p className="section-eyebrow">Today</p>
            <h1>
              {hello}
              {name ? `, ${name}` : ""}
            </h1>
            <p className="muted">No mission card today. Progress and plan stay available.</p>
          </header>
        )}

        <div className="briefing-support">
          <TransitionBanner progress={initial.progress} />
          {today?.expectedOutcome.certainties.map((item, index) => (
            <p key={`c-${item.skill}-${index}`}>
              {item.skill ? <strong>{item.skill}. </strong> : null}
              {item.text}
            </p>
          ))}
          {today?.expectedOutcome.projections.map((item, index) => (
            <p key={`p-${item.skill}-${index}`} className="muted">
              {item.skill ? `${item.skill}: ` : ""}
              {item.text}
            </p>
          ))}
          {flagsDown ? <p className="muted">Some skill modules are temporarily off.</p> : null}
        </div>
      </div>

      <aside className="briefing-instruments">
        {initial.progress && showRing && overall != null ? (
          <div className="briefing-meter">
            <div>
              <p className="home-kicker">Estimated SLP</p>
              <p className="muted">Overall · all skills</p>
            </div>
            <strong aria-label={`Estimated SLP ${overall}`}>SLP {overall}</strong>
          </div>
        ) : null}
        {initial.progress ? (
          <div className="home-skill-minis">
            {(["reading", "listening", "writing", "speaking"] as const).map((skill) => {
              const row = initial.progress!.skills[skill];
              const level = row.level == null ? null : String(row.level);
              return (
                <div key={skill} className="home-skill-mini">
                  <span className="home-skill-name">{skill}</span>
                  <strong>{row.available && level ? `SLP ${level}` : "Not yet"}</strong>
                </div>
              );
            })}
          </div>
        ) : null}
        {initial.streak && (initial.streak.current != null || initial.streak.longest != null) ? (
          <div>
            <p className="home-kicker">Streak</p>
            <p className="home-stat">{initial.streak.current ?? 0} {(initial.streak.current ?? 0) === 1 ? "day" : "days"}</p>
            {initial.streak.longest != null ? <p className="muted">Longest: {initial.streak.longest}</p> : null}
          </div>
        ) : null}
        <div>
          <p className="home-kicker">Current plan</p>
          <p><strong>{plan}</strong></p>
          {initial.entitlements.status === "ready" && initial.entitlements.isPro ? (
            <p className="muted">Subscriptions are managed in the iOS app.</p>
          ) : (
            <p className="muted">
              <strong>SLP Command Professional</strong> — unlimited practice, feedback and exams in the iOS app.
            </p>
          )}
        </div>
      </aside>

      <details className="briefing-details">
        <summary>Pace and evidence</summary>
        <div className="briefing-evidence">
          <div>
            <label htmlFor="weekly-goal">Practice days each week</label>
            <select
              id="weekly-goal"
              value={prefs.weeklyGoalDays}
              onChange={(e) => {
                const days = clampWeeklyGoal(e.target.value);
                setPrefs((prev) => ({ ...prev, weeklyGoalDays: days }));
                if (userId) writeWeeklyGoal(userId, days);
              }}
            >
              {[3, 4, 5, 6, 7].map((n) => (
                <option key={n} value={n}>{n} days</option>
              ))}
            </select>
            <label htmlFor="exam-date">Target exam date</label>
            <input
              id="exam-date"
              type="date"
              value={prefs.targetExamDate}
              onChange={(e) => {
                setPrefs((prev) => ({ ...prev, targetExamDate: e.target.value }));
                if (userId) writeExamDate(userId, e.target.value);
              }}
            />
            <label htmlFor="session-minutes">Preferred session length (minutes)</label>
            <input
              id="session-minutes"
              type="number"
              min={5}
              max={120}
              value={prefs.minutes}
              onChange={(e) => {
                const minutes = clampSessionMinutes(e.target.value);
                setPrefs((prev) => ({ ...prev, minutes }));
              }}
              onBlur={(e) => {
                void onMinutesChange(Number(e.target.value));
              }}
            />
            <p className="muted">Changing the length asks the backend for a new today session. Other cards stay as first loaded.</p>
          </div>
          <div>
            <p className="home-kicker">Achievements</p>
            {achievements == null ? (
              <LoadingState label="Loading…" lines={2} />
            ) : achievements.length === 0 ? (
              <EmptyState title="No achievements yet" body="They appear here when the backend records them." />
            ) : (
              <ul className="home-list">
                {achievements.slice(0, 6).map((item) => (
                  <li key={item.id}>
                    <strong>{item.title}</strong>
                    {item.earnedAt ? <span className="muted"> · {item.earnedAt}</span> : null}
                  </li>
                ))}
              </ul>
            )}
            <p className="home-kicker" style={{ marginTop: 24 }}>Recent activity</p>
            {recent == null ? (
              <LoadingState label="Loading…" lines={2} />
            ) : recent.length === 0 ? (
              <EmptyState title="No recent activity" body="Completed work from the backend will list here." />
            ) : (
              <ul className="home-list">
                {recent.map((item) => (
                  <li key={item.id}>
                    {item.skill ? <span className="home-chip">{item.skill}</span> : null} {item.title}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </details>
    </div>
  );
}
