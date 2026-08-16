import { asString, isRecord, pickAlias } from "./decode";
import { textList } from "./academy";

export type OrchestratorNext = {
  coachHeadline: string;
  coachDetail: string;
  coachAction: string;
  missionTitle: string;
  missionObjective: string;
  academyTitle: string;
  academyReason: string;
  academyLessonId: string;
  micromission: string;
  readiness: Record<string, unknown>;
};

export type TransformResult = {
  original: string;
  upgraded: string;
  explanation: string;
  featuresAdded: string[];
  memorisePhrases: string[];
};

export type ExaminerResult = {
  summary: string;
  sentenceFeedback: Array<{ original: string; category: string; severity: string; explanation: string; improved: string }>;
  priorityFocus: string[];
  memoriseThese: string[];
};

export function decodeOrchestrator(raw: unknown): OrchestratorNext {
  const rec = isRecord(raw) ? raw : {};
  const coach = isRecord(rec.coach) ? rec.coach : {};
  const mission = isRecord(rec.mission) ? rec.mission : {};
  const academy = isRecord(rec.academy) ? rec.academy : {};
  const lesson = isRecord(academy.lesson) ? academy.lesson : academy;
  const micro = isRecord(rec.micromission) ? rec.micromission : isRecord(rec.drill) ? rec.drill : {};
  return {
    coachHeadline: asString(coach.headline),
    coachDetail: asString(coach.detail),
    coachAction: asString(coach.action),
    missionTitle: asString(pickAlias(mission, "title", "id")),
    missionObjective: asString(pickAlias(mission, "objective", "briefing")),
    academyTitle: asString(pickAlias(lesson, "title", academy.title ? "title" : "reason")),
    academyReason: asString(academy.reason),
    academyLessonId: asString(pickAlias(lesson, "id", "lessonId")),
    micromission: asString(pickAlias(isRecord(micro.micromission) ? micro.micromission : micro, "instruction", "reason")),
    readiness: isRecord(rec.readinessSummary) ? rec.readinessSummary : isRecord(rec.readiness) ? rec.readiness : {},
  };
}

export function decodeTransform(raw: unknown): TransformResult | null {
  const rec = isRecord(raw) ? raw : {};
  const upgraded = asString(pickAlias(rec, "upgraded", "transformed"));
  if (!upgraded) return null;
  return {
    original: asString(rec.original),
    upgraded,
    explanation: asString(rec.explanation),
    featuresAdded: textList(rec.featuresAdded),
    memorisePhrases: textList(rec.memorisePhrases),
  };
}

export function decodeExaminer(raw: unknown): ExaminerResult | null {
  const rec = isRecord(raw) ? raw : {};
  const list = Array.isArray(rec.sentenceFeedback) ? rec.sentenceFeedback : [];
  return {
    summary: asString(rec.summary),
    sentenceFeedback: list.filter(isRecord).map((item) => ({
      original: asString(item.original),
      category: asString(item.category),
      severity: asString(item.severity),
      explanation: asString(item.explanation),
      improved: asString(item.improved),
    })),
    priorityFocus: textList(rec.priorityFocus),
    memoriseThese: textList(rec.memoriseThese),
  };
}
