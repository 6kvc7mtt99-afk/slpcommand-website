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

function decodeQuestion(value: unknown, index: number): ReadingQuestion | null {
  if (!isRecord(value)) return null;
  const optionsRaw = pickAlias(value, "options", "choices");
  const options = Array.isArray(optionsRaw) ? optionsRaw.map((item) => asString(item)).filter(Boolean) : [];
  if (options.length === 0) return null;
  const correctRaw = pickAlias(value, "correctIndex", "correct_index");
  return {
    questionId: asString(pickAlias(value, "questionId", "id"), `q-${index}`),
    prompt: asString(pickAlias(value, "prompt", "question", "stem", "text")),
    options,
    correctIndex: correctRaw == null ? null : asNumber(correctRaw, -1),
    explanation: asString(pickAlias(value, "explanation", "rationale")),
  };
}

export function decodeReadingPassage(raw: unknown): ReadingPassage | null {
  if (!isRecord(raw)) return null;
  const nested = isRecord(raw.passage) ? raw.passage : raw;
  const questionsRaw = pickAlias(nested, "questions") ?? pickAlias(raw, "questions");
  const questions = Array.isArray(questionsRaw)
    ? questionsRaw.map(decodeQuestion).filter((item): item is ReadingQuestion => item != null)
    : [];
  const text = asString(pickAlias(nested, "text", "body", "content", "passage"));
  const readingTextId = asString(pickAlias(nested, "readingTextId", "id", "reading_text_id"));
  if (!readingTextId || !text || questions.length === 0) return null;
  return {
    readingTextId,
    title: asString(pickAlias(nested, "title", "headline")),
    text,
    genreDescriptor: asString(pickAlias(nested, "genreDescriptor", "genre", "genre_descriptor")),
    difficulty: asString(pickAlias(nested, "difficulty", "textDifficulty", "poolDifficulty")),
    questions,
  };
}

export function liveQuestionCount(passage: ReadingPassage): number {
  return passage.questions.length;
}
