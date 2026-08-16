import { describe, expect, it } from "vitest";
import { featureAccess, interpretEntitlements, planLabel } from "../../lib/entitlements";

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
