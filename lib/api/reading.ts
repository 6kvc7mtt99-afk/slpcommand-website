import { asNumber, asString, isRecord, pickAlias } from "./decode";

export type ReadingQuestion = {
  questionId: string;
  prompt: string;
  options: string[];
  correctIndex: number | null;
  explanation: string;
};

export type ReadingPassage = {
  readingTextId: string;
  title: string;
  text: string;
  genreDescriptor: string;
  difficulty: string;
  questions: ReadingQuestion[];
};

function decodeOptions(value: unknown): string[] {
  const raw = typeof value === "string" ? (() => {
    try {
      return JSON.parse(value);
    } catch {
      return [];
    }
  })() : value;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => (isRecord(item) ? asString(pickAlias(item, "text", "label", "option")) : asString(item)))
    .filter(Boolean);
}

function decodeQuestion(value: unknown, index: number): ReadingQuestion | null {
  if (!isRecord(value)) return null;
  const options = decodeOptions(pickAlias(value, "options", "choices"));
  if (options.length === 0) return null;
  const correctRaw = pickAlias(value, "correctIndex", "correct_index");
  return {
    questionId: asString(pickAlias(value, "questionId", "id"), `q-${index}`),
    prompt: asString(pickAlias(value, "questionText", "prompt", "question", "stem", "text")),
    options,
    correctIndex: correctRaw == null ? null : asNumber(correctRaw, -1),
    explanation: asString(pickAlias(value, "explanation", "rationale")),
  };
}

/** Live Express: `{ text: { id, title, content }, questions }`. Mock/flat fixtures remain accepted. */
function textBlock(raw: Record<string, unknown>): Record<string, unknown> {
  if (isRecord(raw.text)) return raw.text;
  if (isRecord(raw.passage)) return isRecord(raw.passage.text) ? raw.passage.text : raw.passage;
  return raw;
}

export function decodeReadingPassage(raw: unknown): ReadingPassage | null {
  if (!isRecord(raw)) return null;
  const block = textBlock(raw);
  const questionsRaw = pickAlias(raw, "questions") ?? pickAlias(block, "questions");
  const questions = Array.isArray(questionsRaw)
    ? questionsRaw.map(decodeQuestion).filter((item): item is ReadingQuestion => item != null)
    : [];
  const text = asString(pickAlias(block, "content", "text", "body", "passage"));
  const readingTextId = asString(pickAlias(block, "id", "readingTextId", "reading_text_id"));
  if (!readingTextId || !text || questions.length === 0) return null;
  return {
    readingTextId,
    title: asString(pickAlias(block, "title", "headline")),
    text,
    genreDescriptor: asString(pickAlias(block, "textType", "genreDescriptor", "genre", "genre_descriptor", "domain")),
    difficulty: asString(pickAlias(block, "difficulty", "textDifficulty", "poolDifficulty", "levelBand")),
    questions,
  };
}

export function liveQuestionCount(passage: ReadingPassage): number {
  return passage.questions.length;
}
