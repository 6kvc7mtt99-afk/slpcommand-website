import { beforeEach, describe, expect, it, vi } from "vitest";
import { decidePolicy } from "../../lib/server/proxyPolicy";
import { decodeReadingPassage, liveQuestionCount } from "../../lib/api/reading";
import { newIdempotencyKey } from "../../lib/api/idempotency";
import { featureAccess, interpretEntitlements } from "../../lib/entitlements";

const fetchPassage = vi.fn();

vi.mock("../../lib/api/client", () => ({
  apiRequest: (...args: unknown[]) => fetchPassage(...args),
  FrontendError: class FrontendError extends Error {},
}));

const oneQuestion = {
  readingTextId: "rt-1",
  title: "Orders",
  text: "Report to the briefing room at 0600.",
  genreDescriptor: "military",
  difficulty: "B2",
  cluster: { questionCount: 1 },
  questions: [
    {
      questionId: "q1",
      prompt: "Where should they report?",
      options: ["Mess", "Briefing room", "Gate", "Hangar"],
      correctIndex: 1,
      explanation: "The text names the briefing room.",
    },
  ],
};

describe("reading passage contract", () => {
  it("decodes one question and does not assume a cluster of four", () => {
    const passage = decodeReadingPassage(oneQuestion);
    expect(passage?.questions).toHaveLength(1);
    expect(liveQuestionCount(passage!)).toBe(1);
    const two = decodeReadingPassage({
      ...oneQuestion,
      questions: [oneQuestion.questions[0], { ...oneQuestion.questions[0], questionId: "q2", prompt: "When?" }],
    });
    expect(two?.questions).toHaveLength(2);
  });

  it("rejects an empty payload instead of inventing items", () => {
    expect(decodeReadingPassage({ questions: [] })).toBeNull();
  });
});

describe("reading practice session", () => {
  beforeEach(async () => {
    fetchPassage.mockReset();
    fetchPassage.mockResolvedValue(oneQuestion);
    const mod = await import("../../lib/reading/practiceSession");
    mod.resetReadingPracticeSession();
  });

  it("reuses one idempotency key and one GET across two mounts", async () => {
    const { loadReadingPassage, currentReadingPracticeKey } = await import("../../lib/reading/practiceSession");
    const first = currentReadingPracticeKey();
    const [a, b] = await Promise.all([loadReadingPassage(), loadReadingPassage()]);
    expect(a.readingTextId).toBe("rt-1");
    expect(b.readingTextId).toBe("rt-1");
    expect(currentReadingPracticeKey()).toBe(first);
    expect(fetchPassage).toHaveBeenCalledTimes(1);
    expect(fetchPassage.mock.calls[0][0]).toBe("/reading/passage");
    expect(fetchPassage.mock.calls[0][1]).toEqual({ idempotencyKey: first });
    expect(fetchPassage.mock.calls[0][0]).not.toContain("/next");
  });

  it("rotates the key only when the learner asks for the next passage", async () => {
    const { currentReadingPracticeKey, rotateReadingPracticeKey, loadReadingPassage } = await import(
      "../../lib/reading/practiceSession"
    );
    const first = currentReadingPracticeKey();
    await loadReadingPassage();
    const second = rotateReadingPracticeKey();
    expect(second).not.toBe(first);
    await loadReadingPassage();
    expect(fetchPassage).toHaveBeenCalledTimes(2);
    expect(fetchPassage.mock.calls[1][1]).toEqual({ idempotencyKey: second });
  });
});

describe("quota and legacy paths", () => {
  it("mints keys that Express will accept", () => {
    expect(newIdempotencyKey()).toMatch(/^[A-Za-z0-9:_-]{1,200}$/);
  });

  it("does not forward the legacy reading practice GET", () => {
    expect(decidePolicy("GET", "/api/reading/next")).toMatchObject({ action: "deny", status: 410 });
    expect(decidePolicy("GET", "/api/reading/passage")).toEqual({ action: "forward" });
  });

  it("disables the practice CTA when the plan has no remaining credit", () => {
    const state = interpretEntitlements(200, {
      plan: { key: "free" },
      features: [{ key: "reading_practice", enabled: true, quota: { period: "weekly", limit: 10, remaining: 0 } }],
    });
    expect(featureAccess(state, "reading_practice").usable).toBe(false);
  });
});
