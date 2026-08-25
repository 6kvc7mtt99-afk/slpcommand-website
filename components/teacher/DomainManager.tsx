"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, FrontendError } from "@/lib/api/client";
import type { DomainClaim, DomainStatus } from "@/lib/platform/types";

// FASE PLATFORM-DOMAINS-001 — custom domain management.
//
// The shape this screen is built around: a domain is not a text field, it is a
// PROCESS with four steps and a state the admin needs to see at all times.
// "Custom domain: [input]" would leave someone who has published their TXT
// record with no way to know whether we can see it yet.
//
// Every state below corresponds to a real backend state — there is no
// optimistic UI here. What the admin sees is what the database says, because
// the one thing worse than a slow verification is a screen that claims a
// domain is live when the resolver disagrees.

const STATUS_COPY: Record<DomainStatus, { label: string; tone: string; meaning: string }> = {
  none: {
    label: "Not configured", tone: "neutral",
    meaning: "Your academy is reachable at its SLP Command address.",
  },
  pending: {
    label: "Awaiting DNS", tone: "warn",
    meaning: "Add the record below to your DNS, then verify. Changes can take a few minutes to propagate.",
  },
  failed: {
    label: "Verification failed", tone: "bad",
    meaning: "We looked for the record and could not confirm it. Check the value and try again.",
  },
  verified: {
    label: "Verified — not yet live", tone: "ok",
    meaning: "Ownership confirmed. Activate the domain when you are ready for learners to use it.",
  },
  active: {
    label: "Live", tone: "ok",
    meaning: "Your academy is being served on this domain.",
  },
  disabled: {
    label: "Disabled", tone: "neutral",
    meaning: "This domain is recorded but not serving traffic.",
  },
};

const ERROR_COPY: Record<string, string> = {
  conflict: "That domain is already claimed by another organization. Contact SLP Command if you believe it is yours.",
  validation_error: "That is not a valid domain. Use a hostname like academy.example.com — no https://, no path.",
  not_verified: "Verify ownership of the domain before activating it.",
  already_active: "That domain is already live.",
  too_soon: "A check was just run. Wait a few seconds before trying again.",
  token_expired: "The verification token has expired. Request the domain again to get a fresh one.",
  no_domain: "No domain has been requested yet.",
  no_token: "No verification is outstanding. Request the domain again.",
  forbidden: "You do not have permission to manage this organization's domain.",
};

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="teacher-field">
      <label htmlFor={`dns-${label}`}>{label}</label>
      <div className="teacher-copy-row">
        <input id={`dns-${label}`} readOnly value={value} onFocus={(e) => e.currentTarget.select()} />
        <button
          type="button"
          className="btn"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              // Clipboard can be refused (permissions, insecure context). The
              // input is readonly and selectable, so there is always a manual
              // path — no error state needed for a convenience that failed.
            }
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

