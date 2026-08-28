/** @vitest-environment happy-dom */

// FASE PLATFORM-MAIL-001 — the invitation UI.
//
// The behaviour worth protecting is the three-way outcome. Creating an
// invitation can end in "sent", "created but not sent", or "link only", and
// they are genuinely different situations with different next actions.
// Collapsing the middle one into either neighbour is the bug these tests
// exist to prevent: reported as success, an administrator never chases it;
// reported as failure, they create a duplicate.

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
const apiRequest = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push: vi.fn() }) }));
vi.mock("@/lib/api/client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/errors")>("@/lib/api/errors");
  return { apiRequest: (...args: unknown[]) => apiRequest(...args), FrontendError: actual.FrontendError };
});

import { CreateInviteForm } from "../../components/teacher/CreateInviteForm";
import { InviteList } from "../../components/teacher/InviteList";
import { FrontendError } from "@/lib/api/errors";
import type { OrganizationInvite } from "@/lib/platform/types";

const ORG = "org-1";
const URL_FOR = (t: string) => `https://slpcommand.com/invite/accept?token=${t}`;

afterEach(cleanup);
beforeEach(() => {
  refresh.mockReset();
  apiRequest.mockReset();
  // happy-dom exposes navigator.clipboard as a getter-only property, so
  // Object.assign throws. defineProperty is the only way to stand a stub in
  // its place, and `configurable` lets each test replace it again.
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    configurable: true,
    writable: true,
  });
});

const emailField = () => screen.getByLabelText(/Email address/i);
const submitBtn = () => screen.getByRole("button", { name: /Send invitation|Create invitation link/i });

function created(delivery: Record<string, unknown>, token = "tok-1") {
  return { ok: true, invite: { id: "i1", role: "student", email: null, expiresAt: "2026-09-03", token, url: URL_FOR(token) }, delivery };
}

// ═══════════════════════════════════════════════════════════════════════════
describe("CreateInviteForm — one form, two deliberate modes", () => {
// ═══════════════════════════════════════════════════════════════════════════
  it("with NO email, sends no email field and offers the link — the pre-D4 flow intact", async () => {
    apiRequest.mockResolvedValue(created({ status: "not_requested" }));
    render(<CreateInviteForm organizationId={ORG} groups={[]} />);
    fireEvent.click(submitBtn());
    await waitFor(() => expect(apiRequest).toHaveBeenCalled());
    expect(apiRequest.mock.calls[0][1].body.email).toBeUndefined();
    await waitFor(() => expect(screen.getByText(URL_FOR("tok-1"))).toBeTruthy());
    expect(screen.getByText(/shown only once/i)).toBeTruthy();
  });

  it("the button says what it will do, and changes when an address is typed", () => {
    apiRequest.mockResolvedValue(created({ status: "sent" }));
    render(<CreateInviteForm organizationId={ORG} groups={[]} />);
    expect(screen.getByRole("button", { name: "Create invitation link" })).toBeTruthy();
    fireEvent.change(emailField(), { target: { value: "ana@example.com" } });
    expect(screen.getByRole("button", { name: "Send invitation" })).toBeTruthy();
  });

  it("with an email, sends it and reports SENT", async () => {
    apiRequest.mockResolvedValue(created({ status: "sent" }));
    render(<CreateInviteForm organizationId={ORG} groups={[]} />);
    fireEvent.change(emailField(), { target: { value: "  Ana@Example.com  " } });
    fireEvent.click(submitBtn());
    await waitFor(() => expect(apiRequest.mock.calls[0][1].body.email).toBe("Ana@Example.com"));
    await waitFor(() => expect(screen.getByText(/Invitation sent to Ana@Example\.com/)).toBeTruthy());
  });

  it("CREATED BUT NOT SENT is its own outcome — not success, not plain failure", async () => {
    // The test this whole component is shaped around.
    apiRequest.mockResolvedValue(created({ status: "failed", retriable: true, error: "503: upstream" }));
    render(<CreateInviteForm organizationId={ORG} groups={[]} />);
    fireEvent.change(emailField(), { target: { value: "ana@example.com" } });
    fireEvent.click(submitBtn());

    await waitFor(() => expect(screen.getByText(/could not send the email/i)).toBeTruthy());
    // It says the invitation EXISTS…
    expect(screen.getByText(/Invitation created, but/i)).toBeTruthy();
    // …and gives both ways forward.
    expect(screen.getByText(/resend it from the list below, or copy the link/i)).toBeTruthy();
    expect(screen.getByText(URL_FOR("tok-1"))).toBeTruthy();
    // It must NOT claim success.
    expect(screen.queryByText(/Invitation sent to/i)).toBeNull();
  });

  it("a NON-retriable failure advises checking the address rather than retrying", async () => {
    apiRequest.mockResolvedValue(created({ status: "failed", retriable: false, error: "422" }));
    render(<CreateInviteForm organizationId={ORG} groups={[]} />);
    fireEvent.change(emailField(), { target: { value: "ana@example.com" } });
    fireEvent.click(submitBtn());
    await waitFor(() => expect(screen.getByText(/Check the address is correct/i)).toBeTruthy());
  });

  it("the link is offered even when delivery failed, so the invitation is not lost", async () => {
    apiRequest.mockResolvedValue(created({ status: "failed", retriable: true }));
    render(<CreateInviteForm organizationId={ORG} groups={[]} />);
    fireEvent.change(emailField(), { target: { value: "ana@example.com" } });
    fireEvent.click(submitBtn());
    await waitFor(() => expect(screen.getByRole("button", { name: /Copy link/i })).toBeTruthy());
  });

  it("refreshes so the invitation list picks up the new row", async () => {
    apiRequest.mockResolvedValue(created({ status: "sent" }));
    render(<CreateInviteForm organizationId={ORG} groups={[]} />);
    fireEvent.change(emailField(), { target: { value: "ana@example.com" } });
    fireEvent.click(submitBtn());
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });
});

