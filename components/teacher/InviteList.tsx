"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, FrontendError } from "@/lib/api/client";
import { STAFF_ROLE_LABELS } from "@/lib/teacher/labels";
import type { InviteDeliveryStatus, OrganizationInvite } from "@/lib/platform/types";

// FASE PLATFORM-ENTERPRISE-001 — the half of invitations TEACHER-GROUPS-001
// left out: seeing them, and taking one back.
//
// The raw token is NOT here and cannot be. It is shown exactly once, to the
// person who created it, and only its SHA-256 hash is stored — so this list
// can say an invitation exists and revoke it, but nobody, including us, can
// re-read the link. That is deliberate, and worth saying on screen rather
// than leaving an administrator hunting for a "copy link" button that will
// never exist.

const STATUS_COPY: Record<OrganizationInvite["status"], string> = {
  pending: "Waiting to be accepted",
  accepted: "Accepted",
  revoked: "Revoked",
  expired: "Expired",
};

// FASE PLATFORM-MAIL-001 — delivery, said in words rather than a colour.
// "Link only" is not a failure and must not read like one: it is the
// deliberate pre-D4 choice, and still the right one for somebody who wants to
// send the link through their own channel.
const DELIVERY_COPY: Record<InviteDeliveryStatus, string> = {
  not_requested: "Link only",
  pending: "Sending…",
  sent: "Sent",
  failed: "Not delivered",
};

export function InviteList({
  organizationId,
  invites,
  canInvite = false,
}: {
  organizationId: string;
  invites: OrganizationInvite[];
  /** members.invite. Revoke and resend both write, so both are gated on it —
   *  the backend re-decides regardless; this only chooses what to draw. */
  canInvite?: boolean;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function resend(invite: OrganizationInvite) {
    setBusyId(invite.id);
    setError(null);
    setNotice(null);
    try {
      const result = await apiRequest<{ ok: true; delivery: { status: string; retriable?: boolean } }>(
        `/api/teacher/organizations/${organizationId}/invites/${invite.id}/resend`,
        { method: "POST" },
      );
      setNotice(result.delivery?.status === "sent"
        ? `Invitation resent${invite.email ? ` to ${invite.email}` : ""}. Any link sent earlier has stopped working.`
        : "We could not send the email. The invitation is still valid — try again shortly.");
      router.refresh();
    } catch (err) {
      if (err instanceof FrontendError) {
        const code = err.reason ?? err.code;
        const copy: Record<string, string> = {
          cooldown: "That invitation was sent very recently. Try again in a few minutes.",
          max_sends: "That invitation has been sent the maximum number of times. Create a new one.",
          expired: "That invitation has expired. Create a new one.",
          not_pending: "That invitation is no longer pending.",
          link_only: "That invitation has no email address.",
        };
        setError(copy[code] ?? "Could not resend that invitation. Refresh and try again.");
      } else {
        setError("Could not resend that invitation. Refresh and try again.");
      }
    } finally {
      setBusyId(null);
    }
  }

  async function revoke(inviteId: string) {
    setBusyId(inviteId);
    setError(null);
    setNotice(null);
    try {
      await apiRequest(`/api/teacher/organizations/${organizationId}/invites/${inviteId}`, { method: "DELETE" });
      router.refresh();
    } catch {
      setError("Could not revoke that invitation. Refresh and try again.");
    } finally {
      setBusyId(null);
    }
  }

  if (invites.length === 0) {
    return <div className="teacher-empty">No invitations have been created yet.</div>;
  }

  return (
    <>
      {error ? <p className="teacher-inline-error" role="alert">{error}</p> : null}
      {notice ? <p className="teacher-inline-success" role="status">{notice}</p> : null}
      <div className="teacher-table-scroll">
        <table className="teacher-table">
          <caption className="teacher-caption">
            Invitation links are shown once, when created, and never again — only a hash is
            stored. Resending an invitation creates a new link and stops the previous one working.
          </caption>
          <thead>
            <tr>
              <th scope="col">Recipient</th>
              <th scope="col">Role</th>
              <th scope="col">Status</th>
              <th scope="col">Delivery</th>
              <th scope="col">Expires</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invites.map((invite) => (
              <tr key={invite.id}>
                <td className="teacher-cell-email">
                  {invite.email ?? <span className="teacher-muted">No address</span>}
                </td>
                <td>{STAFF_ROLE_LABELS[invite.role] ?? invite.role}</td>
                <td>{STATUS_COPY[invite.status]}</td>
                <td>
                  {/* Words, not a coloured dot. A status conveyed only by
                      colour is unreadable to a large number of people, and
                      "Not delivered" is the one a reader must not miss. */}
                  <span data-delivery={invite.delivery.status}>
                    {DELIVERY_COPY[invite.delivery.status]}
                  </span>
                  {invite.delivery.status === "failed" && invite.delivery.error ? (
                    <span className="teacher-muted teacher-delivery-detail"> · {invite.delivery.error}</span>
                  ) : null}
                </td>
                <td>{invite.expiresAt.slice(0, 10)}</td>
                <td>
                  {invite.status === "pending" && canInvite ? (
                    <div className="teacher-invite-actions">
                      {invite.email ? (
                        <button
                          className="btn"
                          disabled={busyId === invite.id || !invite.delivery.canResend}
                          onClick={() => void resend(invite)}
                          // Disabled alone tells a keyboard or screen-reader
                          // user nothing about WHY. The title says it.
                          title={invite.delivery.canResend
                            ? "Send this invitation again. The previous link stops working."
                            : invite.delivery.sendCount >= 5
                              ? "This invitation has been sent the maximum number of times."
                              : "This invitation was sent very recently."}
                        >
                          {busyId === invite.id ? "Sending…" : "Resend"}
                        </button>
                      ) : null}
                      <button className="btn" disabled={busyId === invite.id} onClick={() => revoke(invite.id)}>
                        {busyId === invite.id ? "Revoking…" : "Revoke"}
                      </button>
                    </div>
                  ) : (
                    <span className="teacher-muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
