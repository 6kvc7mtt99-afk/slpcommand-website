"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { apiRequest } from "@/lib/api/client";
import { usePlan } from "@/components/app/PlanProvider";
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
import { TrainingPreview } from "@/components/skill/TrainingPreview";
import { ReadinessInstrument, type InstrumentSkill } from "@/components/instrument/ReadinessInstrument";
import { useTilt } from "@/components/ui/useTilt";

const SKILLS = ["reading", "listening", "writing", "speaking"] as const;

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
  // Four doors, four hooks — SKILLS is a fixed-length tuple, so this stays
  // an unconditional, fixed number of hook calls rather than one per
  // .map() iteration.
  const readingTilt = useTilt<HTMLAnchorElement>();
  const listeningTilt = useTilt<HTMLAnchorElement>();
  const writingTilt = useTilt<HTMLAnchorElement>();
  const speakingTilt = useTilt<HTMLAnchorElement>();
  const tiltRefs: Record<(typeof SKILLS)[number], (node: HTMLAnchorElement | null) => void> = {
    reading: readingTilt,
    listening: listeningTilt,
    writing: writingTilt,
    speaking: speakingTilt,
  };

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
  // Was computed here, in its own vocabulary ("SLP Command Professional"),
  // from a snapshot frozen at page load. Two problems, both commercial: the
  // master plan fixes the display names as "SLP Command Pro" / "SLP Command
  // Free", and an entitlements read that failed was rendered as Free — telling
  // a subscriber they are not one. One shared, honest state now.
  // The SSR snapshot this page was rendered with is the fallback: on its own
  // the card still states the plan the server sent, and inside the app shell
  // the shared state — which can be re-read after a purchase — wins.
  const { display: planDisplayed } = usePlan(initial.entitlements);

  const blocks = today?.session.blocks ?? [];

  // The instrument reads the same measured payload the ladder did. A skill
  // the backend has not measured passes null and draws only its empty
  // track — never a zero that could be mistaken for a score.
  const instrumentSkills: InstrumentSkill[] = SKILLS.map((skill) => {
    const row = initial.progress?.skills[skill];
    const value = row?.available && row.level != null ? Number(row.level) : NaN;
    return { key: skill, label: skill, level: Number.isFinite(value) ? value : null };
  });
  const overallNum = overall == null ? null : Number(overall);
  // targetLevel is a string on the wire. Number("") is 0 and passes
  // isFinite, which drew a target marker at zero on any account whose
  // target the backend had not set — a scale reading that was simply
  // false. Blank must mean "no target", not "target 0".
  const targetRaw = (initial.progress?.targetLevel ?? "").toString().trim();
  const targetParsed = targetRaw === "" ? NaN : Number(targetRaw);
  const targetNum = Number.isFinite(targetParsed) && targetParsed > 0 ? targetParsed : null;

  return (
    <div className="home">
      <section className="p-hero" data-enter>
        <div>
          <p className="p-eyebrow">
            {hello}
            {name ? `, ${name}` : ""}
          </p>
          {today ? (
            <>
              <h1 className="p-hero-title">{today.mission.headline || "Today’s session"}</h1>
              {today.mission.reason ? <p className="p-lead">{today.mission.reason}</p> : null}
              {blocks.length ? (
                <div className="p-mission-blocks">
                  {blocks.map((item, index) => (
                    <span key={`${item.skill}-${index}`} className="p-block" data-skill={item.skill}>
                      <span className="p-block-dot" aria-hidden="true" />
                      <b>{item.skill}</b>
                      {item.minutes != null ? <span>{item.minutes} min</span> : null}
                      {item.posture ? <span className="p-block-posture">{item.posture}</span> : null}
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="p-hero-actions">
                {href && block ? (
                  <Link className="btn btn-primary btn-hero" href={href}>
                    Start with {block.skill}
                    <span className="p-arrow" aria-hidden="true">→</span>
                  </Link>
                ) : null}
                {initial.progress && showRing && overall != null ? (
                  <p className="p-hero-stat">
                    <b aria-label={`Estimated SLP ${overall}`}>SLP {overall}</b>
                    <span>estimated · all skills</span>
                  </p>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <h1 className="p-hero-title">
                {hello}
                {name ? `, ${name}` : ""}
              </h1>
              <p className="p-lead">
                No mission was composed for today. Pick any skill below — your standing and plan stay available.
              </p>
              <div className="p-hero-actions">
                <Link className="btn btn-primary btn-hero" href="/reading/practice">
                  Start reading
                  <span className="p-arrow" aria-hidden="true">→</span>
                </Link>
              </div>
            </>
          )}
        </div>

        <aside className="p-instrument-bay" aria-label="Readiness">
          <ReadinessInstrument
            skills={instrumentSkills}
            overall={overallNum}
            target={targetNum}
            size={430}
          />
          <dl className="p-status-rows p-instrument-rows">
            {initial.streak && initial.streak.current != null ? (
              <div>
                <dt>Streak</dt>
                <dd className="p-num">
                  {initial.streak.current} {initial.streak.current === 1 ? "day" : "days"}
                  {initial.streak.longest != null ? (
                    <span className="p-status-sub">Longest: {initial.streak.longest}</span>
                  ) : null}
                </dd>
              </div>
            ) : null}
            {initial.progress?.totalExercises ? (
              <div>
                <dt>Evidence</dt>
                <dd className="p-num">{initial.progress.totalExercises} recorded</dd>
              </div>
            ) : null}
            <div>
              <dt>Plan</dt>
              <dd>{planDisplayed.label}</dd>
            </div>
          </dl>
        </aside>
      </section>

      {today && (today.expectedOutcome.certainties.length > 0 || today.expectedOutcome.projections.length > 0 || block?.why) ? (
        <section className="p-section" data-reveal>
          <div className="p-section-head">
            <div>
              <h2>What this session should move</h2>
              <p>Composed by the backend from your evidence — not a generic plan.</p>
            </div>
          </div>
          <div className="p-outcomes">
            {block?.why ? (
              <p className="p-outcome-lead">
                {block.why}
                {block.focus ? <span className="p-outcome-focus">Focus · {block.focus}</span> : null}
              </p>
            ) : null}
            {/*
              The backend already writes the skill name into `text` as a
              natural sentence ("Reading: 8 more answers behind the
              estimate."), so nothing here re-states it.
            */}
            {today.expectedOutcome.certainties.map((item, index) => (
              <p key={`c-${item.skill}-${index}`} className="p-outcome">
                <span className="p-outcome-mark is-certain" aria-hidden="true" />
                {item.text}
              </p>
            ))}
            {today.expectedOutcome.projections.map((item, index) => (
              <p key={`p-${item.skill}-${index}`} className="p-outcome is-soft">
                <span className="p-outcome-mark" aria-hidden="true" />
                {item.text}
              </p>
            ))}
          </div>
        </section>
      ) : null}

      <section className="p-section" aria-label="Training modes">
        <div className="p-section-head" data-reveal style={{ ["--i" as string]: 0 }}>
          <div>
            <h2>Continue training</h2>
            <p>Four skills, each with its own practice, exam, curriculum and evidence.</p>
          </div>
        </div>
        <div className="p-rail">
          {SKILLS.map((skill, index) => {
            const row = initial.progress?.skills[skill];
            const measured = row?.available && row.level != null;
            return (
              <Link
                key={skill}
                href={`/${skill}`}
                className={`p-dest skill-${skill}`}
                data-reveal
                style={{ ["--i" as string]: index + 1 }}
                ref={tiltRefs[skill]}
              >
                <div className="p-dest-stage">
                  <TrainingPreview kind={skill} />
                </div>
                <div className="p-dest-body">
                  <p className="p-dest-label">{measured ? `SLP ${row!.level}` : "No level yet"}</p>
                  <h3 style={{ textTransform: "capitalize" }}>{skill}</h3>
                  <p className="p-dest-go">
                    Open {skill}
                    <span className="p-arrow" aria-hidden="true">→</span>
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="briefing-support">
        <TransitionBanner progress={initial.progress} />
        {flagsDown ? <p className="muted">Some skill modules are temporarily off.</p> : null}
      </div>

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
