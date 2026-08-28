"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
 *
 * FASE PLATFORM-MAIL-001 — the same form now does both things, because they
 * are the same act with one field different:
 *
 *   with an address  → we send a branded invitation email
 *   without one      → the link is shown to copy, exactly as before
 *
 * The pre-D4 flow is not a fallback or a legacy path; it is a legitimate
 * choice, and it is also what rescues an invitation whose email failed. That
 * is why the link is shown in BOTH outcomes.
 *
 * THE STATE THAT MATTERS is "created but not sent". An invitation whose email
 * bounced still exists and still works — reporting it as failure would invite
 * a duplicate, and reporting it as success would be a lie. It gets its own
 * result panel with both ways forward: retry, or copy the link.
 */

/** Everything the panel below needs to render one outcome. */
type Result =
  | { kind: "sent"; email: string; url: string }
  | { kind: "created_unsent"; email: string; url: string; retriable: boolean; detail: string | null }
  | { kind: "link_only"; url: string };

const ERROR_COPY: Record<string, string> = {
  already_member: "That person is already a member of this organization.",
  pending_invite: "There is already a pending invitation for that address. You can resend it from the list below.",
  invalid_email: "Enter a valid email address.",
};

export function CreateInviteForm({
  organizationId,
  groups,
}: {
  organizationId: string;
  groups: TeacherGroup[];
}) {
  const router = useRouter();
  const [role, setRole] = useState<TeacherRole>("student");
  const [groupId, setGroupId] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);

  const trimmedEmail = email.trim();
  const willEmail = trimmedEmail.length > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setErrorField(null);
    setResult(null);
    setCopied(false);
    try {
      const response = await apiRequest<CreateInviteResponse>(
        `/api/teacher/organizations/${organizationId}/invites`,
        {
          method: "POST",
          body: {
            role,
            groupId: groupId || undefined,
            // Absent rather than empty: the backend reads "no email" as
            // link-only, which is a different request, not a bad one.
            email: willEmail ? trimmedEmail : undefined,
          },
        },
      );

      const url = response.invite.url;
      if (!willEmail) {
        setResult({ kind: "link_only", url });
      } else if (response.delivery?.status === "sent") {
        setResult({ kind: "sent", email: trimmedEmail, url });
      } else {
        setResult({
          kind: "created_unsent",
          email: trimmedEmail,
          url,
          retriable: response.delivery?.retriable !== false,
          detail: response.delivery?.error ?? null,
        });
      }
      setEmail("");
      // The invitation list below is a Server Component; refreshing is what
      // makes the new row (and its delivery state) appear without a reload.
      router.refresh();
    } catch (err) {
      if (err instanceof FrontendError) {
        const code = err.reason ?? err.code;
        if (err.status === 429) {
          setError("You have created a lot of invitations recently. Try again in a little while.");
        } else if (err.status === 403 && !ERROR_COPY[code]) {
          setError(`You are not allowed to invite a ${STAFF_ROLE_LABELS[role]}.`);
        } else {
          setError(ERROR_COPY[code] ?? "Could not create the invitation. Try again.");
          if (code === "invalid_email" || code === "already_member" || code === "pending_invite") {
            setErrorField("email");
          }
        }
      } else {
        setError("Could not create the invitation. Try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <form className="teacher-form" onSubmit={submit} noValidate>
      <div className="teacher-field">
        <label htmlFor="invite-email">Email address (optional)</label>
        <input
          id="invite-email"
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(null); }}
          autoComplete="off"
          spellCheck={false}
          maxLength={254}
          aria-describedby="invite-email-hint"
          aria-invalid={errorField === "email" || undefined}
        />
        <p className="teacher-hint" id="invite-email-hint">
          {willEmail
            ? "We will email a branded invitation to this address."
            : "Leave blank to create a link you send yourself."}
        </p>
      </div>

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

      <div className="teacher-form-actions">
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy
            ? (willEmail ? "Sending…" : "Creating…")
            : (willEmail ? "Send invitation" : "Create invitation link")}
        </button>
      </div>

      {error ? <p className="teacher-inline-error" role="alert">{error}</p> : null}

      {result ? (
        <div className="teacher-invite-result" role="status">
          {result.kind === "sent" ? (
            <>
              <p className="teacher-inline-success">Invitation sent to {result.email}.</p>
              <p className="teacher-hint">
                It expires in 7 days and can be used once. You can resend it from the list below if it
                does not arrive.
              </p>
            </>
          ) : result.kind === "created_unsent" ? (
            <>
              {/* The state this whole design exists to represent honestly.
                  Never "success", never a bare failure — the invitation is
                  real, and there are two ways forward from here. */}
              <p className="teacher-inline-error">
                Invitation created, but we could not send the email to {result.email}.
              </p>
              <p className="teacher-hint">
                {result.retriable
                  ? "You can resend it from the list below, or copy the link and send it yourself."
                  : "Check the address is correct, or copy the link and send it yourself."}
              </p>
              <div className="teacher-token-box">{result.url}</div>
              <button type="button" className="btn btn-outline" onClick={() => void copyLink(result.url)}>
                {copied ? "Copied" : "Copy link"}
              </button>
            </>
          ) : (
            <>
              <p className="teacher-inline-success">Invitation created.</p>
              <div className="teacher-token-box">{result.url}</div>
              <p className="teacher-token-warning">
                This link is shown only once and is not saved anywhere retrievable — copy it now and
                send it to the person you are inviting. It expires in 7 days and can be used exactly once.
              </p>
              <button type="button" className="btn btn-outline" onClick={() => void copyLink(result.url)}>
                {copied ? "Copied" : "Copy link"}
              </button>
            </>
          )}
        </div>
      ) : null}
    </form>
  );
}
