import { describe, expect, it } from "vitest";
import { draftStorageKey, isSlp3Band, submitModeForBand } from "../../lib/api/writing";

describe("writing exam mode", () => {
  it("uses formative_exam below SLP 3 and does not treat that as a level", () => {
    expect(submitModeForBand("2")).toBe("formative_exam");
    expect(submitModeForBand("2+")).toBe("formative_exam");
    expect(submitModeForBand("SLP 2")).toBe("formative_exam");
    expect(submitModeForBand("3")).toBe("exam");
    expect(submitModeForBand("SLP3")).toBe("exam");
    expect(isSlp3Band("2")).toBe(false);
  });

  it("isolates the local draft by user id", () => {
    expect(draftStorageKey("user-a")).toBe("writing_exam_autosave:user-a");
    expect(draftStorageKey("user-b")).not.toBe(draftStorageKey("user-a"));
  });
});
