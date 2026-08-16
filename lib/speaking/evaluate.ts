import { asBool, asString, isRecord, pickAlias } from "@/lib/api/decode";

export type SpeakingCriterion = {
  met: boolean;
  evidence: string;
  note: string;
};

export type SpeakingRating = {
  credited: boolean;
  levelAttempted: string;
  limitingCriterion: string | null;
  failedOn: string[];
  criteria: {
    content: SpeakingCriterion;
    tasks: SpeakingCriterion;
    accuracy: SpeakingCriterion;
    textProduced: SpeakingCriterion;
  };
  band: null;
  confidence: string | null;
  ratable: boolean;
  ratableReason: string | null;
};

export type SpeakingEvaluateResult = {
  attemptId: string;
  createdAt: string;
  transcript: string;
  targetLevel: string;
  promptTitle: string;
  mode: string;
  rating: SpeakingRating;
};

function criterion(raw: unknown): SpeakingCriterion {
  const rec = isRecord(raw) ? raw : {};
  return {
    met: asBool(rec.met, false),
    evidence: asString(rec.evidence),
    note: asString(rec.note),
  };
}

export function decodeSpeakingEvaluate(raw: unknown): SpeakingEvaluateResult | null {
  const rec = isRecord(raw) ? raw : {};
  const ratingRaw = isRecord(rec.rating) ? rec.rating : {};
  const criteriaRaw = isRecord(ratingRaw.criteria) ? ratingRaw.criteria : {};
  const attemptId = asString(pickAlias(rec, "attempt_id", "attemptId"));
  if (!attemptId) return null;
  return {
    attemptId,
    createdAt: asString(pickAlias(rec, "created_at", "createdAt")),
    transcript: asString(rec.transcript),
    targetLevel: asString(pickAlias(rec, "target_level", "targetLevel")),
    promptTitle: asString(pickAlias(rec, "prompt_title", "promptTitle")),
    mode: asString(rec.mode, "practice"),
    rating: {
      credited: asBool(ratingRaw.credited, false),
      levelAttempted: asString(pickAlias(ratingRaw, "level_attempted", "levelAttempted")),
      limitingCriterion: asString(pickAlias(ratingRaw, "limiting_criterion", "limitingCriterion")) || null,
      failedOn: Array.isArray(ratingRaw.failed_on)
        ? ratingRaw.failed_on.map(String)
        : Array.isArray(ratingRaw.failedOn)
          ? ratingRaw.failedOn.map(String)
          : [],
      criteria: {
        content: criterion(criteriaRaw.content),
        tasks: criterion(criteriaRaw.tasks),
        accuracy: criterion(criteriaRaw.accuracy),
        textProduced: criterion(criteriaRaw.textProduced ?? criteriaRaw.text_produced),
      },
      band: null,
      confidence: asString(pickAlias(ratingRaw, "confidence")) || null,
      ratable: ratingRaw.ratable !== false,
      ratableReason: asString(pickAlias(ratingRaw, "ratable_reason", "ratableReason")) || null,
    },
  };
}

export async function speakingEvaluateKey(filename: string, durationSeconds: number): Promise<string> {
  const bytes = new TextEncoder().encode(`${filename}:${durationSeconds}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hex = Array.from(new Uint8Array(digest))
    .map((item) => item.toString(16).padStart(2, "0"))
    .join("");
  return `seval-${hex}`;
}

export function canSubmitSpeaking(seconds: number, min = 15): boolean {
  return seconds >= min;
}
