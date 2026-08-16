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
