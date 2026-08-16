import { academyTargetLevel } from "@/lib/api/academy";
import { loadProgress } from "./home";

export async function loadAcademyTargetLevel(): Promise<"2" | "3"> {
  const progress = await loadProgress();
  return academyTargetLevel(progress?.targetLevel);
}
