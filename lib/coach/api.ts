import { FrontendError } from "@/lib/api/errors";
import { apiRequest } from "@/lib/api/client";
import { asString, isRecord } from "@/lib/api/decode";
import { mapCoachStartError, type CoachStartError } from "./errors";
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

export type CoachMission = {
  objective: string;
  objectiveSource: string;
  rationale: string;
  estimatedMinutes: number;
  eligibility: string;
  blockedReason: string | null;
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
    estimatedMinutes: Number(mission.estimatedMinutes ?? mission.estimated_minutes ?? 0) || 0,
    eligibility: asString(mission.eligibility, "unavailable"),
    blockedReason: asString(mission.blockedReason || mission.blocked_reason) || null,
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

export async function recordCoachConsent(): Promise<void> {
  await apiRequest("/speaking/coach/consent", {
    method: "POST",
    body: {
      consentType: "granted",
      scope: "elevenlabs_conversation",
      policyVersion: "coach-consent-1.0.0",
      appVersion: "web-spike",
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
