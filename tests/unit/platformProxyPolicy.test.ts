// FASE PLATFORM-TENANT-001 — the proxy allowlist for the platform routes.
//
// WHAT THIS LAYER IS AND IS NOT. The allowlist says only whether the browser
// may reach a backend path AT ALL. Who may actually do the thing is decided by
// the backend's own requireTeacherRole + requireOrgMembership +
// requirePermission stack, from a verified JWT, on every request.
//
// So the property worth testing is the SHAPE of the allowlist: that each new
// route is reachable with exactly the method it needs and no other, and that
// nothing adjacent was opened by accident. A too-broad pattern here does not
// grant access — but it does widen the surface the backend has to defend, and
// it is the kind of mistake that is invisible in review.

import { describe, expect, it } from "vitest";
import { decidePolicy } from "../../lib/server/proxyPolicy";

const ORG = "c6a7a68c-344c-43f6-92fd-a8561ddfd14a";
const USER = "0022cccf-5b8c-4cdb-891a-ff6068fe3e13";

const forward = { action: "forward" } as const;

describe("tenant resolution is reachable, and read-only", () => {
  it("forwards the public resolver", () => {
    expect(decidePolicy("GET", "/api/platform/tenant/resolve")).toEqual(forward);
    expect(decidePolicy("GET", "/api/platform/tenant/by-slug/academy-a")).toEqual(forward);
  });

  it("refuses to forward a write to it", () => {
    // There is no write endpoint here, and the browser must not be able to
    // probe for one.
    expect(decidePolicy("POST", "/api/platform/tenant/resolve")).not.toEqual(forward);
    expect(decidePolicy("DELETE", "/api/platform/tenant/by-slug/academy-a")).not.toEqual(forward);
  });

  it("does not open the whole /api/platform namespace", () => {
    expect(decidePolicy("GET", "/api/platform/anything-else")).not.toEqual(forward);
    expect(decidePolicy("GET", "/api/platform/tenant")).not.toEqual(forward);
  });
});

describe("organization administration routes", () => {
  const base = `/api/teacher/organizations/${ORG}`;

  it("forwards settings and branding with their real methods", () => {
    expect(decidePolicy("GET", `${base}/settings`)).toEqual(forward);
    expect(decidePolicy("PATCH", `${base}/settings`)).toEqual(forward);
    expect(decidePolicy("GET", `${base}/branding`)).toEqual(forward);
    expect(decidePolicy("PATCH", `${base}/branding`)).toEqual(forward);
    expect(decidePolicy("DELETE", `${base}/branding`)).toEqual(forward);
  });

  it("forwards member administration", () => {
    expect(decidePolicy("GET", `${base}/members`)).toEqual(forward);
    expect(decidePolicy("PATCH", `${base}/members/${USER}/role`)).toEqual(forward);
    expect(decidePolicy("PATCH", `${base}/members/${USER}/group`)).toEqual(forward);
    expect(decidePolicy("DELETE", `${base}/members/${USER}`)).toEqual(forward);
  });

  it("forwards invitation listing and revocation", () => {
    expect(decidePolicy("GET", `${base}/invites`)).toEqual(forward);
    expect(decidePolicy("DELETE", `${base}/invites/some-invite-id`)).toEqual(forward);
  });

  it("forwards flags, reports and audit", () => {
    expect(decidePolicy("GET", `${base}/flags`)).toEqual(forward);
    expect(decidePolicy("PATCH", `${base}/flags/academy_enabled`)).toEqual(forward);
    for (const report of ["overview", "activity", "proficiency", "groups"]) {
      expect(decidePolicy("GET", `${base}/reports/${report}`)).toEqual(forward);
    }
    expect(decidePolicy("GET", `${base}/audit`)).toEqual(forward);
  });
});

describe("the allowlist stayed narrow", () => {
  const base = `/api/teacher/organizations/${ORG}`;

  it("does not open methods a route does not have", () => {
    expect(decidePolicy("POST", `${base}/settings`)).not.toEqual(forward);
    expect(decidePolicy("DELETE", `${base}/settings`)).not.toEqual(forward);
    expect(decidePolicy("POST", `${base}/members`)).not.toEqual(forward);
    expect(decidePolicy("DELETE", `${base}/audit`)).not.toEqual(forward);
    expect(decidePolicy("PATCH", `${base}/reports/overview`)).not.toEqual(forward);
    // No report may be DELETEd, and the audit trail is append-only.
    expect(decidePolicy("DELETE", `${base}/reports/overview`)).not.toEqual(forward);
  });

  it("does not open an invented sibling path", () => {
    expect(decidePolicy("GET", `${base}/secrets`)).not.toEqual(forward);
    expect(decidePolicy("GET", `${base}/members/${USER}/secrets`)).not.toEqual(forward);
    expect(decidePolicy("PATCH", `${base}/members/${USER}`)).not.toEqual(forward);
  });

  it("does not let a path segment swallow a slash", () => {
    // `[^/]+` rather than `.+`: without that, one pattern would match paths
    // several segments deeper than it was written for.
    expect(decidePolicy("GET", `${base}/reports/overview/extra`)).not.toEqual(forward);
    expect(decidePolicy("PATCH", `${base}/flags/a/b`)).not.toEqual(forward);
    expect(decidePolicy("DELETE", `${base}/invites/a/b`)).not.toEqual(forward);
  });
});

describe("the routes that existed before are untouched", () => {
  // A regression guard on the edit itself: appending to the ALLOW list must
  // not have reordered or shadowed anything, and the DENY list is evaluated
  // first and must still win.
  it("still forwards the learner and Teacher routes", () => {
    expect(decidePolicy("GET", "/api/entitlements")).toEqual(forward);
    expect(decidePolicy("GET", "/api/teacher/me")).toEqual(forward);
    expect(decidePolicy("GET", `/api/teacher/organizations/${ORG}/students`)).toEqual(forward);
    expect(decidePolicy("POST", `/api/teacher/organizations/${ORG}/groups`)).toEqual(forward);
    expect(decidePolicy("POST", "/api/teacher/invites/accept")).toEqual(forward);
  });

  it("still denies what it denied before", () => {
    expect(decidePolicy("POST", "/api/billing/revenuecat/webhook")).toMatchObject({ action: "deny" });
    expect(decidePolicy("POST", "/api/admin/billing/reconcile")).toMatchObject({ action: "deny" });
    expect(decidePolicy("GET", "/api/internal/anything")).toMatchObject({ action: "deny" });
  });
});
