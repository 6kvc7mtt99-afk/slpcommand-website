import { cache } from "react";
import { interpretCoachReadiness } from "@/lib/coach/readiness";
import { backendJson } from "./backend";

export type CoachAvailability = { available: boolean };

/** SSR read of the Coach's availability for the Speaking hub. Fails closed. */
export const loadCoachAvailability = cache(async (): Promise<CoachAvailability> => {
  const result = await backendJson<unknown>({
    path: "/api/speaking/coach/readiness",
    cache: "no-store",
  });
  return interpretCoachReadiness(result.status, result.data);
});
