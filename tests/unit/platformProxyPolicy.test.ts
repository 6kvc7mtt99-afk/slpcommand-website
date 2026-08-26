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

describe("PLATFORM-DOMAINS-001 — the custom domain lifecycle", () => {
  const base = `/api/teacher/organizations/${ORG}/domain`;

  it("forwards each lifecycle route with exactly its own method", () => {
    expect(decidePolicy("GET", base)).toEqual(forward);
    expect(decidePolicy("POST", base)).toEqual(forward);
    expect(decidePolicy("DELETE", base)).toEqual(forward);
    for (const action of ["verify", "activate", "deactivate"]) {
      expect(decidePolicy("POST", `${base}/${action}`), action).toEqual(forward);
    }
  });

  it("does not open methods those routes do not have", () => {
    expect(decidePolicy("PATCH", base)).not.toEqual(forward);
    expect(decidePolicy("PUT", base)).not.toEqual(forward);
    // verify/activate/deactivate WRITE, so they are POST-only. A GET that
    // triggered a DNS lookup and a status change would be a route a browser
    // prefetcher could fire on its own.
    expect(decidePolicy("GET", `${base}/verify`)).not.toEqual(forward);
    expect(decidePolicy("GET", `${base}/activate`)).not.toEqual(forward);
    expect(decidePolicy("DELETE", `${base}/verify`)).not.toEqual(forward);
  });

  it("does not open an invented lifecycle action", () => {
    // The alternation is explicit, not `[^/]+` — so a future endpoint has to
    // be added here deliberately rather than being reachable the day it lands.
    expect(decidePolicy("POST", `${base}/force-activate`)).not.toEqual(forward);
    expect(decidePolicy("POST", `${base}/verify/extra`)).not.toEqual(forward);
  });
});

describe("PLATFORM-ACADEMY-001 — group rename", () => {
  it("forwards PATCH on a single group", () => {
    expect(decidePolicy("PATCH", `/api/teacher/organizations/${ORG}/groups/group-1`)).toEqual(forward);
  });

  it("does not open DELETE on a group", () => {
    // There is no delete-group endpoint. Deleting a cohort with students in it
    // is a product decision nobody has made, and the proxy should not be the
    // place it becomes reachable.
    expect(decidePolicy("DELETE", `/api/teacher/organizations/${ORG}/groups/group-1`)).not.toEqual(forward);
  });

  it("does not let the group id swallow a slash", () => {
    expect(decidePolicy("PATCH", `/api/teacher/organizations/${ORG}/groups/a/b`)).not.toEqual(forward);
  });
});

describe("PLATFORM-PROVISIONING-001 — academy creation", () => {
  // These cases exist because their absence is what broke /academy/new in
  // production. The page shipped, was gated correctly, and rendered "we could
  // not load your account" for every authenticated user — because this
  // deny-by-default allowlist had no rule for the routes it needed, and the
  // page's own tests mocked the fetch layer and so could never have noticed.
  // A route is not reachable from the browser until it appears here.

  it("forwards the four routes the creation flow needs, and only with their own method", () => {
    expect(decidePolicy("GET", "/api/academies/quota")).toEqual(forward);
    expect(decidePolicy("GET", "/api/academies/slug-available")).toEqual(forward);
    expect(decidePolicy("GET", "/api/academies/suggest-slug")).toEqual(forward);
    expect(decidePolicy("POST", "/api/academies")).toEqual(forward);
  });

  it("still forwards them with their query strings attached", () => {
    // decidePolicy strips the query before matching. If it ever stopped doing
    // that, the `$` anchors would reject every real call from the form —
    // which is exactly how these routes are used.
    expect(decidePolicy("GET", "/api/academies/slug-available?slug=madrid")).toEqual(forward);
    expect(decidePolicy("GET", "/api/academies/suggest-slug?name=Madrid%20Language%20Centre")).toEqual(forward);
  });

  it("does NOT open a listing at /api/academies", () => {
    // No such endpoint exists. A listing would answer "what academies are
    // there", which is not a question any tenant may ask of the platform.
    expect(decidePolicy("GET", "/api/academies")).not.toEqual(forward);
  });

  it("does NOT open DELETE anywhere in the namespace", () => {
    // There is no delete-organization path anywhere in this system — that is a
    // stated limitation of D1/D2, not an omission the proxy should paper over.
    expect(decidePolicy("DELETE", "/api/academies")).not.toEqual(forward);
    expect(decidePolicy("DELETE", "/api/academies/quota")).not.toEqual(forward);
    expect(decidePolicy("DELETE", "/api/academies/some-org-id")).not.toEqual(forward);
  });

  it("does NOT open the /api/academies prefix", () => {
    // The single most important assertion here: a broad prefix rule would
    // forward every future path under this namespace before anybody decided
    // the browser should reach it.
    for (const path of [
      "/api/academies/anything-else",
      "/api/academies/quota/extra",
      "/api/academies/slug-available/extra",
      "/api/academies/suggest-slug/extra",
      "/api/academies/some-org-id",
      "/api/academies/some-org-id/members",
    ]) {
      expect(decidePolicy("GET", path), `GET ${path} must not forward`).not.toEqual(forward);
      expect(decidePolicy("POST", path), `POST ${path} must not forward`).not.toEqual(forward);
    }
  });

  it("pins each route to ONE method — the adjacent-method matrix", () => {
    const cases: Array<[string, string[]]> = [
      ["/api/academies/quota", ["POST", "PATCH", "PUT", "DELETE"]],
      ["/api/academies/slug-available", ["POST", "PATCH", "PUT", "DELETE"]],
      ["/api/academies/suggest-slug", ["POST", "PATCH", "PUT", "DELETE"]],
      // GET on the creation route would be a listing; PATCH/PUT/DELETE would be
      // mutations that do not exist.
      ["/api/academies", ["GET", "PATCH", "PUT", "DELETE"]],
    ];
    for (const [path, methods] of cases) {
      for (const m of methods) {
        expect(decidePolicy(m, path), `${m} ${path} must not forward`).not.toEqual(forward);
      }
    }
  });

  it("does not accidentally open a neighbouring namespace", () => {
    for (const path of ["/api/academy", "/api/academy/new", "/api/academies-admin", "/api/academiesx"]) {
      expect(decidePolicy("GET", path), `GET ${path}`).not.toEqual(forward);
      expect(decidePolicy("POST", path), `POST ${path}`).not.toEqual(forward);
    }
  });

  it("leaves the platform-admin provisioning route where it already was", () => {
    // POST /api/admin/organizations was already reachable through the
    // /api/admin/ rule and gated by requireAdminUser upstream. This change must
    // not have altered that either way.
    expect(decidePolicy("POST", "/api/admin/organizations")).toEqual(forward);
  });
});
