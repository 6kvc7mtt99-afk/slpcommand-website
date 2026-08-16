"use client";

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
import { ConfidenceScaleCard, EstimatedSlpHero, TransitionBanner } from "./EstimatedSlpHero";
import { PlanChip } from "./PlanChip";
import { StreakCard } from "./StreakCard";
import { ExpectedOutcomeCard, TodaySessionCard } from "./TodaySessionCard";

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
      /* keep the SSR mission; minutes preference is still saved */
    }
  }

  const name = initial.greetingName;
  const flagsDown = !initial.flags.reading_enabled && !initial.flags.listening_enabled && !initial.flags.writing_enabled;

  return (
    <div className="home">
      <header className="home-greeting">
        <p className="section-eyebrow">Today</p>
        <h1>
          {hello}
          {name ? `, ${name}` : ""}
        </h1>
        <p className="muted">
          {hasSession(sessionToday)
            ? "Your session is ready. Nothing here is estimated beyond what the backend returned."
            : "No mission card today. Progress and plan stay available."}
        </p>
        {flagsDown ? <p className="muted">Some skill modules are temporarily off.</p> : null}
      </header>

      <TodaySessionCard today={sessionToday} />
      <ExpectedOutcomeCard today={sessionToday} />
      <TransitionBanner progress={initial.progress} />
      <EstimatedSlpHero progress={initial.progress} />
      <ConfidenceScaleCard progress={initial.progress} />
      <PlanChip entitlements={initial.entitlements} />
      <StreakCard streak={initial.streak} />

      <article className="home-card">
        <p className="home-kicker">Daily goal</p>
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
            <option key={n} value={n}>
              {n} days
            </option>
          ))}
        </select>
      </article>

      <article className="home-card">
        <p className="home-kicker">Pace</p>
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
      </article>

      <article className="home-card">
        <p className="home-kicker">Achievements</p>
        {achievements == null ? (
          <p className="muted">Loading…</p>
        ) : achievements.length === 0 ? (
          <p className="muted">No achievements to show yet.</p>
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
      </article>

      <article className="home-card">
        <p className="home-kicker">Recent activity</p>
        {recent == null ? (
          <p className="muted">Loading…</p>
        ) : recent.length === 0 ? (
          <p className="muted">No recent activity.</p>
        ) : (
          <ul className="home-list">
            {recent.map((item) => (
              <li key={item.id}>
                {item.skill ? <span className="home-chip">{item.skill}</span> : null} {item.title}
              </li>
            ))}
          </ul>
        )}
      </article>
    </div>
  );
}
