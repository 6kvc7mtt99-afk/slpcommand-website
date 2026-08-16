import { asNumber, asString, isRecord, pickAlias } from "./decode";

export type ListeningItem = {
  listeningId: string;
  questionId: string;
  audioUrl: string;
  prompt: string;
  options: string[];
  correctIndex: number | null;
};

export function decodeListeningItem(raw: unknown): ListeningItem | null {
  if (!isRecord(raw)) return null;
  const nested = isRecord(raw.item) ? raw.item : isRecord(raw.question) ? raw.question : raw;
  const audioUrl = asString(pickAlias(nested, "audioUrl", "url", "src", "audio"));
  const optionsRaw = pickAlias(nested, "options", "choices");
  const options = Array.isArray(optionsRaw) ? optionsRaw.map((item) => asString(item)).filter(Boolean) : [];
  if (!audioUrl || options.length === 0) return null;
  const correctRaw = pickAlias(nested, "correctIndex", "correct_index");
  return {
    listeningId: asString(pickAlias(nested, "listeningId", "id", "listening_id", "clipId")),
    questionId: asString(pickAlias(nested, "questionId", "question_id"), "q1"),
    audioUrl,
    prompt: asString(pickAlias(nested, "prompt", "question", "stem")),
    options,
    correctIndex: correctRaw == null ? null : asNumber(correctRaw, -1),
  };
}
