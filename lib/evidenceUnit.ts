/**
 * The backend's `evidence.unit` is a raw column-style token —
 * "questions_answered", "attempts_recorded". Printed verbatim it reads as
 * a leaked database field. This only reformats the string for display;
 * the count itself is never touched.
 */
export function evidenceUnit(unit: string | null | undefined, fallback = "attempts"): string {
  const raw = (unit ?? "").trim();
  if (!raw) return fallback;
  return raw.replace(/[_-]+/g, " ").toLowerCase();
}
