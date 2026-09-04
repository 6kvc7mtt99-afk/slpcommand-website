import { describe, expect, it } from "vitest";
import { speakingEvaluateKey } from "../../lib/speaking/evaluate";

/**
 * Two different recordings must never share an evaluation.
 *
 * THE COLLISION THIS PINS. The key was a SHA-256 of `${filename}:${duration}`
 * where the filename was the constant "speaking.m4a" — so the key was a pure
 * function of the duration rounded to a whole second. The recorder ticks in
 * exact one-second steps, so two practice attempts of the same length (60s,
 * 90s and 120s being the obvious attractors) produced IDENTICAL keys and the
 * second was answered from the first's cached response: a different recording,
 * possibly against a different prompt, reported back with the first attempt's
 * transcript, criteria and verdict.
 *
 * The id is minted once per BLOB (in SpeakingRecorder's onstop), not per
 * submit — which is what preserves the property a key exists for.
 */
describe("speaking evaluate idempotency", () => {
  it("gives two same-length takes different keys", async () => {
    const a = await speakingEvaluateKey("11111111-1111-4111-8111-111111111111", 60);
    const b = await speakingEvaluateKey("22222222-2222-4222-8222-222222222222", 60);
    expect(a).not.toBe(b);
  });

  it("keeps the same key when the SAME take is retried after a failed upload", async () => {
    const id = "33333333-3333-4333-8333-333333333333";
    expect(await speakingEvaluateKey(id, 90)).toBe(await speakingEvaluateKey(id, 90));
  });

  it("still distinguishes one take submitted at two measured durations", async () => {
    const id = "44444444-4444-4444-8444-444444444444";
    expect(await speakingEvaluateKey(id, 60)).not.toBe(await speakingEvaluateKey(id, 61));
  });

  it("reproduces the old collision to show it is gone", async () => {
    // What the old call produced for any two 60-second practice takes.
    const oldStyle = await speakingEvaluateKey("speaking.m4a", 60);
    expect(oldStyle).toBe(await speakingEvaluateKey("speaking.m4a", 60));
    // The live call sites now pass a per-take UUID, so this shape is unreachable.
    expect(await speakingEvaluateKey(crypto.randomUUID(), 60)).not.toBe(oldStyle);
  });
});
