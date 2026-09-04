/**
 * What audio may cross into the backend, and under what name.
 *
 * FIREFOX-SPEAKING-001. This file used to accept only the MP4/AAC family and
 * fall back to transcoding anything else with ffmpeg via
 * `node:child_process.spawn`. That fallback could never run: the deploy target
 * is Cloudflare Workers (wrangler.jsonc → .open-next/worker.js), which has no
 * process model. So every Firefox learner — Firefox is the one supported
 * browser whose MediaRecorder cannot emit MP4 audio — was refused with a 415,
 * after recording a full take, and told to "try a desktop Chrome build with
 * AAC", which is not a thing.
 *
 * Measured against real engines, running the product's own negotiation:
 *   Chromium (Chrome, Edge) → audio/mp4
 *   WebKit  (Safari)        → audio/mp4
 *   Firefox                 → audio/webm;codecs=opus
 *
 * The conversion was solving a problem that does not exist downstream. This
 * audio's only consumer is the backend's `transcribeSpeakingAudio`, which
 * hands it to OpenAI `whisper-1` — and Whisper accepts webm and ogg natively
 * alongside mp4/m4a. The backend now allows both containers and recognises
 * their magic bytes (EBML for WebM, "OggS" for Ogg), so the anti-fraud
 * signature check is extended rather than weakened.
 *
 * TRANSCODING IS THEREFORE GONE, not moved. Nothing spawns a subprocess, in
 * either tier.
 *
 * The filename matters. Whisper infers the container from the extension, so a
 * WebM payload named `speaking.m4a` is rejected by OpenAI even though its mime
 * and magic bytes are valid. The backend receives `req.file.originalname` and
 * passes it straight through, so the name written here has to match the bytes.
 */

const ALLOWED = new Set([
  "audio/m4a",
  "audio/x-m4a",
  "audio/mp4",
  "audio/aac",
  // Firefox. Whisper reads these directly; no conversion step exists.
  "audio/webm",
  "audio/ogg",
]);

/** The bare media type — Firefox reports `audio/webm;codecs=opus`. */
function baseMime(mime: string): string {
  return mime.split(";")[0]?.trim().toLowerCase() ?? "";
}

export function isAllowedSpeakingMime(mime: string): boolean {
  return ALLOWED.has(baseMime(mime));
}

/** Must match the bytes: Whisper detects the container from this extension. */
export function speakingAudioFilename(mime: string): string {
  switch (baseMime(mime)) {
    case "audio/webm":
      return "speaking.webm";
    case "audio/ogg":
      return "speaking.ogg";
    case "audio/aac":
      return "speaking.aac";
    default:
      return "speaking.m4a";
  }
}

export async function toAcceptedSpeakingAudio(
  bytes: Uint8Array,
  mime: string,
): Promise<{ bytes: Uint8Array; mime: string; filename: string } | { error: string; status: number }> {
  const base = baseMime(mime);
  if (ALLOWED.has(base)) {
    return { bytes, mime: base, filename: speakingAudioFilename(base) };
  }
  /**
   * Everything a supported browser can record is now accepted, so reaching
   * here means an unrecognised container — an unsupported browser, or a
   * hand-crafted upload. There is nothing to convert with and nothing to
   * convert to, so this states the fact rather than naming a browser build
   * that does not exist. It returns BEFORE backendFetch, so no quota is spent.
   */
  return {
    status: 415,
    error: `This browser records ${base || "an unrecognised format"}, which the assessment pipeline cannot read. Chrome, Edge, Safari and Firefox are all supported. Nothing was recorded against your allowance.`,
  };
}
