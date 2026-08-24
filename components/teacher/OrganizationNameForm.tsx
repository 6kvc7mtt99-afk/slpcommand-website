"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, FrontendError } from "@/lib/api/client";

// FASE PLATFORM-ENTERPRISE-001 — the one identity field an organization owns.
// Its slug and custom domain are assigned by SLP Command (see the settings
// page for why); its NAME is its own, and needing us to fix a typo in it would
// be absurd.
export function OrganizationNameForm({
  organizationId,
  name,
}: {
  organizationId: string;
  name: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await apiRequest(`/api/teacher/organizations/${organizationId}/settings`, {
        method: "PATCH",
        body: { name: value },
      });
      setSaved(true);
      router.refresh();
    } catch (err) {
      if (err instanceof FrontendError && err.status === 400) setError("Enter a name.");
      else if (err instanceof FrontendError && err.status === 403) setError("You do not have permission to rename this organization.");
      else setError("Could not save. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="teacher-form teacher-form-inline" onSubmit={submit}>
      <div className="teacher-field">
        <label htmlFor="org-name">Organization name</label>
        <input
          id="org-name"
          value={value}
          onChange={(e) => { setValue(e.target.value); setSaved(false); }}
          maxLength={120}
          required
        />
      </div>
      <button className="btn btn-primary" type="submit" disabled={busy || value.trim() === name || !value.trim()}>
        {busy ? "Saving…" : "Save"}
      </button>
      {error ? <p className="teacher-inline-error" role="alert">{error}</p> : null}
      {saved && !error ? <p className="teacher-inline-success" role="status">Saved.</p> : null}
    </form>
  );
}
