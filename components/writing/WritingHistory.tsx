"use client";

import { useEffect, useState } from "react";
import { apiRequest, FrontendError } from "@/lib/api/client";
import { decodeWritingAttempts, type WritingAttempt } from "@/lib/api/writing";
import { ExerciseShell } from "@/components/exercise/ExerciseShell";

export function WritingHistory() {
  const [items, setItems] = useState<WritingAttempt[] | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await apiRequest<unknown>("/writing/attempts?limit=20");
        if (!cancelled) setItems(decodeWritingAttempts(raw));
      } catch (err) {
        if (!cancelled) {
          setItems([]);
          setMessage(err instanceof FrontendError ? err.message : "Could not load history.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ExerciseShell skill="Writing" mode="History" title="Past evaluations">
      {items == null ? <p className="muted">Loading…</p> : null}
      {message ? <p className="muted">{message}</p> : null}
      {items && items.length === 0 ? <p className="muted">No attempts yet.</p> : null}
      {items && items.length > 0 ? (
        <ul className="home-list">
          {items.map((item) => (
            <li key={item.id} className="home-card">
              <p className="home-kicker">{item.mode}</p>
              {item.createdAt ? <p className="muted">{item.createdAt}</p> : null}
              {item.preview ? <p>{item.preview}</p> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </ExerciseShell>
  );
}
