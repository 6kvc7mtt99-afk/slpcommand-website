"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, FrontendError } from "@/lib/api/client";
import { STAFF_ROLE_LABELS } from "@/lib/teacher/labels";
import type { OrganizationMember } from "@/lib/platform/types";
import type { TeacherGroup, TeacherRole } from "@/lib/teacher/types";
import { AssignGroupControl } from "./AssignGroupControl";

// FASE PLATFORM-ENTERPRISE-001 — member administration.
//
// The backend is the validator, not this component. It refuses to let anyone
// change their own role, grant a role above their own, modify a member more
// powerful than themselves, or remove an organization's last owner — and it
// refuses each with a distinct error code. This file's job is to turn those
// codes into a sentence a person can act on, and to hide the controls that
// would obviously fail. Hiding is UX; the refusal is the boundary.

const ASSIGNABLE: TeacherRole[] = ["owner", "admin", "teacher", "student"];

const ERROR_COPY: Record<string, string> = {
  cannot_modify_self: "You cannot change your own role or remove yourself. Ask another owner or admin.",
  role_above_caller: "You cannot grant a role above your own.",
  target_above_caller: "You cannot change a member whose role is above your own.",
  last_owner: "An organization must keep at least one owner. Promote someone else first.",
  no_change: "That member already holds this role.",
  not_found: "That membership no longer exists. Refresh the page.",
  forbidden: "You do not have permission to manage members.",
};

export function MemberTable({
  organizationId,
  members,
  canManage,
  currentUserId,
  groups = [],
  canWriteGroups = false,
}: {
  organizationId: string;
  members: OrganizationMember[];
  canManage: boolean;
  currentUserId: string | null;
  // PLATFORM-GROUPS-001 — the cohorts a member may be filed into. Optional and
  // empty by default so every existing call site keeps working unchanged: with
  // no groups the column stays exactly the read-only text it has always been.
  groups?: TeacherGroup[];
  // groups.write, not members.manage. They are different permissions and a
  // teacher holds the first without the second — being able to organise your
  // own class does not make you an administrator of the organization.
  canWriteGroups?: boolean;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  // `reason` is the machine code the backend sends alongside its human message
  // (sendPlatformError in server.js) and is what normalizeBackendError
  // surfaces on FrontendError. Falling back to the generic sentence when it is
  // missing keeps an unrecognised refusal readable rather than blank.
  function report(err: unknown, fallback: string) {
    if (err instanceof FrontendError && err.reason && ERROR_COPY[err.reason]) {
      setError(ERROR_COPY[err.reason]);
      return;
    }
    setError(fallback);
  }

  async function changeRole(member: OrganizationMember, newRole: TeacherRole) {
    if (newRole === member.role) return;
    setBusyId(member.membershipId);
    setError(null);
    try {
      await apiRequest(`/api/teacher/organizations/${organizationId}/members/${member.userId}/role`, {
        method: "PATCH",
        body: { currentRole: member.role, role: newRole },
      });
      router.refresh();
    } catch (err) {
      report(err, "Could not change the role. Try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(member: OrganizationMember) {
    setBusyId(member.membershipId);
    setError(null);
    try {
      await apiRequest(
        `/api/teacher/organizations/${organizationId}/members/${member.userId}?role=${encodeURIComponent(member.role)}`,
        { method: "DELETE" },
      );
      setConfirming(null);
      router.refresh();
    } catch (err) {
      report(err, "Could not remove the member. Try again.");
    } finally {
      setBusyId(null);
    }
  }

  if (members.length === 0) {
    return (
      <div className="teacher-empty">
        <strong>No members yet.</strong>
        <p>Invite people from the Invite page. They appear here once they accept.</p>
      </div>
    );
  }

  return (
    <>
      {error ? <p className="teacher-inline-error" role="alert">{error}</p> : null}
      <div className="teacher-table-scroll">
        <table className="teacher-table">
          <caption className="teacher-caption">
            Everyone with an active membership in this organization.
          </caption>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Email</th>
              <th scope="col">Role</th>
              <th scope="col">Group</th>
              <th scope="col">Joined</th>
              {canManage ? <th scope="col">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const isSelf = member.userId === currentUserId;
              const busy = busyId === member.membershipId;
              return (
                <tr key={member.membershipId}>
                  <td>{member.name ?? <span className="teacher-muted">No name recorded</span>}</td>
                  <td>{member.email ?? <span className="teacher-muted">—</span>}</td>
                  <td>
                    {canManage && !isSelf ? (
                      <label>
                        <span className="visually-hidden">Role for {member.name ?? member.email ?? "this member"}</span>
                        <select
                          value={member.role}
                          disabled={busy}
                          onChange={(e) => changeRole(member, e.target.value as TeacherRole)}
                        >
                          {ASSIGNABLE.map((role) => (
                            <option key={role} value={role}>{STAFF_ROLE_LABELS[role]}</option>
                          ))}
                        </select>
                      </label>
                    ) : (
                      <>
                        {STAFF_ROLE_LABELS[member.role] ?? member.role}
                        {isSelf ? <span className="teacher-muted"> (you)</span> : null}
                      </>
                    )}
                  </td>
                  <td>
                    {canWriteGroups && groups.length > 0 ? (
                      <AssignGroupControl
                        organizationId={organizationId}
                        userId={member.userId}
                        // The row's REAL role, never an assumed "student":
                        // it selects which membership row is updated.
                        role={member.role}
                        currentGroupId={member.groupId}
                        groups={groups}
                        disabled={busy}
                        label={member.name ?? member.email ?? "this member"}
                      />
                    ) : (
                      member.groupName ?? <span className="teacher-muted">Unassigned</span>
                    )}
                  </td>
                  <td>{member.joinedAt.slice(0, 10)}</td>
                  {canManage ? (
                    <td>
                      {isSelf ? (
                        <span className="teacher-muted">—</span>
                      ) : confirming === member.membershipId ? (
                        <>
                          <button className="btn teacher-btn-danger" disabled={busy} onClick={() => remove(member)}>
                            {busy ? "Removing…" : "Confirm"}
                          </button>{" "}
                          <button className="btn" disabled={busy} onClick={() => setConfirming(null)}>
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button className="btn" disabled={busy} onClick={() => { setError(null); setConfirming(member.membershipId); }}>
                          Remove
                        </button>
                      )}
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {canManage ? (
        <p className="teacher-note">
          Removing a member revokes their access immediately. Their learning history is not
          deleted — it stays with their own account, and returns if they rejoin.
        </p>
      ) : null}
    </>
  );
}
