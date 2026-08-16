import { describe, expect, it } from "vitest";
import { freeTopicIds, isListeningTopicLocked, listeningAcademyTopics, topicsFor } from "./academyCatalog";

describe("Listening Academy free-set prefix rule", () => {
  it("matches iOS f4ceb8c5: prefix(1) slp2, prefix(2) slp3, prefix(1) literal, prefix(1) strategies", () => {
    expect(freeTopicIds()).toEqual([
      "factual_detail",
      "inference",
      "implication",
      "sub_numbers",
      "strategy_active_listening",
    ]);
  });

  it("changes the free set when catalog order changes, the same way iOS would", () => {
    const reordered = [
      ...topicsFor("slp2").slice().reverse(),
      ...topicsFor("slp3"),
      ...topicsFor("literalExtraction"),
      ...topicsFor("examStrategies"),
    ];
    expect(freeTopicIds(reordered)[0]).toBe(topicsFor("slp2").at(-1)?.id);
  });

  it("locks Pro-only topics for Free and never treats a 200 as unlocked", () => {
    expect(isListeningTopicLocked("factual_detail", false)).toBe(false);
    expect(isListeningTopicLocked("reasoning", false)).toBe(true);
    expect(isListeningTopicLocked("reasoning", true)).toBe(false);
    expect(listeningAcademyTopics.some((topic) => topic.id === "reasoning")).toBe(true);
  });
});
