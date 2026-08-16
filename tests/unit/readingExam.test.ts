import { describe, expect, it, vi, beforeEach } from "vitest";
import { decidePolicy } from "../../lib/server/proxyPolicy";
import { buildFinishPayload, decodeReadingExamStart } from "../../lib/api/readingExam";
import { examIntentKey } from "../../lib/api/idempotency";

const fetchApi = vi.fn();
vi.mock("../../lib/api/client", () => ({
  apiRequest: (...args: unknown[]) => fetchApi(...args),
}));

const startPayload = {
  examSessionId: "exam-99",
  timeLimitSeconds: 120,
  extraKey: true,
  passages: [
    {
      readingTextId: "rt-1",
      title: "Orders",
      text: "Report at 0600.",
      questions: [{ questionId: "q1", prompt: "When?", options: ["Now", "0600", "Never", "Noon"], correctIndex: 1 }],
    },
  ],
};

describe("reading exam v2 contract", () => {
  it("decodes start-v2 without using correctIndex", () => {
    const start = decodeReadingExamStart(startPayload);
    expect(start?.examSessionId).toBe("exam-99");
    expect(start?.items).toHaveLength(1);
    expect(start?.items[0]?.options).toHaveLength(4);
    expect(JSON.stringify(start)).not.toContain("correctIndex");
  });

  it("sends examSessionId as examId on finish", () => {
    expect(buildFinishPayload("exam-99", [{ readingTextId: "rt-1", questionId: "q1", selectedIndex: -1 }])).toEqual({
      examId: "exam-99",
      answers: [{ readingTextId: "rt-1", questionId: "q1", selectedIndex: -1 }],
    });
  });

  it("denies the legacy v1 start path", () => {
    expect(decidePolicy("POST", "/api/reading/exam/start")).toMatchObject({ action: "deny", status: 410 });
    expect(decidePolicy("POST", "/api/reading/exam/start-v2")).toEqual({ action: "forward" });
  });

  it("stores one intent key per user/day", () => {
    const key = examIntentKey("user-1", "reading", new Date("2026-08-16T12:00:00Z"));
    expect(key).toBe("exam-idemp:user-1:reading:2026-08-16");
  });
});

describe("reading exam session", () => {
  beforeEach(async () => {
    fetchApi.mockReset();
    fetchApi.mockResolvedValue(startPayload);
    const mod = await import("../../lib/reading/examSession");
    mod.clearReadingExamIntent("user-1");
  });

  it("reuses the same start-v2 call across two mounts", async () => {
    const { startReadingExam, getReadingExamIdempotencyKey } = await import("../../lib/reading/examSession");
    const key = getReadingExamIdempotencyKey("user-1");
    const [a, b] = await Promise.all([startReadingExam("user-1"), startReadingExam("user-1")]);
    expect(a.examSessionId).toBe("exam-99");
    expect(b.examSessionId).toBe("exam-99");
    expect(fetchApi).toHaveBeenCalledTimes(1);
    expect(fetchApi.mock.calls[0][0]).toBe("/reading/exam/start-v2");
    expect(fetchApi.mock.calls[0][1].idempotencyKey).toBe(key);
    expect(fetchApi.mock.calls[0][1].body).toEqual({ passageCount: 20, questionsPerPassage: 1 });
  });
});
