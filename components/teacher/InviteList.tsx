"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api/client";
import { STAFF_ROLE_LABELS } from "@/lib/teacher/labels";
import type { OrganizationInvite } from "@/lib/platform/types";

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

export function InviteList({
  organizationId,
  invites,
}: {
  organizationId: string;
  invites: OrganizationInvite[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function revoke(inviteId: string) {
    setBusyId(inviteId);
    setError(null);
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
      <div className="teacher-table-scroll">
        <table className="teacher-table">
          <caption className="teacher-caption">
            Invitation links are shown once, when created, and never again — only a hash is
            stored. To give someone a new link, create a new invitation.
          </caption>
          <thead>
            <tr>
              <th scope="col">Role</th>
              <th scope="col">Status</th>
              <th scope="col">Created</th>
              <th scope="col">Expires</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invites.map((invite) => (
              <tr key={invite.id}>
                <td>{STAFF_ROLE_LABELS[invite.role] ?? invite.role}</td>
                <td>{STATUS_COPY[invite.status]}</td>
                <td>{invite.createdAt.slice(0, 10)}</td>
                <td>{invite.expiresAt.slice(0, 10)}</td>
                <td>
                  {invite.status === "pending" ? (
                    <button className="btn" disabled={busyId === invite.id} onClick={() => revoke(invite.id)}>
                      {busyId === invite.id ? "Revoking…" : "Revoke"}
                    </button>
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
