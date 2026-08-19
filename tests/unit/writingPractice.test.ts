import { describe, expect, it } from "vitest";
import { decodeWritingPrompt, normalizeWritingGuidance, writingSubmitKey } from "../../lib/api/writing";
import { decidePolicy } from "../../lib/server/proxyPolicy";
import { normalizeBackendError, userMessageFor } from "../../lib/api/errors";

describe("writing practice contract", () => {
  it("builds a deterministic wsub- key and keeps 2+ encoded", async () => {
    const a = await writingSubmitKey("p1", "hello world");
    const b = await writingSubmitKey("p1", "hello world");
    const c = await writingSubmitKey("p1", "hello world!");
    expect(a).toBe(b);
    expect(a.startsWith("wsub-")).toBe(true);
    expect(c).not.toBe(a);
    expect(encodeURIComponent("2+")).toBe("2%2B");
  });

  it("normalises guidance from several shapes", () => {
    expect(normalizeWritingGuidance({ suggestedStructure: ["Intro"], practiceTips: "Plan" })).toEqual({
      suggestedStructure: ["Intro"],
      practiceTips: ["Plan"],
    });
    expect(decodeWritingPrompt({ writingPromptId: "p1", prompt: "Write about X", wordTarget: 200 })?.writingPromptId).toBe("p1");
  });

  /**
   * decodeWritingPrompt returned null on every real prompt: the backend's
   * field is `promptText`, and the decoder only checked `prompt`/`text`/
   * `body`. That surfaced as "No writing prompt is available right now." on a
   * 200 OK response — verified against the real backend on the deployed
   * preview, where it made Writing practice and Writing exam unusable for
   * every account. This is the exact real response shape, so a regression
   * here fails immediately instead of waiting for someone to notice in
   * production.
   */
  it("decodes the real backend prompt shape ({ ok, source, prompt: { promptText, checklist, ... } })", () => {
    const real = {
      ok: true,
      source: "writing_prompt_library",
      prompt: {
        id: "60935a98-7760-4b9c-9f29-a3004e7a994f",
        title: "Reporting a slippery floor",
        promptText: "The floor at the entrance becomes slippery when it rains.",
        taskType: "routine_email",
        level2Task: "Say where the problem is and what should be done.",
        level3Task: null,
        targetLevel: 2.5,
        wordTarget: 180,
        timeLimitMinutes: 35,
        audience: "the Safety Officer",
        levelBand: "2",
        guidance: { suggestedStructure: [], practiceTips: [] },
        checklist: ["I said where the problem is", "I made one recommendation"],
      },
    };
    const decoded = decodeWritingPrompt(real);
    expect(decoded).not.toBeNull();
    expect(decoded?.writingPromptId).toBe("60935a98-7760-4b9c-9f29-a3004e7a994f");
    expect(decoded?.prompt).toContain("The floor at the entrance");
    expect(decoded?.prompt).toContain("Say where the problem is");
    expect(decoded?.audience).toBe("the Safety Officer");
    expect(decoded?.timeLimitMinutes).toBe(35);
    expect(decoded?.checklist).toEqual(["I said where the problem is", "I made one recommendation"]);
  });

  it("maps writing 429 as the daily cap and keeps IP 429 generic", () => {
    const cap = normalizeBackendError({ status: 429, body: {}, path: "/writing/submit" });
    expect(userMessageFor(cap)).toContain("Daily technical limit (20)");
    const ip = normalizeBackendError({ status: 429, body: {}, path: "/reading/passage" });
    expect(userMessageFor(ip)).toBe("Too many requests. Please wait a moment and try again.");
  });

  it("maps WritingErrorReason without leaking the raw reason", () => {
    const err = normalizeBackendError({ status: 504, body: { reason: "ai_timeout" }, path: "/writing/submit" });
    expect(userMessageFor(err)).toBe("The evaluator timed out. You were not charged. Try again.");
    expect(userMessageFor(err)).not.toContain("ai_timeout");
  });

  it("does not allow deprecated writing intelligence GETs or drill-feedback", () => {
    expect(decidePolicy("POST", "/api/writing/drill-feedback")).toMatchObject({ action: "deny", status: 410 });
    expect(decidePolicy("GET", "/api/writing/intelligence/readiness")).toMatchObject({ action: "deny", status: 410 });
    expect(decidePolicy("GET", "/api/writing/prompts/next")).toEqual({ action: "forward" });
    expect(decidePolicy("GET", "/api/writing/attempts")).toEqual({ action: "forward" });
  });
});
