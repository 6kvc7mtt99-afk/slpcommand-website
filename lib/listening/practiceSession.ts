import { apiRequest } from "@/lib/api/client";
import { newIdempotencyKey } from "@/lib/api/idempotency";
import { decodeListeningItem, type ListeningItem } from "@/lib/api/listening";

type Slot = { key: string; inflight: Promise<ListeningItem> | null; item: ListeningItem | null };
let slot: Slot = { key: "", inflight: null, item: null };

export function currentListeningPracticeKey(): string {
  if (!slot.key) slot.key = newIdempotencyKey();
  return slot.key;
}

export function rotateListeningPracticeKey(): string {
  slot = { key: newIdempotencyKey(), inflight: null, item: null };
  return slot.key;
}

export function resetListeningPracticeSession(): void {
  slot = { key: "", inflight: null, item: null };
}

export function loadListeningNext(focus?: { focusSkill?: string; focusSubSkill?: string }): Promise<ListeningItem> {
  const key = currentListeningPracticeKey();
  if (slot.item) return Promise.resolve(slot.item);
  if (slot.inflight) return slot.inflight;
  const params = new URLSearchParams({ mode: "training" });
  if (focus?.focusSkill) params.set("focusSkill", focus.focusSkill);
  else if (focus?.focusSubSkill) params.set("focusSubSkill", focus.focusSubSkill);
  slot.inflight = apiRequest<unknown>(`/listening/slp/next?${params.toString()}`, { idempotencyKey: key })
    .then((raw) => {
      const item = decodeListeningItem(raw);
      if (!item) throw new Error("invalid_listening");
      slot.item = item;
      slot.inflight = null;
      return item;
    })
    .catch((err) => {
      slot.inflight = null;
      throw err;
    });
  return slot.inflight;
}

export function submitListeningAnswer(input: {
  listeningId: string;
  questionId: string;
  selectedIndex: number;
}): Promise<unknown> {
  return apiRequest("/listening/slp/answer", {
    method: "POST",
    body: {
      listeningId: input.listeningId,
      questionId: input.questionId,
      selectedIndex: input.selectedIndex,
      mode: "training",
    },
  });
}
