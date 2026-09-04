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

/**
 * What the SERVER said about one submitted answer.
 *
 * THE BUG THIS FIXES. Reading practice used to grade itself in the browser:
 * it awaited `POST /reading/answer`, threw the response away, and rendered
 * `correct={question.correctIndex != null && selected === question.correctIndex}`
 * from the answer key it believed came with the passage.
 *
 * CORRECTION (Phase 6). The original note here claimed the key "is never
 * there", citing server.js:2705-2707. That citation was wrong: those lines sit
 * inside the LEGACY `GET /api/reading/next` handler (declared at
 * server.js:2614), a route the proxy denies as legacy. The live practice route
 * is `GET /api/reading/passage` (server.js:3432), and it was doing the
 * OPPOSITE — `mapClusterQuestion(q, { includeAnswers: true })` attached
 * `correctIndex` (already remapped into the displayed, shuffled order) and
 * `explanation` to every question before the learner answered. So the client
 * fix below was right, but the explanation was not, and the leak it described
 * as impossible was in fact open on the wire. It is now closed at the source:
 * that call site passes `includeAnswers: false`, matching the exam route.
 *
 * Either way the client must not grade itself. When the key is absent
 * `correctIndex` decodes to null, the old expression collapsed to `false`, and
 * EVERY reading practice answer — right or wrong — was reported as "Not
 * quite", in the failure colour, with no option marked correct.
 *
 * The real verdict was in the response all along. `POST /api/reading/answer`
 * returns `{ wasCorrect, correctIndex, explanation, evidenceQuote, diagnosis,
 * newLevel }` (server.js:2941-2953), where `correctIndex` is the DISPLAYED
 * position in the shuffled order.
 *
 * `wasCorrect` is the backend's field name and is listed first. `ok` is
 * deliberately NOT an alias: it is a transport-level "request succeeded", and
 * reading it as a verdict would turn a bare `{ok:true}` envelope into
 * "Correct" — trading one fabricated verdict for another.
 */
export type ReadingAnswerResult = {
  /** null when the server returned no verdict — never treat as incorrect. */
  isCorrect: boolean | null;
  /** Displayed index of the correct option, in the shuffled order. */
  correctIndex: number | null;
  explanation: string;
  /** The line in the passage that supports the answer, when the item has one. */
  evidenceQuote: string;
};

export function decodeReadingAnswer(raw: unknown): ReadingAnswerResult {
  if (!isRecord(raw)) return { isCorrect: null, correctIndex: null, explanation: "", evidenceQuote: "" };
  const verdict = pickAlias(raw, "wasCorrect", "isCorrect", "correct", "was_correct", "is_correct");
  const correctRaw = pickAlias(raw, "correctIndex", "correct_index");
  return {
    isCorrect: verdict == null ? null : Boolean(verdict),
    correctIndex: correctRaw == null ? null : asNumber(correctRaw, -1),
    explanation: asString(pickAlias(raw, "explanation", "rationale", "reason", "feedback")),
    evidenceQuote: asString(pickAlias(raw, "evidenceQuote", "evidence_quote")),
  };
}
