import { asString, isRecord } from "@/lib/api/decode";

/**
 * Whether the Coach door is worth opening at all — as a pure decision.
 *
 * `GET /speaking/coach/readiness` answers with the feature flag and whether a
 * conversation provider is configured. This FAILS CLOSED: an error, an
 * unparsable body or a blocked report all hide the Coach, because offering a
 * door that can only 503 is worse than not offering it.
 *
 * Availability, not entitlement. Whether THIS learner may start a session —
 * consent, minutes — is `GET /coach/mission`, read on the Coach screen itself
 * where the answer can actually be acted on.
 */
export function interpretCoachReadiness(status: number, body: unknown): { available: boolean } {
  if (status >= 400 || !isRecord(body)) return { available: false };
  const enabled = body.coachEnabled === true;
  const configured = body.providerConfigured === true;
  return { available: enabled && configured && asString(body.status) !== "blocked" };
}
