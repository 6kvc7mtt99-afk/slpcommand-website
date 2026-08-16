export type EntitlementsSnapshot = {
  ok?: boolean;
  plan?: { key?: string; name?: string } | null;
  features?: Array<{
    key: string;
    enabled?: boolean;
    quota?: { period?: string; limit?: number | null; remaining?: number | null } | null;
  }>;
};

export type EntitlementsState =
  | { status: "loading" }
  | { status: "ready"; snapshot: EntitlementsSnapshot; isPro: boolean }
  | { status: "noPlan" }
  | { status: "error" };

export function interpretEntitlements(status: number, body: EntitlementsSnapshot | null): EntitlementsState {
  if (status === 404) return { status: "noPlan" };
  if (status === 401) return { status: "error" };
  if (status >= 400 || !body) return { status: "noPlan" };
  const isPro = body.plan?.key === "pro";
  return { status: "ready", snapshot: body, isPro };
}

export function planLabel(state: EntitlementsState): string {
  if (state.status === "ready" && state.isPro) return "SLP Command Pro";
  return "SLP Command Free";
}

export function featureAccess(
  state: EntitlementsState,
  key: string,
): { usable: boolean; remaining: number | null; limit: number | null; period: string | null } {
  if (state.status !== "ready") {
    return { usable: false, remaining: null, limit: null, period: null };
  }
  const feature = state.snapshot.features?.find((item) => item.key === key);
  if (!feature || feature.enabled === false) {
    return { usable: false, remaining: null, limit: null, period: null };
  }
  const quota = feature.quota;
  if (quota && quota.period !== "unlimited" && typeof quota.remaining === "number" && quota.remaining <= 0) {
    return { usable: false, remaining: 0, limit: quota.limit ?? null, period: quota.period ?? null };
  }
  return {
    usable: true,
    remaining: quota?.remaining ?? null,
    limit: quota?.limit ?? null,
    period: quota?.period ?? null,
  };
}
