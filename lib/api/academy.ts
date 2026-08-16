import { asNumber, asString, isRecord, pickAlias } from "./decode";

export function academyTargetLevel(raw: unknown): "2" | "3" {
  const value = asString(raw);
  return value === "2" || value === "2+" ? "2" : "3";
}

export function textList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => asString(item)).filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value];
  return [];
}

export type AcademyLesson = {
  id: string;
  title: string;
  module: string;
  unit: string;
  level: string;
  learningObjective: string;
  successCriteria: string[];
  estimatedMinutes: number;
  difficulty: string;
  strategy: string;
  conceptExplanation: string;
  commonMisconception: string;
  reflectionQuestions: string[];
  competencyId: string;
  competencyTitle: string;
};

export function decodeAcademyLesson(raw: unknown): AcademyLesson | null {
  const rec = isRecord(raw) ? raw : null;
  const source = rec && isRecord(rec.lesson) ? (rec.lesson as Record<string, unknown>) : rec;
  if (!source) return null;
  const id = asString(pickAlias(source, "id", "lessonId"));
  const title = asString(pickAlias(source, "title", "name"));
  if (!id || !title) return null;
  return {
    id,
    title,
    module: asString(source.module),
    unit: asString(source.unit),
    level: asString(source.level),
    learningObjective: asString(pickAlias(source, "learningObjective", "objective")),
    successCriteria: textList(source.successCriteria),
    estimatedMinutes: asNumber(source.estimatedMinutes, 0),
    difficulty: asString(source.difficulty),
    strategy: asString(source.strategy),
    conceptExplanation: asString(pickAlias(source, "conceptExplanation", "explanation")),
    commonMisconception: asString(source.commonMisconception),
    reflectionQuestions: textList(source.reflectionQuestions),
    competencyId: asString(source.competencyId),
    competencyTitle: asString(source.competencyTitle),
  };
}

export function stateLabel(state: string): string {
  if (state === "mastered") return "Sustained";
  if (state === "emerging") return "Developing";
  if (state === "weak") return "Needs work";
  if (state === "untested") return "Not asked yet";
  if (state === "blocked") return "Waiting on Level 2";
  return state || "Unknown";
}
