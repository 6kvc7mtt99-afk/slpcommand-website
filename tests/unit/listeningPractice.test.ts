import { beforeEach, describe, expect, it, vi } from "vitest";
import { decodeListeningItem } from "../../lib/api/listening";
import { decidePolicy } from "../../lib/server/proxyPolicy";
import { normalizeBackendError, userMessageFor } from "../../lib/api/errors";

const fetchApi = vi.fn();
vi.mock("../../lib/api/client", () => ({
  apiRequest: (...args: unknown[]) => fetchApi(...args),
}));

const clip = {
  listeningId: "L1",
  questionId: "q1",
  audioUrl: "https://example.com/clip.mp3",
  prompt: "What did the speaker ask for?",
  options: ["Map", "Water", "Radio", "Light"],
  correctIndex: 1,
  transcript: "SECRET TEXT THAT MUST NOT BE REQUIRED",
};

describe("listening practice contract", () => {
  it("decodes one clip and does not require a transcript field", () => {
    const item = decodeListeningItem(clip);
    expect(item?.audioUrl).toContain("clip.mp3");
    expect(item?.options).toHaveLength(4);
    expect(JSON.stringify(item)).not.toContain("SECRET TEXT");
  });

  it("decodes the live Express SLP next contract used by iOS", () => {
    const item = decodeListeningItem({
      source: "slp_real_audio_selection",
      mode: "training",
      adaptive: { focusSkill: null, applied: false, servedSkill: "inference" },
      examStyle: { questionPerAudio: 1, showTranscriptToStudent: false, optionsPerQuestion: 4, targetLevel: 3 },
      listening: {
        id: "lis-1",
        title: "Convoy update",
        audioUrl: "https://cdn.example.com/listening/a.mp3",
        topic: "operations",
      },
      question: {
        id: "q-1",
        level: 3,
        skill: "inference",
        difficulty: 3,
        question: "What did the speaker ask for?",
        options: ["Map", "Water", "Radio", "Light"],
      },
    });
    expect(item).toMatchObject({
      listeningId: "lis-1",
      questionId: "q-1",
      audioUrl: "https://cdn.example.com/listening/a.mp3",
      prompt: "What did the speaker ask for?",
    });
    expect(item?.options).toHaveLength(4);
    expect(JSON.stringify(item)).not.toMatch(/transcript/i);
  });

  it("decodes the live iOS /slp/next envelope (listening + question)", () => {
    const item = decodeListeningItem({
      source: "cloud",
      mode: "training",
      listening: { id: "abc", title: "Sitrep", audioUrl: "https://cdn.example.com/a.mp3" },
      question: { id: "q9", question: "What was requested?", options: ["Map", "Water", "Radio", "Light"] },
    });
    expect(item).toEqual({
      listeningId: "abc",
      questionId: "q9",
      audioUrl: "https://cdn.example.com/a.mp3",
      prompt: "What was requested?",
      options: ["Map", "Water", "Radio", "Light"],
      correctIndex: null,
    });
  });

  it("never uses the dead recommendation route", () => {
    expect(decidePolicy("GET", "/api/listening/recommendation")).toMatchObject({ action: "deny", status: 410 });
    expect(decidePolicy("GET", "/api/listening/slp/next")).toEqual({ action: "forward" });
  });

  it("maps the Spanish empty-pool error to English copy", () => {
    const err = normalizeBackendError({
      status: 404,
      body: { error: "No hay listenings activos disponibles" },
      path: "/listening/slp/next",
    });
    expect(err.reason).toBe("empty_pool");
    expect(userMessageFor(err)).toBe("No listening items available right now.");
    expect(userMessageFor(err)).not.toMatch(/hay listenings/i);
  });
});

describe("listening practice session", () => {
  beforeEach(async () => {
    fetchApi.mockReset();
    fetchApi.mockResolvedValue(clip);
    const mod = await import("../../lib/listening/practiceSession");
    mod.resetListeningPracticeSession();
  });

  it("reuses one key and one GET across two mounts", async () => {
    const { loadListeningNext, currentListeningPracticeKey } = await import("../../lib/listening/practiceSession");
    const key = currentListeningPracticeKey();
    await Promise.all([loadListeningNext(), loadListeningNext()]);
    expect(fetchApi).toHaveBeenCalledTimes(1);
    expect(fetchApi.mock.calls[0][0]).toBe("/listening/slp/next?mode=training");
    expect(fetchApi.mock.calls[0][1]).toEqual({ idempotencyKey: key });
  });
});
