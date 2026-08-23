// FASE TEACHER-WEB-001 — the server-side data loaders never fabricate data
// on a non-2xx. A student's Teacher data must degrade to "nothing", never to
// a guess, and never throw into a Server Component render.

import { describe, expect, it, vi, beforeEach } from "vitest";

const backendJson = vi.fn();
vi.mock("@/lib/server/backend", () => ({ backendJson: (init: unknown) => backendJson(init) }));

// react's cache() memoizes per-request via AsyncLocalStorage in the real
// runtime; under Vitest (no request context) it degrades to a plain
// pass-through, which is exactly what these tests want — each call hits the
// mock fresh.

beforeEach(() => {
  backendJson.mockReset();
});

describe("loadTeacherMemberships", () => {
  it("returns memberships on 200", async () => {
    backendJson.mockResolvedValue({ status: 200, data: { ok: true, memberships: [{ organizationId: "o1", role: "teacher", organizationName: "Org" }] } });
    const { loadTeacherMemberships } = await import("@/lib/server/teacher");
    const result = await loadTeacherMemberships();
    expect(result).toEqual([{ organizationId: "o1", role: "teacher", organizationName: "Org" }]);
  });

  it("returns [] on 403 (not a teacher anywhere) rather than throwing", async () => {
    backendJson.mockResolvedValue({ status: 403, data: null });
    const { loadTeacherMemberships } = await import("@/lib/server/teacher");
    const result = await loadTeacherMemberships();
    expect(result).toEqual([]);
  });

  it("returns [] on a network/5xx failure — never fabricates a membership", async () => {
    backendJson.mockResolvedValue({ status: 500, data: null });
    const { loadTeacherMemberships } = await import("@/lib/server/teacher");
    expect(await loadTeacherMemberships()).toEqual([]);
  });
});

describe("hasTeacherAccess", () => {
  it("false when the caller has zero memberships", async () => {
    backendJson.mockResolvedValue({ status: 200, data: { ok: true, memberships: [] } });
    const { hasTeacherAccess } = await import("@/lib/server/teacher");
    expect(await hasTeacherAccess()).toBe(false);
  });

  it("true when at least one real membership exists", async () => {
    backendJson.mockResolvedValue({ status: 200, data: { ok: true, memberships: [{ organizationId: "o1", role: "teacher", organizationName: null }] } });
    const { hasTeacherAccess } = await import("@/lib/server/teacher");
    expect(await hasTeacherAccess()).toBe(true);
  });
});

describe("per-student loaders — 404 (cross-tenant, or truly missing) yields null, never a guess", () => {
  it("loadStudentSummary", async () => {
    backendJson.mockResolvedValue({ status: 404, data: null });
    const { loadStudentSummary } = await import("@/lib/server/teacher");
    expect(await loadStudentSummary("org-a", "someone-elses-student")).toBeNull();
  });

  it("loadStudentActivity", async () => {
    backendJson.mockResolvedValue({ status: 404, data: null });
    const { loadStudentActivity } = await import("@/lib/server/teacher");
    expect(await loadStudentActivity("org-a", "stu")).toBeNull();
  });

  it("loadStudentWriting", async () => {
    backendJson.mockResolvedValue({ status: 404, data: null });
    const { loadStudentWriting } = await import("@/lib/server/teacher");
    expect(await loadStudentWriting("org-a", "stu")).toBeNull();
  });

  it("loadStudentDiagnosis", async () => {
    backendJson.mockResolvedValue({ status: 404, data: null });
    const { loadStudentDiagnosis } = await import("@/lib/server/teacher");
    expect(await loadStudentDiagnosis("org-a", "stu")).toBeNull();
  });
});

describe("loadOrganizationStudents — query params reach the backend correctly", () => {
  it("passes limit/offset, and the organizationId is in the PATH, never a query param an attacker could juggle", async () => {
    backendJson.mockResolvedValue({ status: 200, data: { ok: true, students: [], total: 0 } });
    const { loadOrganizationStudents } = await import("@/lib/server/teacher");
    await loadOrganizationStudents("org-xyz", { limit: 25, offset: 50 });
    const call = backendJson.mock.calls[0][0];
    expect(call.path).toBe("/api/teacher/organizations/org-xyz/students");
    expect(call.search).toBe("?limit=25&offset=50");
  });

  it("returns null (not an empty roster) on a backend error, so the page can tell the two apart", async () => {
    backendJson.mockResolvedValue({ status: 500, data: null });
    const { loadOrganizationStudents } = await import("@/lib/server/teacher");
    expect(await loadOrganizationStudents("org-a")).toBeNull();
  });
});
