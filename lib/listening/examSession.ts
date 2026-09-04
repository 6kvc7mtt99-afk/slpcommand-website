import { apiRequest } from "@/lib/api/client";
import { clearPersistentClientKey, examIntentKey, persistentClientKey } from "@/lib/api/idempotency";
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
  return persistentClientKey(listeningExamStorageKey(userId));
}

export function clearListeningExamIntent(userId: string): void {
  clearPersistentClientKey(listeningExamStorageKey(userId));
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

/**
 * The outcome of persisting ONE exam answer.
 *
 * ER-02. The caller used to `await` this inside a bare try/catch that swallowed
 * every failure with the comment "finish still sends last known" — which is
 * false: `finishListeningExam` posts only the examSessionId, with no answers at
 * all. So a dropped answer POST left the option visually selected on screen
 * while the server had never received it, and the item was scored as
 * UNANSWERED. The learner saw their own choice and was marked as having left it
 * blank, on a timed exam that costs one credit a month on Free.
 *
 * The server already says exactly what happened — `{ ok, saved: true, position,
 * secondsRemaining }` — and the client simply threw the confirmation away.
 *
 * `retryable` is the important distinction. The write is an UPDATE keyed by
 * (session, position), so re-sending the same answer is naturally idempotent
 * and safe. A 409 is not: the session is closed or expired, and retrying would
 * only produce the same refusal.
 */
export type ExamAnswerOutcome =
  | { status: "saved"; position: number; secondsRemaining: number | null }
  | { status: "failed"; position: number; retryable: boolean; reason: string };

export async function submitListeningExamAnswer(
  examSessionId: string,
  position: number,
  selectedIndex: number,
): Promise<ExamAnswerOutcome> {
  try {
    const raw = await apiRequest<unknown>("/listening/slp/exam/answer", {
      method: "POST",
      body: { examSessionId, position, selectedIndex },
    });
    const rec = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    // Only the server's own confirmation counts as saved. A 2xx with an
    // unexpected body is not evidence the answer was persisted.
    if (rec.saved === true || rec.ok === true) {
      const secs = rec.secondsRemaining;
      return {
        status: "saved",
        position,
        secondsRemaining: typeof secs === "number" && Number.isFinite(secs) ? secs : null,
      };
    }
    return { status: "failed", position, retryable: true, reason: "unconfirmed" };
  } catch (err) {
    const code = err && typeof err === "object" && "status" in err ? Number((err as { status: unknown }).status) : 0;
    // 409 = session closed or expired. 4xx other than 408/429 will not succeed
    // on a retry either; everything else (transport, 5xx, timeout) will.
    const terminal = code === 409 || (code >= 400 && code < 500 && code !== 408 && code !== 429);
    return { status: "failed", position, retryable: !terminal, reason: failureReason(code) };
  }
}

/**
 * Why the answer did not land, in terms the UI can speak about honestly.
 *
 * These are distinct situations and must not collapse into one message: a
 * closed session cannot accept the answer ever again, an expired login can once
 * the learner signs back in, and a network blip just needs re-sending. Calling
 * all of them "session closed" would be a guess presented as a fact.
 */
function failureReason(code: number): string {
  if (code === 409) return "session_closed";
  if (code === 404) return "item_not_found";
  if (code === 401 || code === 403) return "auth_lost";
  if (code === 0) return "transport";
  return `http_${code}`;
}

/**
 * Which answered positions the SERVER has not confirmed.
 *
 * Extracted so it can be tested without React: this predicate is what stands
 * between a learner and a silently blank answer, and `finishListeningExam`
 * posts no answers, so whatever this returns non-empty is exactly what would be
 * scored as unanswered. "saving" counts as unsent — an in-flight write is not a
 * confirmed one.
 */
export function unsentAnswerPositions(
  items: readonly { position: number }[],
  answers: readonly number[],
  saved: Readonly<Record<number, "saving" | "saved" | "failed">>,
): number[] {
  return items
    .map((item, at) => ({ position: item.position, choice: answers[at] }))
    .filter((entry) => entry.choice != null && entry.choice >= 0 && saved[entry.position] !== "saved")
    .map((entry) => entry.position);
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
