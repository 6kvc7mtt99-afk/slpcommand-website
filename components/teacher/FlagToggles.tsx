"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api/client";
import type { ResolvedFlags } from "@/lib/platform/types";

// FASE PLATFORM-TENANT-001 — per-organization feature flags.
//
// The distinction this screen exists to make visible: a flag is either
// FOLLOWING the SLP Command default, or this organization has overridden it.
// A toggle that showed only on/off would leave an administrator unable to tell
// "on because we chose it" from "on because that is the default, and it could
// change under us" — so each row says which, and offers a way back to the
// default rather than only a way to pick the same value manually.

const FLAG_LABELS: Record<string, string> = {
  listening_enabled: "Listening",
  reading_enabled: "Reading",
  writing_enabled: "Writing",
  speaking_enabled: "Speaking",
  feedback_enabled: "Report a Problem",
};

export function FlagToggles({
  organizationId,
  flags,
  canWrite,
}: {
  organizationId: string;
  flags: ResolvedFlags;
  canWrite: boolean;
}) {
  const router = useRouter();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function set(key: string, enabled: boolean | null) {
    setBusyKey(key);
    setError(null);
    try {
      await apiRequest(`/api/teacher/organizations/${organizationId}/flags/${encodeURIComponent(key)}`, {
        method: "PATCH",
        body: { enabled },
      });
      router.refresh();
    } catch {
      setError("Could not change that feature. Try again.");
    } finally {
      setBusyKey(null);
    }
  }

  const keys = Object.keys(flags).sort();
  if (keys.length === 0) {
    return <div className="teacher-empty">No configurable features.</div>;
  }

  return (
    <>
      {error ? <p className="teacher-inline-error" role="alert">{error}</p> : null}
      <div className="teacher-table-scroll">
        <table className="teacher-table">
          <caption className="teacher-caption">
            Turning a feature off hides it for everyone in this organization. It does not delete
            any work already done in it.
          </caption>
          <thead>
            <tr>
              <th scope="col">Feature</th>
              <th scope="col">Status</th>
              <th scope="col">Set by</th>
              {canWrite ? <th scope="col">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {keys.map((key) => {
              const flag = flags[key];
              const busy = busyKey === key;
              return (
                <tr key={key}>
                  <td>{FLAG_LABELS[key] ?? key}</td>
                  <td>{flag.enabled ? "On" : "Off"}</td>
                  <td>
                    {flag.source === "organization" ? (
                      <>This organization</>
                    ) : (
                      <span className="teacher-muted">SLP Command default</span>
                    )}
                  </td>
                  {canWrite ? (
                    <td>
                      <button className="btn" disabled={busy} onClick={() => set(key, !flag.enabled)}>
                        {busy ? "Saving…" : flag.enabled ? "Turn off" : "Turn on"}
                      </button>
                      {flag.source === "organization" ? (
                        <>
                          {" "}
                          <button className="btn" disabled={busy} onClick={() => set(key, null)}>
                            Follow default{flag.platformDefault === null ? "" : flag.platformDefault ? " (on)" : " (off)"}
                          </button>
                        </>
                      ) : null}
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
