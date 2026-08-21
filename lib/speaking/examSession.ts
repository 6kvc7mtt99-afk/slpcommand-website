// EXAM-REAL-003, Checkpoint 3 — SLP3 Real Exam Speaking, the fetch-calling layer.
//
// Mirrors lib/listening/examSession.ts's shape (inflight/cached memoization on start,
// one function per backend route, decoders imported rather than inlined) and
// lib/api/speaking.ts's postSpeakingEvaluate for the two multipart uploads — this file
// does not modify either; it composes the same patterns for a session-shaped exam
// instead of a single evaluate-and-done attempt.

import { apiRequest, FrontendError } from "@/lib/api/client";
import { normalizeBackendError, userMessageFor } from "@/lib/api/errors";
import { clearPersistentClientKey, examIntentKey, persistentClientKey } from "@/lib/api/idempotency";
import {
  decodeFinish,
  decodeRespond,
  decodeSpeakingExamStart,
  decodeSpeakingExamState,
  decodeWarmupRespond,
  type SpeakingExamFinish,
  type SpeakingExamStart,
  type SpeakingExamState,
  type SpeakingRespondResult,
  type SpeakingWarmupRespondResult,
} from "@/lib/api/speakingExam";

let inflight: Promise<SpeakingExamStart> | null = null;
let cached: SpeakingExamStart | null = null;

export function speakingExamStorageKey(userId: string, day?: Date): string {
  return examIntentKey(userId, "speaking", day);
}

export function getSpeakingExamIdempotencyKey(userId: string): string {
  return persistentClientKey(speakingExamStorageKey(userId));
}

export function clearSpeakingExamIntent(userId: string): void {
  clearPersistentClientKey(speakingExamStorageKey(userId));
  inflight = null;
  cached = null;
}

export function startSpeakingExam(userId: string): Promise<SpeakingExamStart> {
  const key = getSpeakingExamIdempotencyKey(userId);
  if (cached) return Promise.resolve(cached);
  if (inflight) return inflight;
  inflight = apiRequest<unknown>("/speaking/exam/start", { method: "POST", body: {}, idempotencyKey: key })
    .then((raw) => {
      const start = decodeSpeakingExamStart(raw);
      if (!start) throw new Error("invalid_exam");
      cached = start;
      inflight = null;
      return start;
    })
    .catch((err) => {
      inflight = null;
      throw err;
    });
  return inflight;
}

async function postAudioForm(path: string, form: FormData): Promise<unknown> {
  const exec = () =>
    fetch(`/api/backend${path}`, {
      method: "POST",
      credentials: "same-origin",
      headers: { Accept: "application/json", "X-SLP-Client": "web" },
      body: form,
    });
  let res = await exec();
  if (res.status === 401) {
    const refreshed = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
    }).then((r) => r.ok);
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
    const err = normalizeBackendError({ status: res.status, body: parsed, path });
    err.message = userMessageFor(err);
    throw err;
  }
  return parsed;
}

export async function submitWarmupResponse(
  examSessionId: string,
  blob: Blob,
  seconds: number,
): Promise<SpeakingWarmupRespondResult> {
  const form = new FormData();
  form.set("audio", blob, "speaking.m4a");
  form.set("examSessionId", examSessionId);
  form.set("duration_seconds", String(seconds));
  const raw = await postAudioForm("/speaking/exam/warmup/respond", form);
  const decoded = decodeWarmupRespond(raw);
  if (!decoded) throw new FrontendError({ code: "backend", message: "Could not read the warm-up response.", status: 502 });
  return decoded;
}

export async function submitTaskResponse(
  examSessionId: string,
  blob: Blob,
  seconds: number,
): Promise<SpeakingRespondResult> {
  const form = new FormData();
  form.set("audio", blob, "speaking.m4a");
  form.set("examSessionId", examSessionId);
  form.set("duration_seconds", String(seconds));
  const raw = await postAudioForm("/speaking/exam/respond", form);
  const decoded = decodeRespond(raw);
  if (!decoded) throw new FrontendError({ code: "backend", message: "Could not read the exam response.", status: 502 });
  return decoded;
}

export async function finishSpeakingExam(examSessionId: string): Promise<SpeakingExamFinish> {
  const raw = await apiRequest<unknown>("/speaking/exam/finish", { method: "POST", body: { examSessionId } });
  const decoded = decodeFinish(raw);
  if (!decoded) throw new FrontendError({ code: "backend", message: "Could not read the exam result.", status: 502 });
  return decoded;
}

export async function loadSpeakingExamState(examSessionId: string): Promise<SpeakingExamState> {
  const raw = await apiRequest<unknown>(`/speaking/exam/state?examSessionId=${encodeURIComponent(examSessionId)}`);
  const decoded = decodeSpeakingExamState(raw);
  if (!decoded) throw new FrontendError({ code: "backend", message: "Could not read the exam state.", status: 502 });
  return decoded;
}
