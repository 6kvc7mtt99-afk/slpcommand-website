import { describe, expect, it } from "vitest";
import { interpretEntitlements, planLabel } from "../../lib/entitlements";

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
});
