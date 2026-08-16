export type MicPermission = "denied" | "granted" | "prompt" | "unknown";

export type PreflightResult =
  | { ok: true }
  | { ok: false; reason: "sdk_unavailable" | "microphone_denied" };

/** Engine first, then mic. POST /session is forbidden until this returns ok. */
export function canAuthorizeCoachSession(input: {
  sdkReady: boolean;
  mic: MicPermission;
}): PreflightResult {
  if (!input.sdkReady) return { ok: false, reason: "sdk_unavailable" };
  if (input.mic === "denied") return { ok: false, reason: "microphone_denied" };
  return { ok: true };
}

export async function queryMicrophonePermission(): Promise<MicPermission> {
  try {
    const status = await navigator.permissions.query({ name: "microphone" as PermissionName });
    if (status.state === "denied" || status.state === "granted" || status.state === "prompt") {
      return status.state;
    }
  } catch {
    /* Safari often rejects the Permissions API for microphone. */
  }
  return "unknown";
}

export async function requestMicrophonePreview(): Promise<MicPermission> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  for (const track of stream.getTracks()) track.stop();
  return "granted";
}
