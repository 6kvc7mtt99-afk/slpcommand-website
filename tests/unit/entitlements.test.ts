import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  featureAccess,
  interpretEntitlements,
  isEntitledToPro,
  planDisplay,
  planLabel,
  PRO_PLAN_KEY,
} from "../../lib/entitlements";
import { decidePolicy } from "../../lib/server/proxyPolicy";

describe("entitlements", () => {
  it("treats 404 as noPlan, not logout", () => {
    expect(interpretEntitlements(404, null)).toEqual({ status: "noPlan" });
    expect(planLabel({ status: "noPlan" })).toBe("SLP Command Free");
  });

  it("is Pro only when plan.key is pro", () => {
    const state = interpretEntitlements(200, { plan: { key: "pro", name: "Pro" }, features: [] });
    expect(state.status).toBe("ready");
    if (state.status === "ready") expect(state.isPro).toBe(true);
    expect(planLabel(state)).toBe("SLP Command Pro");
  });

  it("fail-closes unknown keys as Free", () => {
    const state = interpretEntitlements(200, { plan: { key: "team" }, features: [] });
    if (state.status === "ready") expect(state.isPro).toBe(false);
  });

  it("does not treat remaining as locally computed when the snapshot says zero", () => {
    const state = interpretEntitlements(200, {
      plan: { key: "free" },
      features: [{ key: "reading_practice", enabled: true, quota: { period: "weekly", remaining: 0, limit: 10 } }],
    });
    expect(featureAccess(state, "reading_practice")).toMatchObject({ usable: false, remaining: 0 });
    expect(featureAccess({ status: "noPlan" }, "reading_practice").usable).toBe(false);
  });
});

/**
 * MODEL B, locked.
 *
 * The backend's `user_plans` — written only by a signed webhook — is the sole
 * authority on what a learner has paid for. The browser reads
 * `GET /entitlements` and renders it; it never grants, never computes and
 * never unlocks. PR-21 (web billing paywall) is still blocked on Q4, and when
 * it lands it must not weaken any of this, so the invariant is a test rather
 * than a comment.
 */
describe("Model B — the client never unlocks", () => {
  it("derives Pro from the plan key alone, and from nothing local", () => {
    // The key is written once, as a constant, so a screen cannot disagree with
    // the module about what "Pro" is called.
    expect(PRO_PLAN_KEY).toBe("pro");
    const source = readFileSync("lib/entitlements.ts", "utf8");
    expect(source).toContain("body.plan?.key === PRO_PLAN_KEY");
    // No local grant, no override, no trial clock, no stored flag.
    expect(source).not.toMatch(/(local|session)Storage/);
    expect(source).not.toMatch(/Date\.now|new Date\(/);
    expect(source).not.toMatch(/isPro\s*=\s*true/);
  });

  it("never treats a failed or missing snapshot as a grant", () => {
    for (const state of [
      interpretEntitlements(500, null),
      interpretEntitlements(404, null),
      interpretEntitlements(401, null),
      interpretEntitlements(200, null),
      interpretEntitlements(503, { plan: { key: "pro" } }),
    ]) {
      expect(isEntitledToPro(state)).toBe(false);
      expect(planLabel(state)).not.toBe("SLP Command Pro");
      expect(featureAccess(state, "adaptive_coach").usable).toBe(false);
    }
  });

  it("fails closed on access but honest on display", () => {
    // These two duties are different. A read that never landed must unlock
    // nothing — and must not tell a paying subscriber they are on Free, which
    // is what collapsing every non-Pro state into "Free" used to do.
    expect(planDisplay({ status: "error" })).toEqual({ label: "Plan unavailable", known: false });
    expect(planDisplay({ status: "loading" }).known).toBe(false);
    // "No active plan found for this account" IS Free — that one is a fact.
    expect(planDisplay({ status: "noPlan" })).toEqual({ label: "SLP Command Free", known: true });
    expect(isEntitledToPro({ status: "error" })).toBe(false);
  });

  it("says why a feature is unusable, so a screen can state the true reason", () => {
    const spent = interpretEntitlements(200, {
      plan: { key: "free" },
      features: [{ key: "reading_practice", enabled: true, quota: { period: "weekly", remaining: 0, limit: 10 } }],
    });
    expect(featureAccess(spent, "reading_practice").reason).toBe("spent");
    expect(featureAccess(spent, "adaptive_coach").reason).toBe("notOnPlan");
    // An unread snapshot blocks, but must not claim a reason it does not know.
    expect(featureAccess({ status: "error" }, "reading_practice").reason).toBe("unknown");
    expect(featureAccess(spent, "reading_practice").usable).toBe(false);
  });

  it("keeps every billing write off the browser's path", () => {
    // The RevenueCat webhook is provider-to-Express and the reconcile job is
    // shared-secret; a browser must reach neither, now or after PR-21.
    expect(decidePolicy("POST", "/api/billing/revenuecat/webhook")).toMatchObject({ status: 410 });
    expect(decidePolicy("POST", "/api/admin/billing/reconcile")).toMatchObject({ status: 410 });
    // And no purchase route has been quietly added to the allowlist.
    expect(decidePolicy("POST", "/api/billing/checkout")).toMatchObject({ status: 404 });
    expect(decidePolicy("POST", "/api/subscription")).toMatchObject({ status: 404 });
    // Nor the shared-secret admin billing routes: one can grant a plan, the
    // other reports on the webhook secret. Neither belongs in a browser.
    expect(decidePolicy("POST", "/api/admin/billing/manual-grant")).toMatchObject({ status: 410 });
    expect(decidePolicy("GET", "/api/admin/billing/webhook-secret-fingerprint")).toMatchObject({ status: 410 });
    // The rest of the admin console still works — this is by name, not a
    // blanket closure.
    expect(decidePolicy("GET", "/api/admin/metrics")).toEqual({ action: "forward" });
  });
});
