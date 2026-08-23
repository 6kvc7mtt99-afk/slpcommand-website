export type CoachStartError =
  | "insufficientMinutes"
  // F3-21. Distinct from insufficientMinutes: one is "you have spent your
  // allowance", the other is "this is not your plan". Telling a Free learner
  // they are out of minutes they never had reads as a bug and hides the answer.
  | "proRequired"
  | "consentRequired"
  | "sessionAlreadyOpen"
  | "coachUnavailable"
  | "providerUnavailable"
  | "backendUnavailable"
  | "network"
  | "microphoneDenied"
  | "sdkUnavailable";

export const COACH_START_COPY: Record<CoachStartError, string> = {
  insufficientMinutes: "You're out of Coach minutes for now.",
  proRequired: "The AI Coach is part of Pro.",
  consentRequired: "Before your first session, review how the Coach processes your voice.",
  sessionAlreadyOpen: "A Coach session is already open on one of your devices.",
  coachUnavailable: "The AI Coach isn't available right now. Speaking Practice is.",
  providerUnavailable: "The AI Coach is temporarily unavailable. Please try again in a moment.",
  backendUnavailable: "We're having trouble on our side. Your minutes were not touched.",
  network: "Connection problem. Your minutes were not touched.",
  microphoneDenied: "The Coach needs your microphone. Enable it in the browser settings.",
  sdkUnavailable: "The conversation engine is not loaded.",
};

export function mapCoachStartError(input: {
  status?: number;
  error?: string;
  reason?: string;
  network?: boolean;
}): CoachStartError {
  if (input.network) return "network";
  const blob = `${input.error ?? ""} ${input.reason ?? ""}`;
  // Both are 402, so the body decides. Order matters: pro_required is the
  // more specific fact and must be tested first.
  if (blob.includes("pro_required")) return "proRequired";
  if (input.status === 402 || blob.includes("insufficient_minutes")) return "insufficientMinutes";
  if (input.status === 403 || blob.includes("consent_required")) return "consentRequired";
  if (input.status === 409 || blob.includes("session_already_open")) return "sessionAlreadyOpen";
  if (blob.includes("coach_disabled")) return "coachUnavailable";
  if (blob.includes("coach_unavailable")) return "providerUnavailable";
  if (input.status && input.status >= 500) return "backendUnavailable";
  return "backendUnavailable";
}
