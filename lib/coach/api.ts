import { FrontendError } from "@/lib/api/errors";
import { apiRequest } from "@/lib/api/client";
import { asNumber, asString, isRecord } from "@/lib/api/decode";
import { COACH_CONSENT_POLICY_VERSION } from "./consent";
import { mapCoachStartError, type CoachStartError } from "./errors";
import { decodeSessionPlan, type CoachSessionPlan } from "./plan";
import {
  decodeCoachSessionStart,
  decodeCoachSessionStatus,
  type CoachSessionStart,
  type CoachSessionStatus,
} from "./session";

export type CoachReadiness = {
  coachEnabled: boolean;
  providerConfigured: boolean;
  status: string;
};

/** `eligible | needs_consent | needs_minutes | unavailable` — the backend decides. */
export type CoachEligibility = string;

export type CoachMission = {
  objective: string;
  objectiveSource: string;
  rationale: string;
  estimatedMinutes: number;
  /**
   * The two minute pools, named. Never an ambiguous single total: included
   * minutes reset with the plan, purchased top-ups never expire, and the
   * client displays both — it never computes either.
   */
  availableMinutes: number;
  includedMinutes: number;
  purchasedMinutes: number;
  eligibility: CoachEligibility;
  blockedReason: string | null;
  /**
   * A PREVIEW of the class, so a learner can see it is a lesson before
   * agreeing to spend minutes on it. Null when the Coach is not on offer —
   * showing the shape of a class you cannot start would be an advertisement,
   * not information. The real plan is built at session start.
   */
  plan: CoachSessionPlan | null;
};

export type CoachBalance = {
  subscriptionSecs: number;
  topupSecs: number;
  totalSecs: number;
};

export class CoachStartFailure extends Error {
  readonly code: CoachStartError;
  readonly status: number;
  constructor(code: CoachStartError, status: number, message: string) {
    super(message);
    this.name = "CoachStartFailure";
    this.code = code;
    this.status = status;
  }
}

async function refreshOnce(): Promise<boolean> {
  const res = await fetch("/api/auth/refresh", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
  });
  return res.ok;
}

export async function fetchCoachReadiness(): Promise<CoachReadiness> {
  const raw = await apiRequest<Record<string, unknown>>("/speaking/coach/readiness");
  return {
    coachEnabled: raw.coachEnabled === true,
    providerConfigured: raw.providerConfigured === true,
    status: asString(raw.status),
  };
}

export async function fetchCoachMission(): Promise<CoachMission> {
  const raw = await apiRequest<Record<string, unknown>>("/speaking/coach/mission");
  const mission = isRecord(raw.mission) ? raw.mission : raw;
  return {
    objective: asString(mission.objective),
    objectiveSource: asString(mission.objectiveSource || mission.objective_source),
    rationale: asString(mission.rationale),
    estimatedMinutes: asNumber(mission.estimatedMinutes ?? mission.estimated_minutes, 0),
    availableMinutes: asNumber(mission.availableMinutes ?? mission.available_minutes, 0),
    includedMinutes: asNumber(mission.includedMinutes ?? mission.included_minutes, 0),
    purchasedMinutes: asNumber(mission.purchasedMinutes ?? mission.purchased_minutes, 0),
    eligibility: asString(mission.eligibility, "unavailable"),
    blockedReason: asString(mission.blockedReason || mission.blocked_reason) || null,
    plan: decodeSessionPlan(mission.plan),
  };
}

export async function fetchCoachBalance(): Promise<CoachBalance> {
  const raw = await apiRequest<Record<string, unknown>>("/speaking/coach/balance");
  return {
    subscriptionSecs: Number(raw.subscriptionSecs ?? raw.subscription_secs ?? 0) || 0,
    topupSecs: Number(raw.topupSecs ?? raw.topup_secs ?? 0) || 0,
    totalSecs: Number(raw.totalSecs ?? raw.total_secs ?? 0) || 0,
  };
}

/**
 * Record the grant SERVER-SIDE, versioned.
 *
 * The backend still hardcodes `source: "ios"` on the row — a documented
 * backend follow-up, not something this repo patches (authorization never
 * depended on `source`). `appVersion` is the honest client marker meanwhile.
 */
export async function recordCoachConsent(appVersion = "web"): Promise<void> {
  await apiRequest("/speaking/coach/consent", {
    method: "POST",
    body: {
      consentType: "granted",
      scope: "elevenlabs_conversation",
      policyVersion: COACH_CONSENT_POLICY_VERSION,
      appVersion,
    },
  });
}

export async function fetchCoachSessionStatus(id: string): Promise<CoachSessionStatus | null> {
  const raw = await apiRequest<unknown>(`/speaking/coach/session/${id}`);
  return decodeCoachSessionStatus(raw);
}

export async function startCoachSession(input: {
  objective?: string;
  objectiveSource?: string;
}): Promise<CoachSessionStart> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-SLP-Client": "web",
  };
  const exec = () =>
    fetch("/api/backend/speaking/coach/session", {
      method: "POST",
      credentials: "same-origin",
      headers,
      body: JSON.stringify({
        objective: input.objective ?? null,
        objectiveSource: input.objectiveSource ?? null,
      }),
    });

  let res: Response;
  try {
    res = await exec();
    if (res.status === 401) {
      const refreshed = await refreshOnce();
      if (refreshed) res = await exec();
    }
  } catch {
    throw new CoachStartFailure("network", 0, "network");
  }

  const rawText = await res.text();
  let parsed: unknown = null;
  try {
    parsed = rawText ? JSON.parse(rawText) : null;
  } catch {
    parsed = { error: rawText };
  }
  const record = isRecord(parsed) ? parsed : {};
  if (!res.ok) {
    const code = mapCoachStartError({
      status: res.status,
      error: asString(record.error),
      reason: asString(record.reason),
    });
    throw new CoachStartFailure(code, res.status, asString(record.error, code));
  }
  const decoded = decodeCoachSessionStart(parsed);
  if (!decoded) {
    throw new CoachStartFailure("backendUnavailable", res.status, "invalid_session_payload");
  }
  return decoded;
}

export function isFrontendAuthError(error: unknown): boolean {
  return error instanceof FrontendError && error.status === 401;
}
