export const MIN_WORDS_FOR_SUBSTANTIAL_TURN = 6;

export type CoachMessageRole = "user" | "agent" | "unknown";

export type ClassifiedCoachMessage = {
  role: CoachMessageRole;
  text: string;
  eventId: number | null;
  isFinal: boolean;
  wordCount: number;
  substantialUserTurn: boolean;
};

export function wordCount(text: string): number {
  return text.split(" ").filter((part) => part.length > 0).length;
}

export function classifyCoachMessage(raw: unknown): ClassifiedCoachMessage {
  const record = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const roleRaw = typeof record.role === "string" ? record.role : "";
  const source = typeof record.source === "string" ? record.source : "";
  let role: CoachMessageRole = "unknown";
  if (roleRaw === "user" || source === "user") role = "user";
  else if (roleRaw === "agent" || source === "ai" || source === "agent") role = "agent";

  const text =
    typeof record.message === "string"
      ? record.message
      : typeof record.text === "string"
        ? record.text
        : "";
  const eventId = typeof record.event_id === "number" ? record.event_id : null;
  const isFinal = record.isFinal === false || record.is_final === false ? false : true;
  const count = wordCount(text);
  return {
    role,
    text,
    eventId,
    isFinal,
    wordCount: count,
    substantialUserTurn: role === "user" && isFinal && count >= MIN_WORDS_FOR_SUBSTANTIAL_TURN,
  };
}

export function accumulateTranscript(
  previous: ClassifiedCoachMessage[],
  incoming: ClassifiedCoachMessage,
): ClassifiedCoachMessage[] {
  const last = previous[previous.length - 1];
  if (
    last &&
    incoming.role === "user" &&
    last.role === "user" &&
    ((incoming.eventId != null && incoming.eventId === last.eventId) ||
      incoming.text.startsWith(last.text) ||
      last.text.startsWith(incoming.text))
  ) {
    return [...previous.slice(0, -1), incoming];
  }
  return [...previous, incoming];
}

export function countSubstantialUserTurns(messages: ClassifiedCoachMessage[]): number {
  return messages.filter((item) => item.substantialUserTurn).length;
}
