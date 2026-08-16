import { asNumber, asString, isRecord, pickAlias } from "./decode";
import type { AchievementItem, RecentActivityItem, StreakSnapshot } from "./types";

export function decodeStreak(raw: unknown, timezone: string): StreakSnapshot | null {
  if (!isRecord(raw)) return null;
  const current = pickAlias(raw, "current", "currentStreak", "days", "count");
  const longest = pickAlias(raw, "longest", "longestStreak", "best");
  if (current == null && longest == null && raw.streak == null) {
    if (typeof raw.ok === "boolean" && raw.ok === false) return null;
  }
  return {
    current: current == null ? null : asNumber(current, 0),
    longest: longest == null ? null : asNumber(longest, 0),
    timezone: asString(pickAlias(raw, "timezone", "timeZone"), timezone),
  };
}

function listOf(raw: unknown, ...keys: string[]): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (!isRecord(raw)) return [];
  for (const key of keys) {
    const value = raw[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}

export function decodeAchievements(raw: unknown): AchievementItem[] {
  return listOf(raw, "achievements", "items", "data")
    .filter(isRecord)
    .map((item, index) => ({
      id: asString(pickAlias(item, "id", "key"), `achievement-${index}`),
      title: asString(pickAlias(item, "title", "name", "headline")),
      earnedAt: (() => {
        const value = pickAlias(item, "earnedAt", "unlockedAt", "createdAt");
        return value == null ? null : asString(value);
      })(),
    }))
    .filter((item) => item.title);
}

export function decodeRecent(raw: unknown): RecentActivityItem[] {
  return listOf(raw, "recent", "items", "activities", "data")
    .filter(isRecord)
    .map((item, index) => ({
      id: asString(pickAlias(item, "id", "key"), `recent-${index}`),
      title: asString(pickAlias(item, "title", "headline", "summary", "label")),
      skill: asString(pickAlias(item, "skill", "type")),
      at: (() => {
        const value = pickAlias(item, "at", "createdAt", "occurredAt", "timestamp");
        return value == null ? null : asString(value);
      })(),
    }))
    .filter((item) => item.title)
    .slice(0, 5);
}
