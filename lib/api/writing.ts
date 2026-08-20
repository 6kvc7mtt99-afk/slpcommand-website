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

/**
 * The competency model behind `/api/writing/learning-state` (real
 * response fields verified live against production: `version:
 * "writing_learning_state_v3"`, `modelVersion:
 * "writing_competencies_v3"`). This is the same evidence-based
 * coverage/blocking model Writing Academy's `readiness` counts already
 * come from — Intelligence reads the fuller object the Academy home
 * screen only takes a summary from, not a second, competing model.
 */
export type WritingCompetencyRef = { id: string; title: string };

export type WritingEvidenceExample = { text: string; severity: string; attemptId: string };

export type WritingBlockingCompetency = {
  id: string;
  title: string;
  branch: string;
  band: string;
  discriminator: string | null;
  state: string;
  demonstrations: number;
  examples: WritingEvidenceExample[];
};

export type WritingNextTraining = {
  id: string;
  title: string;
  state: string;
  band: string;
  why: string;
};

/** An EMID discriminator cluster (`levelThree[]`) — SLP3-specific, absent for a Level 2 target. */
export type WritingDiscriminator = {
  discriminator: string;
  label: string;
  status: string;
  prerequisitesOutstanding: string[];
};

export type WritingLearningState = {
  targetLevel: string;
  attempts: number;
  hasEvidence: boolean;
  summary: { mastered: number; emerging: number; weak: number; untested: number; blocked: number };
  blockingPromotion: WritingBlockingCompetency[];
  nextTraining: WritingNextTraining[];
  levelThree: WritingDiscriminator[];
};

function decodeExamples(raw: unknown): WritingEvidenceExample[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isRecord).map((e) => ({
    text: asString(e.text),
    severity: asString(e.severity),
    attemptId: asString(e.attemptId),
  })).filter((e) => e.text);
}

export function decodeWritingLearningState(raw: unknown): WritingLearningState | null {
  if (!isRecord(raw)) return null;
  const summarySrc = isRecord(raw.summary) ? raw.summary : {};
  const blocking = Array.isArray(raw.blockingPromotion) ? raw.blockingPromotion : [];
  const next = Array.isArray(raw.nextTraining) ? raw.nextTraining : [];
  return {
    targetLevel: asString(raw.targetLevel),
    attempts: asNumber(raw.attempts, 0),
    hasEvidence: raw.hasEvidence === true,
    summary: {
      mastered: asNumber(summarySrc.mastered, 0),
      emerging: asNumber(summarySrc.emerging, 0),
      weak: asNumber(summarySrc.weak, 0),
      untested: asNumber(summarySrc.untested, 0),
      blocked: asNumber(summarySrc.blocked, 0),
    },
    blockingPromotion: blocking.filter(isRecord).map((b) => ({
      id: asString(b.id),
      title: asString(b.title),
      branch: asString(b.branch),
      band: asString(b.band),
      discriminator: b.discriminator == null ? null : asString(b.discriminator),
      state: asString(b.state),
      demonstrations: asNumber(b.demonstrations, 0),
      examples: decodeExamples(isRecord(b.evidence) ? b.evidence.examples : null),
    })).filter((b) => b.id && b.title),
    nextTraining: next.filter(isRecord).map((n) => ({
      id: asString(n.id),
      title: asString(n.title),
      state: asString(n.state),
      band: asString(n.band),
      why: asString(n.why),
    })).filter((n) => n.id && n.title),
    levelThree: (Array.isArray(raw.levelThree) ? raw.levelThree : []).filter(isRecord).map((d) => ({
      discriminator: asString(d.discriminator),
      label: asString(d.label),
      status: asString(d.status),
      prerequisitesOutstanding: Array.isArray(d.prerequisitesOutstanding)
        ? d.prerequisitesOutstanding.map((p) => asString(p)).filter(Boolean)
        : [],
    })).filter((d) => d.discriminator && d.label),
  };
}

/** One row of the real 49-lesson Writing catalog (`/api/writing/academy/lessons`). */
export type WritingCatalogLesson = {
  id: string;
  title: string;
  module: string;
  competencyId: string;
  level: string;
  estimatedMinutes: number;
};

export function decodeWritingCatalog(raw: unknown): WritingCatalogLesson[] {
  if (!isRecord(raw) || !Array.isArray(raw.lessons)) return [];
  return raw.lessons.filter(isRecord).map((l) => ({
    id: asString(l.id),
    title: asString(l.title),
    module: asString(l.module),
    competencyId: asString(l.competencyId),
    level: asString(l.level),
    estimatedMinutes: asNumber(l.estimatedMinutes, 0),
  })).filter((l) => l.id && l.title);
}

/** module slug ("self_editing") -> real display title ("Self-Editing and Revision"), from the same response's `coverage.modules`. */
export function decodeWritingModuleTitles(raw: unknown): Map<string, string> {
  const map = new Map<string, string>();
  if (!isRecord(raw) || !isRecord(raw.coverage) || !Array.isArray(raw.coverage.modules)) return map;
  for (const m of raw.coverage.modules) {
    if (!isRecord(m)) continue;
    const key = asString(m.module);
    const title = asString(m.title);
    if (key && title) map.set(key, title);
  }
  return map;
}

/** competencyId ("W3.6") -> the real lesson that trains it, when the catalog has one. */
export function lessonByCompetency(catalog: WritingCatalogLesson[]): Map<string, WritingCatalogLesson> {
  const map = new Map<string, WritingCatalogLesson>();
  for (const lesson of catalog) {
    if (lesson.competencyId && !map.has(lesson.competencyId)) map.set(lesson.competencyId, lesson);
  }
  return map;
}