export function DomainManager({
  organizationId,
  claim,
  canManage,
}: {
  organizationId: string;
  claim: DomainClaim;
  canManage: boolean;
}) {
  const router = useRouter();
  const [domain, setDomain] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  const status = STATUS_COPY[claim.status] ?? STATUS_COPY.none;

  function report(err: unknown, fallback: string) {
    if (err instanceof FrontendError && err.reason && ERROR_COPY[err.reason]) {
      setError(ERROR_COPY[err.reason]);
      return;
    }
    setError(fallback);
  }

  async function act(
    action: string,
    path: string,
    method: "POST" | "DELETE",
    body?: unknown,
    onOk?: (data: unknown) => void,
  ) {
    setBusy(action);
    setError(null);
    setNotice(null);
    try {
      const data = await apiRequest<unknown>(path, { method, body });
      onOk?.(data);
      router.refresh();
    } catch (err) {
      report(err, "Something went wrong. Try again.");
    } finally {
      setBusy(null);
    }
  }

  const base = `/api/teacher/organizations/${organizationId}/domain`;

  return (
    <div className="teacher-domain">
      <div className="teacher-domain-head">
        <div>
          <span className={`teacher-status-pill tone-${status.tone}`}>{status.label}</span>
          {claim.domain ? <code className="teacher-domain-name">{claim.domain}</code> : null}
        </div>
      </div>
      <p className="teacher-note">{status.meaning}</p>

      {error ? <p className="teacher-inline-error" role="alert">{error}</p> : null}
      {notice ? <p className="teacher-inline-success" role="status">{notice}</p> : null}

      {/* ── No domain yet: the four-step explanation, then the form ───────── */}
      {claim.status === "none" ? (
        canManage ? (
          <>
            <ol className="teacher-steps">
              <li><strong>Add your domain</strong> — tell us the address your learners will use.</li>
              <li><strong>Configure DNS</strong> — publish the TXT record we give you.</li>
              <li><strong>Verify ownership</strong> — we look for that record.</li>
              <li><strong>Activate</strong> — switch your academy onto the domain.</li>
            </ol>
            <form
              className="teacher-form teacher-form-inline"
              onSubmit={(e) => {
                e.preventDefault();
                act("request", base, "POST", { domain });
              }}
            >
              <div className="teacher-field">
                <label htmlFor="new-domain">Academy domain</label>
                <input
                  id="new-domain"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="academy.example.com"
                  aria-describedby="new-domain-hint"
                  required
                />
                <small id="new-domain-hint" className="teacher-muted">
                  A hostname only — no https://, no path.
                </small>
              </div>
              <button className="btn btn-primary" type="submit" disabled={busy !== null || !domain.trim()}>
                {busy === "request" ? "Adding…" : "Add domain"}
              </button>
            </form>
          </>
        ) : (
          <p className="teacher-note">Only an owner or admin can configure a custom domain.</p>
        )
      ) : null}

      {/* ── Outstanding claim: show exactly what to publish ───────────────── */}
      {claim.instructions ? (
        <section className="teacher-dns-block">
          <h3 className="teacher-h3">Add this DNS record</h3>
          <p className="teacher-note">
            In your DNS provider, create a <strong>TXT</strong> record with exactly these values. Then
            come back and verify — DNS changes usually appear within a few minutes, but can take
            longer.
          </p>
          <CopyField label="Name" value={claim.instructions.recordName} />
          <CopyField label="Value" value={claim.instructions.recordValue} />
          {claim.tokenExpired ? (
            <p className="teacher-inline-error" role="alert">
              This verification token has expired. Remove the domain and add it again to get a fresh
              one.
            </p>
          ) : null}
        </section>
      ) : null}

      {claim.lastError && claim.status === "failed" ? (
        <p className="teacher-inline-error" role="alert">{claim.lastError}</p>
      ) : null}

      {claim.lastCheckedAt ? (
        <p className="teacher-muted teacher-meta-line">
          Last checked {new Date(claim.lastCheckedAt).toLocaleString()}
        </p>
      ) : null}
      {claim.verifiedAt ? (
        <p className="teacher-muted teacher-meta-line">
          Ownership verified {new Date(claim.verifiedAt).toLocaleString()}
        </p>
      ) : null}

      {/* ── Actions, each shown only where it is actually available ───────── */}
      {canManage && claim.status !== "none" ? (
        <div className="teacher-form-actions">
          {(claim.status === "pending" || claim.status === "failed") && !claim.tokenExpired ? (
            <button
              className="btn btn-primary"
              disabled={busy !== null}
              onClick={() =>
                act("verify", `${base}/verify`, "POST", undefined, (data) => {
                  const ok = (data as { verified?: boolean })?.verified;
                  setNotice(ok ? "Ownership verified. You can activate the domain now." : null);
                })
              }
            >
              {busy === "verify" ? "Checking DNS…" : "Verify ownership"}
            </button>
          ) : null}

          {claim.status === "verified" ? (
            <button
              className="btn btn-primary"
              disabled={busy !== null}
              onClick={() => act("activate", `${base}/activate`, "POST")}
            >
              {busy === "activate" ? "Activating…" : "Activate domain"}
            </button>
          ) : null}

          {claim.status === "active" ? (
            <button
              className="btn"
              disabled={busy !== null}
              onClick={() => act("deactivate", `${base}/deactivate`, "POST")}
            >
              {busy === "deactivate" ? "Pausing…" : "Pause domain"}
            </button>
          ) : null}

          {claim.status === "disabled" ? (
            <button
              className="btn btn-primary"
              disabled={busy !== null}
              onClick={() => act("activate", `${base}/activate`, "POST")}
            >
              {busy === "activate" ? "Activating…" : "Reactivate domain"}
            </button>
          ) : null}

          {confirmingRemove ? (
            <>
              <button
                className="btn teacher-btn-danger"
                disabled={busy !== null}
                onClick={() => act("remove", base, "DELETE", undefined, () => setConfirmingRemove(false))}
              >
                {busy === "remove" ? "Removing…" : "Confirm removal"}
              </button>
              <button className="btn" disabled={busy !== null} onClick={() => setConfirmingRemove(false)}>
                Cancel
              </button>
            </>
          ) : (
            <button className="btn" disabled={busy !== null} onClick={() => { setError(null); setConfirmingRemove(true); }}>
              Remove domain
            </button>
          )}
        </div>
      ) : null}

      {claim.status === "active" ? (
        <p className="teacher-note">
          Pausing keeps the domain and its verification, and stops serving on it. Removing releases
          the domain entirely so it can be claimed again.
        </p>
      ) : null}
    </div>
  );
}
