/**
 * WHAT THE BACKEND SAID ABOUT THIS ACCOUNT — and nothing else.
 *
 * `GET /api/entitlements` is advisory. The real gate is `requireFeature` /
 * `consume_quota` on Express, and for server-rendered premium content it is the
 * server component that reads this module before deciding what to render. This
 * file computes nothing, stores nothing and grants nothing: it interprets one
 * response so the product has a single vocabulary for a plan.
 *
 * MODEL B, in one sentence: `user_plans` — written only by a signed billing
 * webhook — is the authority. The browser mirrors it. There is no code path,
 * here or anywhere, that turns a client-side value into access.
 */

/**
 * The one plan key that means "paid", in the one place it is written.
 *
 * It has to match `user_plans.plan_key` on the backend, so it is a constant
 * rather than a literal sprinkled through screens: a paywall that disagrees
 * with itself about what "Pro" is called is a paywall with a hole in it.
 */
export const PRO_PLAN_KEY = "pro";

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
  // 404 is the backend ANSWERING: "No active plan found for this account."
  // That is a fact about the account, and the fact is Free.
  if (status === 404) return { status: "noPlan" };
  // Everything else that failed is an absence of an answer, not an answer.
  // This used to fold 5xx into `noPlan`, which grants nothing — correct — but
  // then rendered a server outage to a paying subscriber as "SLP Command
  // Free". Access still fails closed either way; only the claim changes.
  if (status >= 400) return { status: "error" };
  if (!body) return { status: "error" };
  const isPro = body.plan?.key === PRO_PLAN_KEY;
  return { status: "ready", snapshot: body, isPro };
}

/** True only when the backend itself said this account is on the paid plan. */
export function isEntitledToPro(state: EntitlementsState): boolean {
  return state.status === "ready" && state.isPro;
}

export type PlanDisplay = {
  label: string;
  /**
   * Whether the label is a fact or a placeholder.
   *
   * Failing CLOSED on access and failing HONEST on display are different
   * duties. A 5xx on the entitlements read must never unlock anything — and it
   * must not tell a paying subscriber they are on Free either, which is what
   * collapsing every non-Pro state into "Free" used to do. `noPlan` is not that
   * case: the backend answering "no active plan for this account" IS Free.
   */
  known: boolean;
};

export function planDisplay(state: EntitlementsState): PlanDisplay {
  if (state.status === "ready") {
    return { label: state.isPro ? "SLP Command Pro" : "SLP Command Free", known: true };
  }
  if (state.status === "noPlan") return { label: "SLP Command Free", known: true };
  if (state.status === "loading") return { label: "Checking your plan…", known: false };
  return { label: "Plan unavailable", known: false };
}

export function planLabel(state: EntitlementsState): string {
  return planDisplay(state).label;
}

export type FeatureAccess = {
  usable: boolean;
  remaining: number | null;
  limit: number | null;
  period: string | null;
  /**
   * WHY it is unusable, so a screen can say the true thing.
   *
   * A spent weekly allowance and a feature the plan never included both arrive
   * as `usable: false`, and telling someone who used their ten passages that
   * the feature is "not on your plan" is simply false. `unknown` is the third
   * case: the snapshot never loaded, so the screen may block but must not
   * claim a reason.
   */
  reason: "ok" | "spent" | "notOnPlan" | "unknown";
};

const UNKNOWN: FeatureAccess = { usable: false, remaining: null, limit: null, period: null, reason: "unknown" };

/**
 * Does the snapshot DESCRIBE this feature at all?
 *
 * `featureAccess` returns `reason: "notOnPlan"` both for a feature the plan
 * explicitly disables and for one the payload simply never mentions — which is
 * correct for gating (absent means not granted, fail closed) but wrong for
 * choosing which meter to read.
 *
 * Reading and Listening exams are metered by their own `*_exam_simulation`
 * credits; Writing and Speaking were reading their `*_ai_feedback` key
 * instead, so a spent evaluation allowance locked an untouched exam credit and
 * vice versa. Fixing that means switching to the exam key — but if a live plan
 * payload does not enumerate it, switching blind would lock the exam for
 * everyone. This lets a caller ask the one question that separates the two:
 * "did the server tell me about this feature?" If it did, meter against it. If
 * it did not, keep the previous behaviour rather than inventing a refusal.
 *
 * It is deliberately NOT an access check and grants nothing — the server still
 * decides, here via `featureAccess` and upstream via `requireFeature` /
 * `consume_quota`.
 */
export function featureIsDescribed(state: EntitlementsState, key: string): boolean {
  if (state.status !== "ready") return false;
  return Boolean(state.snapshot.features?.some((item) => item.key === key));
}

export function featureAccess(state: EntitlementsState, key: string): FeatureAccess {
  if (state.status !== "ready") {
    // noPlan is a real answer — the account is on Free and this feature is not
    // in it. loading/error are genuinely unknown.
    return state.status === "noPlan" ? { ...UNKNOWN, reason: "notOnPlan" } : UNKNOWN;
  }
  const feature = state.snapshot.features?.find((item) => item.key === key);
  if (!feature || feature.enabled === false) {
    return { usable: false, remaining: null, limit: null, period: null, reason: "notOnPlan" };
  }
  const quota = feature.quota;
  if (quota && quota.period !== "unlimited" && typeof quota.remaining === "number" && quota.remaining <= 0) {
    return {
      usable: false,
      remaining: 0,
      limit: quota.limit ?? null,
      period: quota.period ?? null,
      reason: "spent",
    };
  }
  return {
    usable: true,
    remaining: quota?.remaining ?? null,
    limit: quota?.limit ?? null,
    period: quota?.period ?? null,
    reason: "ok",
  };
}
