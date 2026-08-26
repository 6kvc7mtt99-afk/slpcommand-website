"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, FrontendError } from "@/lib/api/client";
import type { TeacherGroup, TeacherRole } from "@/lib/teacher/types";

// FASE PLATFORM-GROUPS-001 — moving one person between cohorts.
//
// The backend has had PATCH /members/:userId/group since PLATFORM-ENTERPRISE-001,
// with its permission check, its tenant scoping and its audit event. Nothing in
// the Web has ever called it: the group has been read-only text in every table
// that shows it. This control is the missing half.
//
// THE ROLE IS NOT ASSUMED. teacher_memberships is UNIQUE (user_id,
// organization_id, role), so one person can hold several rows, and the `role`
// this sends is what decides WHICH row moves. Defaulting to "student" — which
// the endpoint itself does — would silently move the wrong row, or none at
// all, for anybody who is not a student. The row already knows its own role,
// so it is passed through explicitly.
//
// Single student at a time, deliberately. Bulk assignment is a different
// product decision with its own failure modes (partial success, undo), and
// nothing here makes it free.

export function AssignGroupControl({
  organizationId,
  userId,
  role,
  currentGroupId,
  groups,
  disabled = false,
  label,
}: {
  organizationId: string;
  userId: string;
  role: TeacherRole;
  currentGroupId: string | null;
  groups: TeacherGroup[];
  disabled?: boolean;
  /** What a screen reader should call this control — the row's person. */
  label: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function change(next: string) {
    // "" is the Unassigned option. It becomes a real null, which is what the
    // endpoint reads as "remove them from every group".
    const groupId = next === "" ? null : next;
    if (groupId === currentGroupId) return;

    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await apiRequest(`/api/teacher/organizations/${organizationId}/members/${userId}/group`, {
        method: "PATCH",
        body: { groupId, role },
      });
      setSaved(true);
      // The counts on every surrounding surface — the group cards, the
      // unassigned bucket, the roster's own filter — are all derived from this
      // one row. Refreshing the server component is what keeps them from going
      // stale, and is why there is no optimistic local state here.
      router.refresh();
    } catch (err) {
      if (err instanceof FrontendError) {
        const code = err.reason ?? err.code;
        if (err.status === 403) setError("You do not have permission to change groups.");
        else if (code === "group_not_found") setError("That group no longer exists. Reload the page.");
        else if (code === "not_found") setError("That member is no longer active here. Reload the page.");
        else setError("Could not change the group. Try again.");
      } else {
        setError("Could not change the group. Try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="teacher-group-assign">
      <label className="visually-hidden" htmlFor={`group-${userId}-${role}`}>
        Group for {label}
      </label>
      <select
        id={`group-${userId}-${role}`}
        value={currentGroupId ?? ""}
        disabled={disabled || busy}
        onChange={(e) => void change(e.target.value)}
      >
        <option value="">Unassigned</option>
        {groups.map((g) => (
          <option key={g.id} value={g.id}>{g.name}</option>
        ))}
      </select>
      {busy && <span className="teacher-muted teacher-assign-note">Saving…</span>}
      {saved && !busy && !error && <span className="teacher-inline-success teacher-assign-note">Saved</span>}
      {error && <span className="teacher-inline-error teacher-assign-note" role="alert">{error}</span>}
    </div>
  );
}
