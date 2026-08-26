"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, FrontendError } from "@/lib/api/client";

// FASE PLATFORM-GROUPS-001 — renaming a cohort.
//
// PATCH …/groups/:groupId has existed since PLATFORM-ACADEMY-001 with its
// permission check and its duplicate-name handling, and nothing has ever
// called it: a typo in a group name has been permanent since the feature
// shipped. This is the control that was missing.
//
// 409 gets its own message. "A group with this name already exists" tells
// somebody exactly what to change; a generic failure would leave them
// retrying the same name.

export function GroupNameForm({
  organizationId,
  groupId,
  name,
}: {
  organizationId: string;
  groupId: string;
  name: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const trimmed = value.trim();
  const unchanged = trimmed === name;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    // Validated here so an obviously empty name costs no round trip; the
    // backend validates independently and is what actually decides.
    if (!trimmed) {
      setError("Enter a group name.");
      return;
    }
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await apiRequest(`/api/teacher/organizations/${organizationId}/groups/${groupId}`, {
        method: "PATCH",
        body: { name: trimmed },
      });
      setSaved(true);
      // The name appears in the heading, in the groups list and on every
      // roster row that references it. Refreshing the server component is what
      // updates all of them at once.
      router.refresh();
    } catch (err) {
      if (err instanceof FrontendError) {
        const code = err.reason ?? err.code;
        if (code === "duplicate_name") setError("A group with this name already exists.");
        else if (code === "invalid_name") setError("Enter a group name of 100 characters or fewer.");
        else if (code === "not_found") setError("This group no longer exists.");
        else if (err.status === 403) setError("You do not have permission to rename groups.");
        else setError("Could not rename the group. Try again.");
      } else {
        setError("Could not rename the group. Try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="teacher-form teacher-group-rename" onSubmit={submit} noValidate>
      <div className="teacher-field">
        <label htmlFor="group-name">Group name</label>
        <input
          id="group-name"
          value={value}
          onChange={(e) => { setValue(e.target.value); setSaved(false); }}
          maxLength={100}
          required
          aria-invalid={error ? true : undefined}
        />
      </div>
      <div className="teacher-form-actions">
        <button className="btn btn-primary" type="submit" disabled={busy || unchanged || !trimmed}>
          {busy ? "Saving…" : "Rename group"}
        </button>
      </div>
      {error && <p className="teacher-inline-error" role="alert">{error}</p>}
      {saved && !error && <p className="teacher-inline-success">Renamed.</p>}
    </form>
  );
}
