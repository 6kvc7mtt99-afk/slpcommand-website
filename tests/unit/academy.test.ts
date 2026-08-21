import { describe, expect, it } from "vitest";
import { academyTargetLevel } from "../../lib/api/academy";

describe("academyTargetLevel — the one canonical target-level parser", () => {
  it("collapses 2 and 2+ to 2, and passes 3 through", () => {
    expect(academyTargetLevel("2")).toBe("2");
    expect(academyTargetLevel("2+")).toBe("2");
    expect(academyTargetLevel("3")).toBe("3");
  });

  it("returns null rather than a guessed level for anything unrecognised", () => {
    // Settings' /profile page and Speaking's prompt selector both used to
    // fall back to a hardcoded "3" here — a missing field, an empty
    // string, or a value this app doesn't know about must never silently
    // become a target the learner never set.
    expect(academyTargetLevel(undefined)).toBeNull();
    expect(academyTargetLevel(null)).toBeNull();
    expect(academyTargetLevel("")).toBeNull();
    expect(academyTargetLevel("4")).toBeNull();
    expect(academyTargetLevel({})).toBeNull();
  });
});
