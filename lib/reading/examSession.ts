import { apiRequest } from "@/lib/api/client";
import { clearPersistentClientKey, examIntentKey, persistentClientKey } from "@/lib/api/idempotency";
import {
  buildFinishPayload,
  decodeReadingExamStart,
  type ReadingExamAnswer,
  type ReadingExamStart,
} from "@/lib/api/readingExam";

let inflight: Promise<ReadingExamStart> | null = null;
let cached: { key: string; start: ReadingExamStart } | null = null;

export function readingExamStorageKey(userId: string, day?: Date): string {
  return examIntentKey(userId, "reading", day);
}

export function getReadingExamIdempotencyKey(userId: string): string {
  return persistentClientKey(readingExamStorageKey(userId));
}

export function clearReadingExamIntent(userId: string): void {
  clearPersistentClientKey(readingExamStorageKey(userId));
  inflight = null;
  cached = null;
}

export function startReadingExam(userId: string): Promise<ReadingExamStart> {
  const key = getReadingExamIdempotencyKey(userId);
  if (cached?.key === key && cached.start) return Promise.resolve(cached.start);
  if (inflight) return inflight;
  inflight = apiRequest<unknown>("/reading/exam/start-v2", {
    method: "POST",
    body: { passageCount: 20, questionsPerPassage: 1 },
    idempotencyKey: key,
  }).then((raw) => {
    const start = decodeReadingExamStart(raw);
    if (!start) throw new Error("invalid_exam");
    cached = { key, start };
    inflight = null;
    return start;
  }).catch((err) => {
    inflight = null;
    throw err;
  });
  return inflight;
}

export function finishReadingExam(examSessionId: string, answers: ReadingExamAnswer[]): Promise<unknown> {
  return apiRequest("/reading/exam/finish", {
    method: "POST",
    body: buildFinishPayload(examSessionId, answers),
  });
}
