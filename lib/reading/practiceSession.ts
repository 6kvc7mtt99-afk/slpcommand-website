import { apiRequest } from "@/lib/api/client";
import { newIdempotencyKey } from "@/lib/api/idempotency";
import {
  decodeReadingAnswer,
  decodeReadingPassage,
  type ReadingAnswerResult,
  type ReadingPassage,
} from "@/lib/api/reading";

type Slot = {
  key: string;
  inflight: Promise<ReadingPassage> | null;
  passage: ReadingPassage | null;
};

let slot: Slot = { key: "", inflight: null, passage: null };

export function currentReadingPracticeKey(): string {
  if (!slot.key) slot.key = newIdempotencyKey();
  return slot.key;
}

export function rotateReadingPracticeKey(): string {
  slot = { key: newIdempotencyKey(), inflight: null, passage: null };
  return slot.key;
}

export function resetReadingPracticeSession(): void {
  slot = { key: "", inflight: null, passage: null };
}

export function loadReadingPassage(): Promise<ReadingPassage> {
  const key = currentReadingPracticeKey();
  if (slot.passage) return Promise.resolve(slot.passage);
  if (slot.inflight) return slot.inflight;
  slot.inflight = apiRequest<unknown>("/reading/passage", { idempotencyKey: key }).then((raw) => {
    const passage = decodeReadingPassage(raw);
    if (!passage) throw new Error("invalid_passage");
    slot.passage = passage;
    slot.inflight = null;
    return passage;
  }).catch((err) => {
    slot.inflight = null;
    throw err;
  });
  return slot.inflight;
}

/**
 * Submit one answer and return the SERVER's verdict.
 *
 * This used to return the raw response and every caller ignored it, which is
 * how the browser ended up grading itself — see decodeReadingAnswer for the
 * full account. The decoded result is the only honest source of correctness
 * for a Reading item, because the answer key never reaches the client.
 */
export async function submitReadingAnswer(input: {
  readingTextId: string;
  questionId: string;
  selectedIndex: number;
}): Promise<ReadingAnswerResult> {
  const raw = await apiRequest<unknown>("/reading/answer", {
    method: "POST",
    body: {
      readingTextId: input.readingTextId,
      questionId: input.questionId,
      selectedIndex: input.selectedIndex,
      mode: "training",
    },
  });
  return decodeReadingAnswer(raw);
}
