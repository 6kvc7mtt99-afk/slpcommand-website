import { describe, expect, it } from "vitest";
import { decidePolicy, requiresIdempotency } from "../../lib/server/proxyPolicy";
import { canSubmitSpeaking, decodeSpeakingEvaluate } from "../../lib/speaking/evaluate";
import { selectExamPrompts, speakingPromptLibrary } from "../../lib/speaking/prompts";

describe("speaking corpus and exam picker", () => {
  it("ports 300 iOS prompts and picks 3 exam-compatible slots", () => {
    expect(speakingPromptLibrary).toHaveLength(300);
    const picked = selectExamPrompts("3", () => 0);
    expect(picked).toHaveLength(3);
    expect(picked.every((item) => item.examCompatible && item.level === "3")).toBe(true);
    expect(["briefing", "sitrep"]).toContain(picked[0].category);
    expect(["problemSolving", "opinion"]).toContain(picked[1].category);
    expect(["comparison", "international"]).toContain(picked[2].category);
  });

  it("requires 15 seconds before exam submit and never invents a band", () => {
    expect(canSubmitSpeaking(14)).toBe(false);
    expect(canSubmitSpeaking(15)).toBe(true);
    const decoded = decodeSpeakingEvaluate({
      attempt_id: "a1",
      rating: { credited: true, level_attempted: "3", band: 2.7, criteria: { content: { met: true } } },
    });
    expect(decoded?.rating.band).toBeNull();
  });
});

describe("speaking proxy", () => {
  it("forwards evaluate/history and keeps coach webhook gone", () => {
    expect(decidePolicy("POST", "/api/speaking/evaluate")).toEqual({ action: "forward" });
    expect(requiresIdempotency("POST", "/api/speaking/evaluate")).toBe(true);
    expect(decidePolicy("GET", "/api/speaking/history")).toEqual({ action: "forward" });
    expect(decidePolicy("POST", "/api/speaking/coach/webhook")).toMatchObject({ action: "deny", status: 410 });
    expect(decidePolicy("POST", "/api/speaking/coach/session")).toMatchObject({ action: "deny", status: 404 });
  });
});
