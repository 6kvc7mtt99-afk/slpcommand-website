import { cache } from "react";
import { decodeStreak } from "@/lib/api/activity";
import { decodeFeatureFlags } from "@/lib/api/featureFlags";
import { decodeProgress } from "@/lib/api/progress";
import { clampSessionMinutes, decodeSessionToday, DEFAULT_SESSION_MINUTES } from "@/lib/api/sessionToday";
import type { FeatureFlags, ProgressResponse, SessionToday, StreakSnapshot } from "@/lib/api/types";
import type { HomeV2Payload } from "@/lib/home/types";
import { interpretEntitlements, type EntitlementsSnapshot, type EntitlementsState } from "@/lib/entitlements";
import { backendJson } from "./backend";

export type { HomeV2Payload };

export const loadEntitlements = cache(async (): Promise<EntitlementsState> => {
  const result = await backendJson<EntitlementsSnapshot>({
    path: "/api/entitlements",
    cache: "no-store",
  });
  return interpretEntitlements(result.status, result.data);
});

export const loadFeatureFlags = cache(async (): Promise<FeatureFlags> => {
  const result = await backendJson<unknown>({
    path: "/api/feature-flags",
    revalidate: 30,
  });
  if (result.status >= 400) return decodeFeatureFlags(null);
  return decodeFeatureFlags(result.data);
});

export const loadProgress = cache(async (): Promise<ProgressResponse | null> => {
  const result = await backendJson<unknown>({
    path: "/api/progress",
    cache: "no-store",
  });
  if (result.status >= 400) return null;
  return decodeProgress(result.data);
});

export async function loadSessionToday(minutes = DEFAULT_SESSION_MINUTES): Promise<SessionToday | null> {
  const clamped = clampSessionMinutes(minutes);
  const result = await backendJson<unknown>({
    path: "/api/session/today",
    search: `?minutes=${clamped}`,
    cache: "no-store",
  });
  if (result.status >= 400) return null;
  return decodeSessionToday(result.data);
}

export async function loadStreak(timezone: string): Promise<StreakSnapshot | null> {
  const result = await backendJson<unknown>({
    path: "/api/activity/streak",
    search: `?timezone=${encodeURIComponent(timezone)}`,
    cache: "no-store",
  });
  if (result.status >= 400) return null;
  return decodeStreak(result.data, timezone);
}

export async function loadHomeV2(input: {
  timezone: string;
  minutes?: number;
  greetingName?: string | null;
}): Promise<HomeV2Payload> {
  const minutes = clampSessionMinutes(input.minutes ?? DEFAULT_SESSION_MINUTES);
  const [flags, entitlements, progress, sessionToday, streak] = await Promise.all([
    loadFeatureFlags(),
    loadEntitlements(),
    loadProgress(),
    loadSessionToday(minutes),
    loadStreak(input.timezone),
  ]);
  return {
    flags,
    entitlements,
    progress,
    sessionToday,
    streak,
    greetingName: input.greetingName ?? null,
    timezone: input.timezone,
    minutes,
  };
}


