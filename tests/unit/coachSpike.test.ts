import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { sendContextualUpdateSafely, SPIKE_CONTEXTUAL_UPDATE } from "../../lib/coach/context";
import { mapCoachStartError } from "../../lib/coach/errors";
import { isCoachSpikeEnabled } from "../../lib/coach/flag";
import { hostsFromIceServers, hostsFromPerformance } from "../../lib/coach/hosts";
import { canAuthorizeCoachSession } from "../../lib/coach/preflight";
import { ELEVENLABS_REACT_VERSION, inspectStartSessionFn, inspectStartSessionReturn } from "../../lib/coach/sdk";
import {
  decodeCoachSessionStart,
  decodeCoachSessionStatus,
  pollCoachSession,
  sessionIsSettled,
} from "../../lib/coach/session";
import { looksLikeJwt, redactToken } from "../../lib/coach/token";
import {
  accumulateTranscript,
  classifyCoachMessage,
  countSubstantialUserTurns,
  MIN_WORDS_FOR_SUBSTANTIAL_TURN,
  wordCount,
} from "../../lib/coach/transcript";
import { decidePolicy, requiresIdempotency } from "../../lib/server/proxyPolicy";

describe("coach spike flag and sdk pin", () => {
  it("is on in development and off in production unless flagged", () => {
    expect(isCoachSpikeEnabled({ NODE_ENV: "development" })).toBe(true);
    expect(isCoachSpikeEnabled({ NODE_ENV: "production" })).toBe(false);
    expect(isCoachSpikeEnabled({ NODE_ENV: "production", COACH_SPIKE_ENABLED: "1" })).toBe(true);
    expect(isCoachSpikeEnabled({ NODE_ENV: "development", COACH_SPIKE_ENABLED: "0" })).toBe(false);
  });

  it("pins the installed @elevenlabs/react version and void startSession contract", () => {
    const pkg = JSON.parse(readFileSync("node_modules/@elevenlabs/react/package.json", "utf8")) as { version: string };
    expect(ELEVENLABS_REACT_VERSION).toBe(pkg.version);
    const inspect = inspectStartSessionFn(() => undefined);
    expect(inspect.declaredReturn).toBe("void");
    expect(inspectStartSessionReturn(undefined)).toEqual({
      runtimeReturnType: "undefined",
      runtimeIsPromise: false,
    });
  });
});

describe("pre-flight order", () => {
  it("refuses POST /session when the SDK is missing or the mic is denied", () => {
    expect(canAuthorizeCoachSession({ sdkReady: false, mic: "granted" })).toEqual({
      ok: false,
      reason: "sdk_unavailable",
    });
    expect(canAuthorizeCoachSession({ sdkReady: true, mic: "denied" })).toEqual({
      ok: false,
      reason: "microphone_denied",
    });
    expect(canAuthorizeCoachSession({ sdkReady: true, mic: "unknown" }).ok).toBe(true);
    expect(canAuthorizeCoachSession({ sdkReady: true, mic: "prompt" }).ok).toBe(true);
  });
});

describe("token safety", () => {
  it("never returns the raw token", () => {
    const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.aaa.bbb";
    const redacted = redactToken(token);
    expect(redacted).not.toBe(token);
    expect(redacted.includes(token)).toBe(false);
    expect(redacted).toContain("len=");
    expect(looksLikeJwt(token)).toBe(true);
  });
});

describe("transcript richness", () => {
  it("classifies official MessagePayload role/source and counts ≥6-word user turns", () => {
    expect(MIN_WORDS_FOR_SUBSTANTIAL_TURN).toBe(6);
    expect(wordCount("one two three four five")).toBe(5);
    const shortUser = classifyCoachMessage({
      role: "user",
      source: "user",
      message: "yes okay",
      event_id: 1,
    });
    const longUser = classifyCoachMessage({
      role: "user",
      source: "user",
      message: "I can hold this radio check for six words",
      event_id: 2,
    });
    const agent = classifyCoachMessage({
      role: "agent",
      source: "ai",
      message: "SPIKE UPDATE RECEIVED. Continue.",
      event_id: 3,
    });
    expect(shortUser.substantialUserTurn).toBe(false);
    expect(longUser.substantialUserTurn).toBe(true);
    expect(agent.role).toBe("agent");
    expect(countSubstantialUserTurns([shortUser, longUser, agent])).toBe(1);
  });

  it("collapses growing user transcripts with the same event id", () => {
    const first = classifyCoachMessage({ role: "user", source: "user", message: "I can hold", event_id: 9 });
    const second = classifyCoachMessage({
      role: "user",
      source: "user",
      message: "I can hold this radio check for six words",
      event_id: 9,
    });
    const acc = accumulateTranscript(accumulateTranscript([], first), second);
    expect(acc).toHaveLength(1);
    expect(acc[0]?.substantialUserTurn).toBe(true);
  });
});

