import { asNumber, asString, isRecord, pickAlias } from "./decode";

export type ListeningItem = {
  listeningId: string;
  questionId: string;
  audioUrl: string;
  prompt: string;
  options: string[];
  correctIndex: number | null;
};

export type ListeningAnswerResult = {
  isCorrect: boolean | null;
  correctIndex: number | null;
  explanation: string;
};

function audioFrom(record: Record<string, unknown>): string {
  const direct = asString(pickAlias(record, "audioUrl", "audio_url", "url", "src", "audio"));
  if (direct) return direct;
  const nested = pickAlias(record, "audio", "file");
  if (isRecord(nested)) {
    return asString(pickAlias(nested, "url", "src", "audioUrl", "audio_url"));
  }
  return "";
}

function optionsFrom(record: Record<string, unknown>): string[] {
  const raw = pickAlias(record, "options", "choices");
  const parsed = typeof raw === "string"
    ? (() => {
        try {
          return JSON.parse(raw);
        } catch {
          return [];
        }
      })()
    : raw;
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((item) => (isRecord(item) ? asString(pickAlias(item, "text", "label", "option")) : asString(item)))
    .filter(Boolean);
}

export function decodeListeningItem(raw: unknown): ListeningItem | null {
  if (!isRecord(raw)) return null;
  const listening = isRecord(raw.listening) ? raw.listening : isRecord(raw.item) ? raw.item : raw;
  const question = isRecord(raw.question)
    ? raw.question
    : isRecord(listening) && isRecord(listening.question)
      ? listening.question
      : raw;
  const audioUrl = audioFrom(listening) || audioFrom(raw);
  const options = optionsFrom(question);
  if (!audioUrl || options.length === 0) return null;
  return {
    listeningId: asString(pickAlias(listening, "id", "listeningId", "listening_id", "clipId")),
    questionId: asString(pickAlias(question, "id", "questionId", "question_id"), "q1"),
    audioUrl,
    prompt: asString(pickAlias(question, "question", "prompt", "stem")),
    options,
    correctIndex: pickAlias(question, "correctIndex", "correct_index") == null
      ? null
      : asNumber(pickAlias(question, "correctIndex", "correct_index"), -1),
  };
}

export function decodeListeningAnswer(raw: unknown): ListeningAnswerResult {
  if (!isRecord(raw)) return { isCorrect: null, correctIndex: null, explanation: "" };
  const correctRaw = pickAlias(raw, "correctIndex", "correct_index");
  return {
    isCorrect: pickAlias(raw, "isCorrect", "correct", "ok") == null
      ? null
      : Boolean(pickAlias(raw, "isCorrect", "correct")),
    correctIndex: correctRaw == null ? null : asNumber(correctRaw, -1),
    explanation: asString(pickAlias(raw, "explanation", "reason", "feedback")),
  };
}
