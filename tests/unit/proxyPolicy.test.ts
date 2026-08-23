import { describe, expect, it } from "vitest";
import {
  buildUpstreamHeaders,
  decidePolicy,
  isValidIdempotencyKey,
  requiresIdempotency,
} from "../../lib/server/proxyPolicy";

describe("proxyPolicy", () => {
  it("forwards allowlisted learner routes", () => {
    expect(decidePolicy("GET", "/entitlements")).toEqual({ action: "forward" });
    expect(decidePolicy("GET", "/api/reading/passage")).toEqual({ action: "forward" });
    expect(decidePolicy("DELETE", "/api/account")).toEqual({ action: "forward" });
    expect(decidePolicy("POST", "/api/reading/academy/home")).toEqual({ action: "forward" });
    expect(decidePolicy("GET", "/api/listening/intelligence/readiness")).toEqual({ action: "forward" });
    expect(decidePolicy("POST", "/api/writing/orchestrator/next")).toEqual({ action: "forward" });
    expect(decidePolicy("POST", "/api/writing/intelligence/transform")).toEqual({ action: "forward" });
    expect(decidePolicy("POST", "/api/support/conversations")).toEqual({ action: "forward" });
    expect(decidePolicy("POST", "/api/support/conversations/c1/messages")).toEqual({ action: "forward" });
    expect(decidePolicy("GET", "/api/support/cases/c1")).toEqual({ action: "forward" });
  });

  it("returns 410 for legacy and internal paths", () => {
    expect(decidePolicy("GET", "/api/reading/next")).toMatchObject({ action: "deny", status: 410 });
    expect(decidePolicy("POST", "/api/writing/drill-feedback")).toMatchObject({ action: "deny", status: 410 });
    expect(decidePolicy("POST", "/api/speaking/coach/webhook")).toMatchObject({ action: "deny", status: 410 });
    expect(decidePolicy("GET", "/api/internal/proficiency/dashboard")).toMatchObject({
      action: "deny",
      status: 410,
    });
  });

  it("forwards requireAdminUser console routes and keeps shared-secret routes gone", () => {
    expect(decidePolicy("GET", "/api/admin/v2/overview")).toEqual({ action: "forward" });
    expect(decidePolicy("PATCH", "/api/admin/feature-flags/home_v3_enabled")).toEqual({ action: "forward" });
    expect(decidePolicy("GET", "/api/admin/metrics/users")).toEqual({ action: "forward" });
    expect(decidePolicy("POST", "/api/admin/v2/simulate")).toEqual({ action: "forward" });
    expect(decidePolicy("POST", "/api/admin/billing/reconcile")).toMatchObject({ action: "deny", status: 410, reason: "admin_secret" });
    expect(decidePolicy("POST", "/api/reading/generate")).toMatchObject({ action: "deny", status: 410, reason: "admin_secret" });
  });

  it("forwards SLP Command Teacher routes, GET-only", () => {
    expect(decidePolicy("GET", "/api/teacher/me")).toEqual({ action: "forward" });
    expect(decidePolicy("GET", "/api/teacher/organizations/org-1/students")).toEqual({ action: "forward" });
    expect(decidePolicy("GET", "/api/teacher/organizations/org-1/students/stu-1")).toEqual({ action: "forward" });
    expect(decidePolicy("GET", "/api/teacher/organizations/org-1/students/stu-1/activity")).toEqual({ action: "forward" });
    expect(decidePolicy("GET", "/api/teacher/organizations/org-1/students/stu-1/writing")).toEqual({ action: "forward" });
    expect(decidePolicy("GET", "/api/teacher/organizations/org-1/students/stu-1/proficiency")).toEqual({ action: "forward" });
    expect(decidePolicy("GET", "/api/teacher/organizations/org-1/students/stu-1/speaking")).toEqual({ action: "forward" });
    expect(decidePolicy("GET", "/api/teacher/organizations/org-1/students/stu-1/diagnosis")).toEqual({ action: "forward" });
    expect(decidePolicy("GET", "/api/teacher/organizations/org-1/alerts")).toEqual({ action: "forward" });
  });

  it("never forwards a write to a Teacher route — this phase is read-only", () => {
    expect(decidePolicy("POST", "/api/teacher/organizations/org-1/students")).toMatchObject({ action: "deny", status: 404 });
    expect(decidePolicy("PATCH", "/api/teacher/organizations/org-1/students/stu-1")).toMatchObject({ action: "deny", status: 404 });
    expect(decidePolicy("DELETE", "/api/teacher/me")).toMatchObject({ action: "deny", status: 404 });
  });

  it("a slash smuggled into the :organizationId segment does not escape the pattern", () => {
    // The proxy's own allowlist is not the tenant-isolation boundary — the
    // backend's requireOrgMembership is — but a malformed organizationId
    // should still fail closed here rather than silently forward to a
    // different real backend path.
    expect(decidePolicy("GET", "/api/teacher/organizations/org-1/../org-2/students")).toMatchObject({ action: "deny" });
  });

  it("returns 404 for unknown paths and disallowed methods", () => {
    expect(decidePolicy("GET", "/api/unknown/thing")).toMatchObject({ action: "deny", status: 404 });
    expect(decidePolicy("PUT", "/api/profile")).toMatchObject({ action: "deny", status: 404 });
  });

  it("requires idempotency on quota GETs and writes", () => {
    expect(requiresIdempotency("GET", "/api/reading/passage")).toBe(true);
    expect(requiresIdempotency("GET", "/api/progress")).toBe(false);
    expect(isValidIdempotencyKey("wsub-abc")).toBe(true);
    expect(isValidIdempotencyKey("bad key")).toBe(false);
  });

  it("never copies Cookie into upstream headers", () => {
    const headers = buildUpstreamHeaders({
      accessToken: "tok",
      correlationId: "cid",
      idempotencyKey: "abc",
      clientIp: "1.2.3.4",
    });
    expect(headers.get("Authorization")).toBe("Bearer tok");
    expect(headers.get("Cookie")).toBeNull();
    expect(headers.get("X-Idempotency-Key")).toBe("abc");
    expect(headers.get("X-SLP-Client-IP")).toBe("1.2.3.4");
  });
});
