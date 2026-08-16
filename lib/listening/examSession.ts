import { apiRequest } from "@/lib/api/client";
import { examIntentKey, newIdempotencyKey } from "@/lib/api/idempotency";
import {
  decodeExamState,
  decodeListeningExamStart,
  decodePlayResult,
  type ListeningExamStart,
  type ListeningPlayResult,
} from "@/lib/api/listeningExam";

let inflight: Promise<ListeningExamStart> | null = null;
let cached: ListeningExamStart | null = null;

export function listeningExamStorageKey(userId: string, day?: Date): string {
  return examIntentKey(userId, "listening", day);
}

export function getListeningExamIdempotencyKey(userId: string): string {
  const storageKey = listeningExamStorageKey(userId);
  try {
    const existing = sessionStorage.getItem(storageKey);
    if (existing) return existing;
    const created = newIdempotencyKey();
    sessionStorage.setItem(storageKey, created);
    return created;
  } catch {
    return newIdempotencyKey();
  }
}

export function clearListeningExamIntent(userId: string): void {
  try {
    sessionStorage.removeItem(listeningExamStorageKey(userId));
  } catch {
    /* ignore */
  }
  inflight = null;
  cached = null;
}

export function startListeningExam(userId: string): Promise<ListeningExamStart> {
  const key = getListeningExamIdempotencyKey(userId);
  if (cached) return Promise.resolve(cached);
  if (inflight) return inflight;
  inflight = apiRequest<unknown>("/listening/slp/exam/start", {
    method: "POST",
    body: { totalQuestions: 20, timeLimitMinutes: 20 },
    idempotencyKey: key,
  }).then((raw) => {
    const start = decodeListeningExamStart(raw);
    if (!start) throw new Error("invalid_exam");
    cached = start;
    inflight = null;
    return start;
  }).catch((err) => {
    inflight = null;
    throw err;
  });
  return inflight;
}

export async function requestListeningPlay(examSessionId: string, position: number): Promise<ListeningPlayResult> {
  const raw = await apiRequest<unknown>("/listening/slp/exam/play", {
    method: "POST",
    body: { examSessionId, position },
  });
  return decodePlayResult(raw);
}

export function submitListeningExamAnswer(examSessionId: string, position: number, selectedIndex: number): Promise<unknown> {
  return apiRequest("/listening/slp/exam/answer", {
    method: "POST",
    body: { examSessionId, position, selectedIndex },
  });
}

export async function loadListeningExamState(examSessionId: string, length: number) {
  const raw = await apiRequest<unknown>(`/listening/slp/exam/state?examSessionId=${encodeURIComponent(examSessionId)}`);
  return decodeExamState(raw, length);
}

export function finishListeningExam(examSessionId: string): Promise<unknown> {
  return apiRequest("/listening/slp/exam/finish", {
    method: "POST",
    body: { examSessionId },
  });
}
