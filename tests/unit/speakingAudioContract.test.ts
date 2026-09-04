import { describe, expect, it } from "vitest";
import {
  isAllowedSpeakingMime,
  speakingAudioFilename,
  toAcceptedSpeakingAudio,
} from "../../lib/server/speakingAudio";
import { recorderFormatSupported } from "../../components/speaking/SpeakingRecorder";

/**
 * The Speaking audio contract, pinned to what was MEASURED across real engines.
 *
 * Running the product's own pickRecorderMime() against Playwright's chromium,
 * firefox and webkit builds:
 *
 *   Chromium (Chrome, Edge) → audio/mp4
 *   WebKit  (Safari)        → audio/mp4
 *   Firefox                 → audio/webm;codecs=opus
 *
 * All three are supported. Firefox previously was not: the web tier tried to
 * transcode WebM with ffmpeg — impossible on Cloudflare Workers — and the
 * backend allowlist would have rejected it regardless. Both tiers now accept
 * it directly, because the only consumer is OpenAI whisper-1, which reads WebM
 * and Ogg natively. No transcoding exists in either tier any more.
 *
 * These expectations must move together with SPEAKING_ALLOWED_MIME on the
 * backend. If one side is widened without the other, this fails.
 */
describe("Speaking audio contract", () => {
  const CHROMIUM = "audio/mp4";
  const WEBKIT = "audio/mp4";
  const FIREFOX = "audio/webm;codecs=opus";

  it("accepts what all three supported engines actually record", () => {
    for (const mime of [CHROMIUM, WEBKIT, FIREFOX, "audio/mp4;codecs=mp4a.40.2", "audio/m4a", "audio/aac", "audio/ogg"]) {
      expect(isAllowedSpeakingMime(mime), mime).toBe(true);
      expect(recorderFormatSupported(mime), mime).toBe(true);
    }
  });

  /**
   * Firefox reports the codecs parameter. An exact Set lookup on the raw header
   * would reject the very browser this support exists for.
   */
  it("ignores the codecs parameter when matching", () => {
    expect(isAllowedSpeakingMime("audio/webm;codecs=opus")).toBe(true);
    expect(isAllowedSpeakingMime("AUDIO/WEBM; codecs=opus")).toBe(true);
  });

  /**
   * Whisper infers the container from the FILENAME extension, so a WebM payload
   * named speaking.m4a is rejected by OpenAI even though its mime and magic
   * bytes are valid. The name must follow the bytes.
   */
  it("names the file after the container, not a constant", () => {
    expect(speakingAudioFilename(FIREFOX)).toBe("speaking.webm");
    expect(speakingAudioFilename("audio/ogg")).toBe("speaking.ogg");
    expect(speakingAudioFilename(CHROMIUM)).toBe("speaking.m4a");
    expect(speakingAudioFilename("audio/aac")).toBe("speaking.aac");
  });

  it("passes every accepted container through untouched — no transcode", async () => {
    const cases: Array<[string, Uint8Array, string]> = [
      [CHROMIUM, new Uint8Array([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70]), "speaking.m4a"],
      [FIREFOX, new Uint8Array([0x1a, 0x45, 0xdf, 0xa3]), "speaking.webm"],
    ];
    for (const [mime, bytes, filename] of cases) {
      const out = await toAcceptedSpeakingAudio(bytes, mime);
      expect("error" in out, mime).toBe(false);
      if (!("error" in out)) {
        // Same buffer object: nothing re-encoded it.
        expect(out.bytes).toBe(bytes);
        expect(out.filename).toBe(filename);
        expect(out.mime).toBe(mime.split(";")[0]);
      }
    }
  });

  it("refuses an unrecognised container without naming a browser that does not exist", async () => {
    const out = await toAcceptedSpeakingAudio(new Uint8Array([1, 2, 3, 4]), "audio/x-weird");
    expect("error" in out).toBe(true);
    if ("error" in out) {
      expect(out.status).toBe(415);
      expect(out.error).toMatch(/Firefox/);
      expect(out.error).toMatch(/allowance/);
      expect(out.error).not.toMatch(/build with AAC/);
    }
  });
});