describe("CreateInviteForm — refusals read as instructions", () => {
  async function failWith(status: number, reason: string | undefined, expected: RegExp) {
    apiRequest.mockRejectedValue(new FrontendError({ code: "backend", message: "no", status, reason }));
    render(<CreateInviteForm organizationId={ORG} groups={[]} />);
    fireEvent.change(emailField(), { target: { value: "ana@example.com" } });
    fireEvent.click(submitBtn());
    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(expected));
  }

  it("already a member", async () => {
    await failWith(409, "already_member", /already a member/i);
  });

  it("a pending invitation already exists — and points at the resend action", async () => {
    await failWith(409, "pending_invite", /already a pending invitation.*resend/is);
  });

  it("an invalid address names the field", async () => {
    await failWith(400, "invalid_email", /valid email address/i);
    expect(emailField().getAttribute("aria-invalid")).toBe("true");
  });

  it("the rate limit reads as a wait, not a rejection", async () => {
    await failWith(429, undefined, /Try again in a little while/i);
  });

  it("a role refusal names the role", async () => {
    apiRequest.mockRejectedValue(new FrontendError({ code: "backend", message: "no", status: 403 }));
    render(<CreateInviteForm organizationId={ORG} groups={[]} />);
    fireEvent.click(submitBtn());
    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/not allowed to invite/i));
  });

  it("no result panel is shown when the request failed", async () => {
    await failWith(409, "already_member", /already a member/i);
    expect(screen.queryByText(/Invitation created/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /Copy link/i })).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("InviteList — delivery state and resend", () => {
// ═══════════════════════════════════════════════════════════════════════════
  const invite = (over: Partial<OrganizationInvite> = {}): OrganizationInvite => ({
    id: "i1", role: "student", status: "pending", groupId: null,
    email: "ana@example.com",
    delivery: { status: "sent", error: null, lastSentAt: "2026-08-01T00:00:00Z", sendCount: 1, canResend: true },
    expiresAt: "2026-09-03T00:00:00Z", createdAt: "2026-08-27T00:00:00Z",
    acceptedAt: null, invitedBy: "u1", acceptedBy: null,
    ...over,
  });

  const list = (invites: OrganizationInvite[], canInvite = true) =>
    render(<InviteList organizationId={ORG} invites={invites} canInvite={canInvite} />);

  it("shows the recipient", () => {
    list([invite()]);
    expect(screen.getByText("ana@example.com")).toBeTruthy();
  });

  it("a link-only invitation says so, and is NOT dressed up as a failure", () => {
    list([invite({ email: null, delivery: { status: "not_requested", error: null, lastSentAt: null, sendCount: 0, canResend: false } })]);
    expect(screen.getByText("Link only")).toBeTruthy();
    expect(screen.getByText("No address")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Resend" })).toBeNull();
  });

  it("delivery state is conveyed by WORDS, not colour alone", () => {
    // A status only a sighted reader can perceive is not a status.
    list([invite({ delivery: { status: "failed", error: "503", lastSentAt: null, sendCount: 1, canResend: true } })]);
    expect(screen.getByText("Not delivered")).toBeTruthy();
  });

  it("shows the sanitised provider error beside a failure", () => {
    list([invite({ delivery: { status: "failed", error: "503: upstream", lastSentAt: null, sendCount: 1, canResend: true } })]);
    expect(screen.getByText(/503: upstream/)).toBeTruthy();
  });

  it("resends, and says the previous link has stopped working", async () => {
    // The consequence of token rotation, surfaced where the person acts.
    apiRequest.mockResolvedValue({ ok: true, delivery: { status: "sent" } });
    list([invite()]);
    fireEvent.click(screen.getByRole("button", { name: "Resend" }));
    await waitFor(() =>
      expect(apiRequest).toHaveBeenCalledWith(`/api/teacher/organizations/${ORG}/invites/i1/resend`, { method: "POST" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toMatch(/stopped working/i));
  });

  it("a resend whose email fails says the invitation is still valid", async () => {
    apiRequest.mockResolvedValue({ ok: true, delivery: { status: "failed", retriable: true } });
    list([invite()]);
    fireEvent.click(screen.getByRole("button", { name: "Resend" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toMatch(/still valid/i));
  });

  it("resend is DISABLED during cooldown, and says why without needing a click", () => {
    // Disabled with no explanation is a dead end. The title carries the reason
    // for pointer and assistive-technology users alike.
    list([invite({ delivery: { status: "sent", error: null, lastSentAt: "now", sendCount: 1, canResend: false } })]);
    const btn = screen.getByRole("button", { name: "Resend" });
    expect(btn).toHaveProperty("disabled", true);
    expect(btn.getAttribute("title")).toMatch(/sent very recently/i);
  });

  it("at the send maximum, the reason says so instead of blaming timing", () => {
    list([invite({ delivery: { status: "sent", error: null, lastSentAt: "old", sendCount: 5, canResend: false } })]);
    expect(screen.getByRole("button", { name: "Resend" }).getAttribute("title")).toMatch(/maximum number of times/i);
  });

  it("cooldown and max-send refusals from the server get their own messages", async () => {
    for (const [reason, expected] of [
      ["cooldown", /few minutes/i],
      ["max_sends", /maximum number of times/i],
      ["expired", /expired/i],
    ] as const) {
      cleanup();
      apiRequest.mockRejectedValue(new FrontendError({ code: "backend", message: "x", status: 409, reason }));
      list([invite()]);
      fireEvent.click(screen.getByRole("button", { name: "Resend" }));
      await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(expected));
    }
  });

  it("someone without members.invite gets no actions at all", () => {
    list([invite()], false);
    expect(screen.queryByRole("button", { name: "Resend" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Revoke" })).toBeNull();
  });

  it("an accepted invitation offers no actions", () => {
    list([invite({ status: "accepted" })]);
    expect(screen.queryByRole("button", { name: "Resend" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Revoke" })).toBeNull();
  });

  it("the caption states the rotation consequence before anyone clicks", () => {
    list([invite()]);
    expect(screen.getByText(/Resending an invitation creates a new link/i)).toBeTruthy();
  });

  it("NEVER renders a token or a hash", () => {
    list([invite()]);
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/token/i);
    expect(text).not.toMatch(/[a-f0-9]{64}/);
  });

  it("an empty list is an empty state, not a headerless table", () => {
    list([]);
    expect(screen.getByText(/No invitations have been created yet/i)).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });
});
