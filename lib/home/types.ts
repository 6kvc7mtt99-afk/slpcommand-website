import type {
  FeatureFlags,
  ProgressResponse,
  SessionToday,
  StreakSnapshot,
} from "@/lib/api/types";
import type { EntitlementsState } from "@/lib/entitlements";

export type HomeV2Payload = {
  flags: FeatureFlags;
  entitlements: EntitlementsState;
  progress: ProgressResponse | null;
  sessionToday: SessionToday | null;
  streak: StreakSnapshot | null;
  greetingName: string | null;
  timezone: string;
  minutes: number;
};
