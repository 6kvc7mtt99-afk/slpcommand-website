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
