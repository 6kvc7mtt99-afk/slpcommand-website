"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, FrontendError } from "@/lib/api/client";
import type { Branding } from "@/lib/platform/types";

// FASE PLATFORM-WHITELABEL-001 — the branding editor.
//
// The backend validates every field (lib/platform/organization.js): colours
// must be hex, asset URLs must be https, text is bounded. This form does not
// duplicate those rules — it submits and reports what came back, so there is
// one definition of "valid" rather than two that can disagree. What it DOES
// do locally is show a live preview, because a colour picker with no preview
// is a guess.

type Field = keyof Pick<Branding,
  "displayName" | "logoUrl" | "faviconUrl" | "primaryColor" | "secondaryColor"
  | "accentColor" | "loginHeadline" | "loginSubheadline" | "supportEmail">;

const TEXT_FIELDS: { field: Field; label: string; hint?: string; type?: string }[] = [
  { field: "displayName", label: "Display name", hint: "What learners see in the app. Leave blank to use the organization's own name." },
  { field: "logoUrl", label: "Logo URL", hint: "Must be an https address.", type: "url" },
  { field: "faviconUrl", label: "Favicon URL", hint: "Must be an https address.", type: "url" },
  { field: "loginHeadline", label: "Login headline", hint: "Shown above the sign-in form." },
  { field: "loginSubheadline", label: "Login subheadline" },
  { field: "supportEmail", label: "Support email", hint: "Where learners are told to write for help.", type: "email" },
];

const COLOR_FIELDS: { field: Field; label: string }[] = [
  { field: "primaryColor", label: "Primary" },
  { field: "secondaryColor", label: "Secondary" },
  { field: "accentColor", label: "Accent" },
];

export function BrandingForm({
  organizationId,
  branding,
}: {
  organizationId: string;
  branding: Branding | null;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<Field, string>>(() => ({
    displayName: branding?.displayName ?? "",
    logoUrl: branding?.logoUrl ?? "",
    faviconUrl: branding?.faviconUrl ?? "",
    primaryColor: branding?.primaryColor ?? "",
    secondaryColor: branding?.secondaryColor ?? "",
    accentColor: branding?.accentColor ?? "",
    loginHeadline: branding?.loginHeadline ?? "",
    loginSubheadline: branding?.loginSubheadline ?? "",
    supportEmail: branding?.supportEmail ?? "",
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function set(field: Field, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
    setSaved(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      // Empty string means "clear this field", which the backend maps to NULL.
      // Sending every field on every save keeps the form's state and the
      // stored state identical rather than diffing them here.
      await apiRequest(`/api/teacher/organizations/${organizationId}/branding`, {
        method: "PATCH",
        body: Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v.trim() === "" ? null : v.trim()])),
      });
      setSaved(true);
      router.refresh();
    } catch (err) {
      if (err instanceof FrontendError && err.status === 400) {
        setError("One of these values was rejected. Colours must look like #1B4D3E, and logo addresses must start with https://.");
      } else if (err instanceof FrontendError && err.status === 403) {
        setError("You do not have permission to change branding.");
      } else {
        setError("Could not save. Try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    setBusy(true);
    setError(null);
    try {
      await apiRequest(`/api/teacher/organizations/${organizationId}/branding`, { method: "DELETE" });
      setValues({
        displayName: "", logoUrl: "", faviconUrl: "", primaryColor: "", secondaryColor: "",
        accentColor: "", loginHeadline: "", loginSubheadline: "", supportEmail: "",
      });
      setSaved(true);
      router.refresh();
    } catch {
      setError("Could not reset branding. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="teacher-form" onSubmit={submit}>
      <div className="teacher-field-grid">
        {TEXT_FIELDS.map(({ field, label, hint, type }) => (
          <div className="teacher-field" key={field}>
            <label htmlFor={`brand-${field}`}>{label}</label>
            <input
              id={`brand-${field}`}
              type={type ?? "text"}
              value={values[field]}
              onChange={(e) => set(field, e.target.value)}
              aria-describedby={hint ? `brand-${field}-hint` : undefined}
            />
            {hint ? <small id={`brand-${field}-hint`} className="teacher-muted">{hint}</small> : null}
          </div>
        ))}
      </div>

      <fieldset className="teacher-fieldset">
        <legend>Colours</legend>
        <div className="teacher-color-row">
          {COLOR_FIELDS.map(({ field, label }) => (
            <div className="teacher-field" key={field}>
              <label htmlFor={`brand-${field}`}>{label}</label>
              <div className="teacher-color-input">
                <input
                  id={`brand-${field}`}
                  type="color"
                  value={/^#[0-9a-fA-F]{6}$/.test(values[field]) ? values[field] : "#000000"}
                  onChange={(e) => set(field, e.target.value)}
                  aria-label={`${label} colour picker`}
                />
                <input
                  type="text"
                  value={values[field]}
                  onChange={(e) => set(field, e.target.value)}
                  placeholder="#1B4D3E"
                  aria-label={`${label} colour hex value`}
                />
              </div>
            </div>
          ))}
        </div>
      </fieldset>

      <div
        className="teacher-brand-preview"
        style={{
          borderColor: /^#[0-9a-fA-F]{6}$/.test(values.primaryColor) ? values.primaryColor : undefined,
        }}
      >
        <div
          className="teacher-brand-preview-bar"
          style={{
            background: /^#[0-9a-fA-F]{6}$/.test(values.primaryColor) ? values.primaryColor : "var(--p-accent)",
          }}
        />
        <div className="teacher-brand-preview-body">
          <strong>{values.displayName.trim() || "Your organization"}</strong>
          <p>{values.loginHeadline.trim() || "Sign in to continue"}</p>
          {values.loginSubheadline.trim() ? <p className="teacher-muted">{values.loginSubheadline}</p> : null}
        </div>
      </div>

      <div className="teacher-form-actions">
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save branding"}
        </button>
        <button className="btn" type="button" onClick={reset} disabled={busy}>
          Reset to SLP Command default
        </button>
      </div>

      {error ? <p className="teacher-inline-error" role="alert">{error}</p> : null}
      {saved && !error ? <p className="teacher-inline-success" role="status">Saved.</p> : null}
    </form>
  );
}
