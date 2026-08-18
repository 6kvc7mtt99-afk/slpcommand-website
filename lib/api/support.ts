import { apiRequest } from "./client";

export type SupportContext = {
  client: "web";
  module?: string;
  screen?: string;
  appVersion?: string;
};

export type SupportConversation = {
  id: string;
  client?: string;
  module?: string;
  screen?: string;
  status?: string;
  createdAt?: string;
};

export type SupportMessage = {
  id: string;
  role: "user" | "assistant" | "system" | string;
  content: string;
  phase?: string | null;
  createdAt?: string;
};

export type SupportTurn = {
  ok: boolean;
  conversationId?: string;
  message?: SupportMessage;
  phase?: string;
  status?: string | null;
  toolsUsed?: string[];
  case?: { id: string; status?: string } | null;
  usage?: { model?: string };
};

export function contextFromPath(path: string): SupportContext {
  const parts = path.split("/").filter(Boolean);
  const moduleName = ["reading", "listening", "writing", "speaking", "progress", "profile", "dashboard"].includes(parts[0] ?? "")
    ? parts[0] === "dashboard"
      ? "home"
      : parts[0] === "profile"
        ? "account"
        : parts[0]
    : "home";
  return {
    client: "web",
    module: moduleName,
    screen: parts[1] || parts[0] || "home",
    appVersion: "web",
  };
}

export function startSupportConversation(context: SupportContext) {
  return apiRequest<{ ok: boolean; conversation: SupportConversation }>("/support/conversations", {
    method: "POST",
    body: { context },
  });
}

export function sendSupportMessage(conversationId: string, content: string, context: SupportContext) {
  return apiRequest<SupportTurn>(`/support/conversations/${conversationId}/messages`, {
    method: "POST",
    body: { content, context },
  });
}
