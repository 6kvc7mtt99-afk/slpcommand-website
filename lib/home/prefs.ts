import { clampSessionMinutes, DEFAULT_SESSION_MINUTES } from "@/lib/api/sessionToday";

export const WEEKLY_GOAL_DEFAULT = 5;
export const WEEKLY_GOAL_MIN = 3;
export const WEEKLY_GOAL_MAX = 7;

export function weeklyGoalKey(userId: string): string {
  return `weekly_goal_days:${userId}`;
}

export function examDateKey(userId: string): string {
  return `target_exam_date:${userId}`;
}

export const SESSION_MINUTES_KEY = "session_preferred_minutes";

export function clampWeeklyGoal(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return WEEKLY_GOAL_DEFAULT;
  return Math.min(WEEKLY_GOAL_MAX, Math.max(WEEKLY_GOAL_MIN, Math.round(n)));
}

function storageGet(key: string): string | null {
  try {
    return window.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function storageSet(key: string, value: string): void {
  try {
    window.localStorage?.setItem(key, value);
  } catch {
    /* private mode / missing storage */
  }
}

export function readLocalPrefs(userId: string | null): {
  weeklyGoalDays: number;
  targetExamDate: string;
  minutes: number;
} {
  if (typeof window === "undefined") {
    return { weeklyGoalDays: WEEKLY_GOAL_DEFAULT, targetExamDate: "", minutes: DEFAULT_SESSION_MINUTES };
  }
  const minutesRaw = storageGet(SESSION_MINUTES_KEY);
  const weeklyRaw = userId ? storageGet(weeklyGoalKey(userId)) : null;
  const examRaw = userId ? storageGet(examDateKey(userId)) : null;
  return {
    weeklyGoalDays: clampWeeklyGoal(weeklyRaw ?? WEEKLY_GOAL_DEFAULT),
    targetExamDate: examRaw ?? "",
    minutes: clampSessionMinutes(minutesRaw ?? DEFAULT_SESSION_MINUTES),
  };
}

export function writeWeeklyGoal(userId: string, days: number): void {
  storageSet(weeklyGoalKey(userId), String(clampWeeklyGoal(days)));
}

export function writeExamDate(userId: string, iso: string): void {
  storageSet(examDateKey(userId), iso);
}

export function writeSessionMinutes(minutes: number): void {
  storageSet(SESSION_MINUTES_KEY, String(clampSessionMinutes(minutes)));
}
