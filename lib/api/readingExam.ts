import { asNumber, asString, isRecord, pickAlias } from "./decode";

export type ReadingExamItem = {
  readingTextId: string;
  questionId: string;
  prompt: string;
  options: string[];
  passageTitle: string;
  passageText: string;
};

export type ReadingExamStart = {
  examSessionId: string;
  timeLimitSeconds: number;
  items: ReadingExamItem[];
};

export type ReadingExamAnswer = {
  readingTextId: string;
  questionId: string;
  selectedIndex: number;
};

function decodeOptions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => asString(item)).filter(Boolean);
}

function itemsFromPassage(passage: Record<string, unknown>): ReadingExamItem[] {
  const readingTextId = asString(pickAlias(passage, "readingTextId", "id", "reading_text_id"));
  const passageTitle = asString(pickAlias(passage, "title", "headline"));
  const passageText = asString(pickAlias(passage, "text", "body", "content", "passage"));
  const questions = Array.isArray(passage.questions) ? passage.questions : [];
  return questions.filter(isRecord).map((question, index) => ({
    readingTextId,
    questionId: asString(pickAlias(question, "questionId", "id"), `q-${index}`),
    prompt: asString(pickAlias(question, "prompt", "question", "stem", "text")),
    options: decodeOptions(pickAlias(question, "options", "choices")),
    passageTitle,
    passageText,
  })).filter((item) => item.readingTextId && item.questionId && item.options.length > 0);
}

export function decodeReadingExamStart(raw: unknown): ReadingExamStart | null {
  if (!isRecord(raw)) return null;
  const examSessionId = asString(pickAlias(raw, "examSessionId", "examId", "id"));
  if (!examSessionId) return null;
  const timeLimitSeconds = asNumber(pickAlias(raw, "timeLimitSeconds", "timeLimit", "durationSeconds"), 0);
  const passages = pickAlias(raw, "passages", "items", "forms");
  let items: ReadingExamItem[] = [];
  if (Array.isArray(passages)) {
    for (const passage of passages) {
      if (!isRecord(passage)) continue;
      if (Array.isArray(passage.questions)) items = items.concat(itemsFromPassage(passage));
      else if (passage.questionId || passage.prompt) {
        items.push({
          readingTextId: asString(pickAlias(passage, "readingTextId", "id")),
          questionId: asString(pickAlias(passage, "questionId", "id")),
          prompt: asString(pickAlias(passage, "prompt", "question", "stem")),
          options: decodeOptions(pickAlias(passage, "options", "choices")),
          passageTitle: asString(pickAlias(passage, "title", "passageTitle")),
          passageText: asString(pickAlias(passage, "text", "passageText", "passage")),
        });
      }
    }
  }
  items = items.filter((item) => item.readingTextId && item.questionId && item.options.length > 0);
  if (items.length === 0) return null;
  return { examSessionId, timeLimitSeconds, items };
}

export function unansweredIndex(): number {
  return -1;
}

export function buildFinishPayload(examSessionId: string, answers: ReadingExamAnswer[]): {
  examId: string;
  answers: ReadingExamAnswer[];
} {
  return { examId: examSessionId, answers };
}
