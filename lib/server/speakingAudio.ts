import { spawn } from "node:child_process";

const ALLOWED = new Set(["audio/m4a", "audio/x-m4a", "audio/mp4", "audio/aac"]);

export function isAllowedSpeakingMime(mime: string): boolean {
  return ALLOWED.has(mime.split(";")[0]?.trim() ?? "");
}

export async function toAcceptedSpeakingAudio(
  bytes: Uint8Array,
  mime: string,
): Promise<{ bytes: Uint8Array; mime: string; filename: string } | { error: string; status: number }> {
  if (isAllowedSpeakingMime(mime)) {
    return { bytes, mime: mime.split(";")[0]?.trim() || "audio/m4a", filename: "speaking.m4a" };
  }
  try {
    const converted = await ffmpegAac(bytes);
    return { bytes: converted, mime: "audio/m4a", filename: "speaking.m4a" };
  } catch {
    return {
      status: 415,
      error: "This browser cannot produce an accepted audio format (audio/m4a). Try Safari or a desktop Chrome build with AAC, or convert locally.",
    };
  }
}

function ffmpegAac(input: Uint8Array): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const child = spawn("ffmpeg", ["-hide_banner", "-loglevel", "error", "-i", "pipe:0", "-c:a", "aac", "-f", "mp4", "pipe:1"], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    const chunks: Buffer[] = [];
    child.stdout.on("data", (chunk) => chunks.push(chunk as Buffer));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0 && chunks.length) resolve(new Uint8Array(Buffer.concat(chunks)));
      else reject(new Error("ffmpeg_failed"));
    });
    child.stdin.end(Buffer.from(input));
  });
}
