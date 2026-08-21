import { cache } from "react";
import { academyTargetLevel } from "@/lib/api/academy";
import { backendJson } from "./backend";

/**
 * The learner's target level is a single product-wide fact, and
 * /api/profile is the only endpoint that can actually change it (Settings'
 * PATCH) — so it is the one place every surface reads it from. This used
 * to read /api/progress's own copy of the same fact instead; that copy
 * currently agrees with profile, but nothing enforced that, and Writing's
 * learning-state model has its own third copy that currently doesn't
 * agree (it tracks a full SLP 1+->3 competency ladder, not the learner's
 * chosen target — see app/(app)/writing/intelligence/page.tsx).
 *
 * Returns null, never a guessed level, when the real value can't be read.
 */
export const loadTargetLevel = cache(async (): Promise<"2" | "3" | null> => {
  const result = await backendJson<{ target_level?: string }>({
    path: "/api/profile",
    cache: "no-store",
  });
  if (result.status >= 400 || !result.data) return null;
  return academyTargetLevel(result.data.target_level);
});
