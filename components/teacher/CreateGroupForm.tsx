"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, FrontendError } from "@/lib/api/client";
import type { TeacherGroup } from "@/lib/teacher/types";

// FASE TEACHER-GROUPS-001 — the one write this page offers. The backend
// (createGroup, lib/teacher/groups.js) is the real validator: empty names and
// duplicate names within the organization are rejected there, not guessed at
// here. router.refresh() re-runs the Server Component loader so the new
// group's real student count (0) comes from the same source as every other
// number on this page.
export function CreateGroupForm({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiRequest<{ ok: true; group: TeacherGroup }>(
        `/api/teacher/organizations/${organizationId}/groups`,
        { method: "POST", body: { name } },
      );
      setName("");
      router.refresh();
    } catch (err) {
      if (err instanceof FrontendError && err.status === 409) {
        setError("A group with this name already exists.");
      } else if (err instanceof FrontendError && err.status === 400) {
        setError("Enter a group name.");
      } else {
        setError("Could not create the group. Try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="teacher-form" onSubmit={submit}>
      <div className="teacher-field">
        <label htmlFor="group-name">New group name</label>
        <input
          id="group-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Evening cohort"
          maxLength={100}
          required
        />
      </div>
      <button className="btn btn-primary" type="submit" disabled={busy || !name.trim()}>
        {busy ? "Creating…" : "Create group"}
      </button>
      {error ? <p className="teacher-inline-error" role="alert">{error}</p> : null}
    </form>
  );
}
