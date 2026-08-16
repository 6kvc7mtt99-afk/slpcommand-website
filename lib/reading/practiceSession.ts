import { apiRequest } from "@/lib/api/client";
import { newIdempotencyKey } from "@/lib/api/idempotency";
import { decodeReadingPassage, type ReadingPassage } from "@/lib/api/reading";

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

export async function submitReadingAnswer(input: {
  readingTextId: string;
  questionId: string;
  selectedIndex: number;
}): Promise<unknown> {
  return apiRequest("/reading/answer", {
    method: "POST",
    body: {
      readingTextId: input.readingTextId,
      questionId: input.questionId,
      selectedIndex: input.selectedIndex,
      mode: "training",
    },
  });
}
