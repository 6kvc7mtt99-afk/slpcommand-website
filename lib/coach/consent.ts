/**
 * The exact language shown at consent time.
 *
 * Verbatim from the shipped iOS copy (`CoachConsentCopy`) — the same version
 * string travels to the server with every grant
 * (`coach_consents.policy_version`), so what was agreed to is always
 * reconstructible and a web grant and an iOS grant mean the same thing.
 *
 * Claims kept scrupulously accurate: no "Europe only", no "never stored", no
 * "Zero Retention". Do not edit this text without bumping the version.
 */
export const COACH_CONSENT_POLICY_VERSION = "coach-consent-1.0.0";

export const COACH_CONSENT_TITLE = "Before you start the AI Coach";

export const COACH_CONSENT_BODY =
  "The AI Speaking Coach holds a live voice conversation with you. " +
  "Your voice is processed by ElevenLabs, our conversation provider, " +
  "which may process it in the United States, the European Union or Singapore " +
  "under the EU-US Data Privacy Framework and standard contractual clauses. " +
  "The conversation transcript is stored in your SLP Command account; " +
  "the provider's own copy is retained only briefly. " +
  "After each session, the same evaluation engine that reviews your recorded " +
  "Speaking reads the transcript — the Coach itself never grades you, and " +
  "nothing here is an official SLP or STANAG assessment. " +
  "You can revoke this consent and delete your sessions at any time.";
