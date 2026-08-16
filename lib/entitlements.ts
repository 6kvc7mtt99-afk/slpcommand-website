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
