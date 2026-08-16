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
