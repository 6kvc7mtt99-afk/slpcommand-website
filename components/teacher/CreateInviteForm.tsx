"use client";

import { useState } from "react";
import { apiRequest, FrontendError } from "@/lib/api/client";
import type { CreateInviteResponse, TeacherGroup, TeacherRole } from "@/lib/teacher/types";
import { STAFF_ROLE_LABELS } from "@/lib/teacher/labels";

const INVITABLE_ROLES: TeacherRole[] = ["owner", "admin", "teacher", "student"];

/**
 * FASE TEACHER-GROUPS-001 — the UI offers every role in the hierarchy; the
 * backend (canInviteRole, lib/teacher/invites.js) is the real, sole
 * authority on whether THIS caller may issue THIS role's invite. A 403 here
 * is expected and handled, not a bug — this form never tries to predict the
 * caller's own role client-side.
 */
export function CreateInviteForm({
  organizationId,
  groups,
}: {
  organizationId: string;
  groups: TeacherGroup[];
}) {
  const [role, setRole] = useState<TeacherRole>("student");
  const [groupId, setGroupId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreateInviteResponse["invite"] | null>(null);
  const [copied, setCopied] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setCreated(null);
    setCopied(false);
    try {
      const result = await apiRequest<CreateInviteResponse>(
        `/api/teacher/organizations/${organizationId}/invites`,
        { method: "POST", body: { role, groupId: groupId || undefined } },
      );
      setCreated(result.invite);
    } catch (err) {
      if (err instanceof FrontendError && err.status === 403) {
        setError(`You are not allowed to invite a ${STAFF_ROLE_LABELS[role]}.`);
      } else {
        setError("Could not create the invitation. Try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  const acceptUrl = created && typeof window !== "undefined"
    ? `${window.location.origin}/invite/accept?token=${created.token}`
    : null;

  async function copyLink() {
    if (!acceptUrl) return;
    try {
      await navigator.clipboard.writeText(acceptUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <form className="teacher-form" onSubmit={submit}>
      <div className="teacher-field">
        <label htmlFor="invite-role">Role to invite</label>
        <select id="invite-role" value={role} onChange={(e) => setRole(e.target.value as TeacherRole)}>
          {INVITABLE_ROLES.map((r) => (
            <option key={r} value={r}>{STAFF_ROLE_LABELS[r]}</option>
          ))}
        </select>
      </div>

      {role === "student" && groups.length > 0 ? (
        <div className="teacher-field">
          <label htmlFor="invite-group">Place directly into group (optional)</label>
          <select id="invite-group" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
            <option value="">No group</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
      ) : null}

      <button className="btn btn-primary" type="submit" disabled={busy}>
        {busy ? "Creating…" : "Create invitation link"}
      </button>

      {error ? <p className="teacher-inline-error" role="alert">{error}</p> : null}

      {acceptUrl ? (
        <>
          <p className="teacher-inline-success" role="status">Invitation created.</p>
          <div className="teacher-token-box">{acceptUrl}</div>
          <p className="teacher-token-warning">
            This link is shown only once and is not saved anywhere retrievable — copy it now and
            send it to the person you are inviting. It expires in 7 days and can be used exactly once.
          </p>
          <button type="button" className="btn btn-outline" onClick={() => void copyLink()} style={{ marginTop: 8 }}>
            {copied ? "Copied" : "Copy link"}
          </button>
        </>
      ) : null}
    </form>
  );
}
