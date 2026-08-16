export function isCoachSpikeEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (env.COACH_SPIKE_ENABLED === "0") return false;
  if (env.COACH_SPIKE_ENABLED === "1") return true;
  return env.NODE_ENV !== "production";
}
