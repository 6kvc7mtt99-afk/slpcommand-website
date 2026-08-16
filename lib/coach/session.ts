import { asNumber, asString, isRecord } from "@/lib/api/decode";

export type CoachSessionStart = {
  sessionId: string;
  budgetSecs: number;
  conversationToken: string;
  conversationTokenExpiresAt: string;
  conversationId: string | null;
  dynamicVariables: Record<string, string>;
  objective: string;
};

export type CoachSessionStatus = {
  id: string;
  status: string;
  evaluationStatus: string;
  consumedSecs: number | null;
  hasResult: boolean;
};

export function decodeDynamicVariables(raw: unknown): Record<string, string> {
  if (!isRecord(raw)) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value == null) out[key] = "";
    else out[key] = String(value);
  }
  return out;
}

export function decodeCoachSessionStart(raw: unknown): CoachSessionStart | null {
  if (!isRecord(raw)) return null;
  const sessionId = asString(raw.sessionId || raw.session_id);
  const conversationToken = asString(raw.conversationToken || raw.conversation_token);
  if (!sessionId || !conversationToken) return null;
  return {
    sessionId,
    budgetSecs: asNumber(raw.budgetSecs ?? raw.budget_secs, 0),
    conversationToken,
    conversationTokenExpiresAt: asString(
      raw.conversationTokenExpiresAt || raw.conversation_token_expires_at,
    ),
    conversationId: asString(raw.conversationId || raw.conversation_id) || null,
    dynamicVariables: decodeDynamicVariables(raw.dynamicVariables ?? raw.dynamic_variables),
    objective: asString(raw.objective),
  };
}

export function decodeCoachSessionStatus(raw: unknown): CoachSessionStatus | null {
  if (!isRecord(raw)) return null;
  const session = isRecord(raw.session) ? raw.session : raw;
  const id = asString(session.id);
  if (!id) return null;
  return {
    id,
    status: asString(session.status),
    evaluationStatus: asString(session.evaluationStatus || session.evaluation_status),
    consumedSecs:
      session.consumedSecs == null && session.consumed_secs == null
        ? null
        : asNumber(session.consumedSecs ?? session.consumed_secs, 0),
    hasResult: session.result != null,
  };
}

export function sessionIsSettled(status: CoachSessionStatus): boolean {
  return status.status === "completed" || status.hasResult || status.status === "failed";
}

export async function pollCoachSession(
  read: () => Promise<CoachSessionStatus | null>,
  opts: { attempts?: number; delayMs?: number; sleep?: (ms: number) => Promise<void> } = {},
): Promise<CoachSessionStatus | null> {
  const attempts = opts.attempts ?? 10;
  const delayMs = opts.delayMs ?? 2000;
  const sleep = opts.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  let last: CoachSessionStatus | null = null;
  for (let i = 0; i < attempts; i += 1) {
    last = await read();
    if (last && sessionIsSettled(last)) return last;
    if (i < attempts - 1) await sleep(delayMs);
  }
  return last;
}
