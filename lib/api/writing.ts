import { asNumber, asString, isRecord, pickAlias } from "./decode";

export type WritingGuidance = {
  suggestedStructure: string[];
  practiceTips: string[];
};

export type WritingPrompt = {
  writingPromptId: string;
  title: string;
  prompt: string;
  wordTarget: number;
  levelBand: string;
  guidance: WritingGuidance;
  audience: string;
  timeLimitMinutes: number;
  checklist: string[];
};

export type WritingCorrection = {
  writingAttemptId: string;
  correction: string;
  taskFulfilment: string;
  formative: boolean;
};

export type WritingAttempt = {
  id: string;
  mode: string;
  createdAt: string;
  preview: string;
};

function asStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => asString(item)).filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value];
  return [];
}

export function normalizeWritingGuidance(raw: unknown): WritingGuidance {
  const source = isRecord(raw) ? raw : {};
  const nested = isRecord(source.guidance) ? source.guidance : source;
  const alt = isRecord(source.writingGuidance) ? source.writingGuidance : nested;
  return {
    suggestedStructure: asStringList(pickAlias(alt, "suggestedStructure", "structure", "suggested_structure")),
    practiceTips: asStringList(pickAlias(alt, "practiceTips", "tips", "practice_tips")),
  };
}

export function decodeWritingPrompt(raw: unknown): WritingPrompt | null {
  if (!isRecord(raw)) return null;
  const nested = isRecord(raw.prompt) && !raw.writingPromptId ? (raw.prompt as Record<string, unknown>) : raw;
  const writingPromptId = asString(pickAlias(nested, "writingPromptId", "id", "promptId"));
  // Verified against the real backend on the deployed preview: the field is
  // `promptText`. Neither `prompt`, `text` nor `body` ever matched it, so this
  // decoder returned null on every real prompt and Writing practice showed
  // "No writing prompt is available right now." on a 100% success response —
  // the skill was unusable for every account, not a visual defect.
  const text = asString(pickAlias(nested, "promptText", "prompt", "text", "body"));
  if (!writingPromptId || !text) return null;
  // level2Task / level3Task carry the actual task instruction for that band;
  // the real payload also names an audience, a time limit and a self-check
  // checklist that existed on every request but were never read.
  const levelBand = asString(pickAlias(nested, "levelBand", "band", "level"));
  const taskInstruction = asString(
    levelBand === "2" ? nested.level2Task : levelBand === "3" ? nested.level3Task : undefined,
  ) || asString(pickAlias(nested, "level2Task", "level3Task"));
  return {
    writingPromptId,
    title: asString(pickAlias(nested, "title", "headline")),
    prompt: taskInstruction ? `${text}\n\n${taskInstruction}` : text,
    wordTarget: asNumber(pickAlias(nested, "wordTarget", "word_target"), 0),
    levelBand,
    guidance: normalizeWritingGuidance(nested),
    audience: asString(pickAlias(nested, "audience")),
    timeLimitMinutes: asNumber(pickAlias(nested, "timeLimitMinutes", "time_limit_minutes"), 0),
    checklist: asStringList(nested.checklist),
  };
}

export function decodeWritingCorrection(raw: unknown): WritingCorrection | null {
  if (!isRecord(raw)) return null;
  const correction = asString(pickAlias(raw, "correction", "feedback", "evaluation"));
  if (!correction) return null;
  return {
    writingAttemptId: asString(pickAlias(raw, "writingAttemptId", "id", "attemptId")),
    correction,
    taskFulfilment: asString(pickAlias(raw, "taskFulfilment", "task_fulfilment", "taskFulfillment")),
    formative: asString(pickAlias(raw, "mode")) === "formative_exam",
  };
}

export function decodeWritingAttempts(raw: unknown): WritingAttempt[] {
  const list = Array.isArray(raw) ? raw : isRecord(raw) ? (raw.attempts || raw.items || raw.data) : [];
  if (!Array.isArray(list)) return [];
  return list.filter(isRecord).map((item, index) => ({
    id: asString(pickAlias(item, "id", "writingAttemptId"), `att-${index}`),
    mode: asString(item.mode, "practice"),
    createdAt: asString(pickAlias(item, "createdAt", "created_at")),
    preview: asString(pickAlias(item, "preview", "excerpt", "userText")).slice(0, 180),
  }));
}

export async function writingSubmitKey(promptId: string, userText: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${promptId}:${userText}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hex = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  return `wsub-${hex}`;
}

export function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export function isSlp3Band(band: string): boolean {
  const value = band.trim().toLowerCase();
  return value === "3" || value === "slp3" || value === "slp 3" || value.startsWith("3");
}

export function submitModeForBand(band: string): "exam" | "formative_exam" {
  return isSlp3Band(band) ? "exam" : "formative_exam";
}

export const WRITING_EXAM_MINUTES = 70;
export const WRITING_EXAM_WORD_TARGET = 300;
export const WRITING_LOW_WORD_THRESHOLD = 180;
export const WRITING_LOW_WORD_SECONDS = 300;

export function draftStorageKey(userId: string): string {
  return `writing_exam_autosave:${userId}`;
}