describe("contextual update failure does not end the call", () => {
  it("swallows a forced throw and never calls endSession", async () => {
    const send = vi.fn();
    const end = vi.fn();
    const result = await sendContextualUpdateSafely(send, SPIKE_CONTEXTUAL_UPDATE, { forceFail: true });
    expect(result).toEqual({
      ok: false,
      toreDown: false,
      error: "forced_contextual_update_failure",
    });
    expect(send).not.toHaveBeenCalled();
    expect(end).not.toHaveBeenCalled();
  });

  it("still does not tear down when the SDK send throws", async () => {
    const send = vi.fn(() => {
      throw new Error("not connected");
    });
    const result = await sendContextualUpdateSafely(send, SPIKE_CONTEXTUAL_UPDATE);
    expect(result.ok).toBe(false);
    expect(result.toreDown).toBe(false);
    expect(result.error).toBe("not connected");
  });
});

describe("session decode and poll", () => {
  it("decodes a token-bearing start payload without dropping dynamic variables", () => {
    const decoded = decodeCoachSessionStart({
      ok: true,
      sessionId: "sess-1",
      budgetSecs: 60,
      conversationToken: "tok-secret",
      conversationTokenExpiresAt: "2026-08-16T00:00:00Z",
      conversationId: "conv-1",
      dynamicVariables: { session_ref: "ref-1", minutes_budget: 1 },
      objective: "Spike",
    });
    expect(decoded?.sessionId).toBe("sess-1");
    expect(decoded?.dynamicVariables.session_ref).toBe("ref-1");
    expect(decoded?.dynamicVariables.minutes_budget).toBe("1");
    expect(sessionIsSettled({ id: "s", status: "completed", evaluationStatus: "done", consumedSecs: 12, hasResult: true })).toBe(true);
  });

  it("polls ten times then returns the last status", async () => {
    let n = 0;
    const last = await pollCoachSession(
      async () => {
        n += 1;
        return decodeCoachSessionStatus({ session: { id: "s", status: "running", evaluation_status: "queued" } });
      },
      { attempts: 3, delayMs: 1, sleep: async () => undefined },
    );
    expect(n).toBe(3);
    expect(last?.status).toBe("running");
  });
});

describe("hosts", () => {
  it("collects third-party resource and ICE hosts", () => {
    expect(
      hostsFromPerformance(
        [{ name: "https://slpcommand.com/spike/coach" }, { name: "https://livekit.rtc.elevenlabs.io/rtc" }],
        "https://slpcommand.com",
      ),
    ).toEqual(["livekit.rtc.elevenlabs.io"]);
    expect(hostsFromIceServers([{ urls: ["stun:stun.l.google.com:19302", "turns:turn.livekit.cloud:443"] }])).toEqual([
      "stun.l.google.com:19302",
      "turn.livekit.cloud:443",
    ]);
  });
});

describe("coach start errors", () => {
  it("maps the iOS contract and never blames the network for 503", () => {
    expect(mapCoachStartError({ status: 402, error: "insufficient_minutes" })).toBe("insufficientMinutes");
    expect(mapCoachStartError({ status: 403, error: "consent_required" })).toBe("consentRequired");
    expect(mapCoachStartError({ status: 409, error: "session_already_open" })).toBe("sessionAlreadyOpen");
    expect(mapCoachStartError({ status: 503, error: "coach_disabled" })).toBe("coachUnavailable");
    expect(mapCoachStartError({ status: 503, error: "coach_unavailable" })).toBe("providerUnavailable");
    expect(mapCoachStartError({ status: 500 })).toBe("backendUnavailable");
    expect(mapCoachStartError({ network: true })).toBe("network");
  });
});

describe("proxy allowlist", () => {
  it("forwards learner coach routes and keeps the webhook gone", () => {
    expect(decidePolicy("GET", "/api/speaking/coach/readiness")).toEqual({ action: "forward" });
    expect(decidePolicy("GET", "/api/speaking/coach/mission")).toEqual({ action: "forward" });
    expect(decidePolicy("GET", "/api/speaking/coach/balance")).toEqual({ action: "forward" });
    expect(decidePolicy("POST", "/api/speaking/coach/consent")).toEqual({ action: "forward" });
    expect(decidePolicy("POST", "/api/speaking/coach/session")).toEqual({ action: "forward" });
    expect(requiresIdempotency("POST", "/api/speaking/coach/session")).toBe(false);
    expect(decidePolicy("GET", "/api/speaking/coach/session/abc")).toEqual({ action: "forward" });
    expect(decidePolicy("POST", "/api/speaking/coach/webhook")).toMatchObject({
      action: "deny",
      status: 410,
    });
  });
});
