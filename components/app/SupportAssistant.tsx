"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { FrontendError } from "@/lib/api/client";
import {
  contextFromPath,
  sendSupportMessage,
  startSupportConversation,
  type SupportMessage,
} from "@/lib/api/support";

export function SupportAssistant() {
  const path = usePathname();
  const context = useMemo(() => contextFromPath(path), [path]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);

  async function send() {
    const text = draft.trim();
    if (!text || sending) return;
    setDraft("");
    setError(null);
    setSending(true);
    setStatus("Thinking…");
    setMessages((prev) => [
      ...prev,
      { id: `local-${Date.now()}`, role: "user", content: text },
    ]);
    try {
      let id = conversationId;
      if (!id) {
        const created = await startSupportConversation(context);
        id = created.conversation.id;
        setConversationId(id);
      }
      const turn = await sendSupportMessage(id, text, context);
      if (turn.message) setMessages((prev) => [...prev, turn.message as SupportMessage]);
      setCaseId(turn.case?.id ?? null);
      setStatus(null);
    } catch (err) {
      setStatus(null);
      setError(err instanceof FrontendError ? err.message : "Could not reach the assistant. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button type="button" className="btn btn-outline support-launch" onClick={() => setOpen(true)}>
        Need Help?
      </button>
      {open ? (
        <div className="support-overlay" role="dialog" aria-modal="true" aria-labelledby="support-title">
          <div className="support-panel">
            <header className="support-header">
              <div>
                <h2 id="support-title">SLP Assistant</h2>
                <p>I can explain SLP Command and look at your account when needed.</p>
              </div>
              <button type="button" className="btn btn-outline" onClick={() => setOpen(false)}>
                Close
              </button>
            </header>
            <div className="support-thread">
              {messages.map((message) => (
                <div key={message.id} className={`support-bubble ${message.role === "user" ? "mine" : "theirs"}`}>
                  {message.content}
                </div>
              ))}
              {sending ? <p className="support-status">{status ?? "Thinking…"}</p> : null}
              {caseId ? (
                <p className="support-case">
                  Support case created ({caseId.slice(0, 8)}). You do not need to send another email.
                </p>
              ) : null}
              {error ? <p className="support-error">{error}</p> : null}
            </div>
            <form
              className="support-composer"
              onSubmit={(event) => {
                event.preventDefault();
                void send();
              }}
            >
              <label className="sr-only" htmlFor="support-input">
                Message
              </label>
              <textarea
                id="support-input"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                rows={2}
                placeholder="Describe the problem"
                disabled={sending}
              />
              <button type="submit" className="btn" disabled={sending || !draft.trim()}>
                Send
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
