import { FrontendError, normalizeBackendError, userMessageFor } from "./errors";

async function refreshOnce(): Promise<boolean> {
  const res = await fetch("/api/auth/refresh", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
  });
  return res.ok;
}

export async function postSpeakingEvaluate(form: FormData, idempotencyKey: string): Promise<unknown> {
  const exec = () =>
    fetch("/api/backend/speaking/evaluate", {
      method: "POST",
      credentials: "same-origin",
      headers: { Accept: "application/json", "X-SLP-Client": "web", "X-Idempotency-Key": idempotencyKey },
      body: form,
    });
  let res = await exec();
  if (res.status === 401) {
    const refreshed = await refreshOnce();
    if (refreshed) res = await exec();
  }
  const raw = await res.text();
  let parsed: unknown = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = { error: raw };
  }
  if (!res.ok) {
    const err = normalizeBackendError({ status: res.status, body: parsed, path: "/speaking/evaluate" });
    err.message = userMessageFor(err);
    throw err;
  }
  return parsed;
}

export async function saveSpeakingAudio(attemptId: string, form: FormData): Promise<unknown> {
  const res = await fetch(`/api/backend/speaking/attempts/${attemptId}/save-audio`, {
    method: "POST",
    credentials: "same-origin",
    headers: { Accept: "application/json", "X-SLP-Client": "web" },
    body: form,
  });
  if (!res.ok) {
    throw new FrontendError({ code: "audio", message: "Could not save audio.", status: res.status });
  }
  return res.json();
}
