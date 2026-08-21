import { academyTargetLevel } from "@/lib/api/academy";
import promptsJson from "./prompts.json";

export type SpeakingCategory =
  | "briefing"
  | "sitrep"
  | "problemSolving"
  | "opinion"
  | "description"
  | "narrative"
  | "comparison"
  | "international";

export type SpeakingPrompt = {
  id: string;
  title: string;
  instruction: string;
  category: SpeakingCategory;
  level: "2" | "3";
  difficulty: string;
  suggestedSeconds: number;
  preparationSeconds: number;
  preparationPoints: string[];
  tags: string[];
  examCompatible: boolean;
};

export const speakingPromptLibrary = promptsJson as SpeakingPrompt[];

export function promptsForLevel(level: "2" | "3"): SpeakingPrompt[] {
  return speakingPromptLibrary.filter((prompt) => prompt.level === level);
}

export function selectExamPrompts(level: "2" | "3", random = Math.random): SpeakingPrompt[] {
  const pool = speakingPromptLibrary.filter((prompt) => prompt.level === level && prompt.examCompatible);
  const slots: SpeakingCategory[][] = [
    ["briefing", "sitrep"],
    ["problemSolving", "opinion"],
    ["comparison", "international"],
  ];
  const used = new Set<string>();
  const picked: SpeakingPrompt[] = [];
  for (const slot of slots) {
    const candidates = pool.filter((prompt) => slot.includes(prompt.category) && !used.has(prompt.id));
    const choice = candidates[Math.floor(random() * candidates.length)];
    if (choice) {
      used.add(choice.id);
      picked.push(choice);
    }
  }
  if (picked.length < 3) {
    for (const prompt of pool) {
      if (used.has(prompt.id)) continue;
      used.add(prompt.id);
      picked.push(prompt);
      if (picked.length === 3) break;
    }
  }
  if (picked.length < 3) {
    for (const prompt of speakingPromptLibrary.filter((item) => item.level === level)) {
      if (used.has(prompt.id)) continue;
      used.add(prompt.id);
      picked.push(prompt);
      if (picked.length === 3) break;
    }
  }
  return picked.slice(0, 3);
}

// Reuses the one canonical target-level parser rather than a second
// transformation that can quietly drift from it — this used to default
// to SLP 3 for a missing/unrecognised value, which meant a failed or
// still-loading /profile fetch could silently arm a live exam with the
// wrong level. Callers now get null and render an honest unavailable
// state instead.
export function speakingTargetLevel(raw: unknown): "2" | "3" | null {
  return academyTargetLevel(raw);
}
