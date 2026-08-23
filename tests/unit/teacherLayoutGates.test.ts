// FASE TEACHER-WEB-001 — the adversarial cases the mandate names explicitly:
// "Student cannot access Teacher" and cross-tenant organizationId
// substitution. This is the UX-level gate; the backend enforces the same
// boundary independently on every fetch (test/teacherRbac.test.js,
// test/teacherQueries.test.js on the backend repo) — this file proves the
// Next.js layer does not even render a shell for someone it shouldn't.

import { describe, expect, it, vi, beforeEach } from "vitest";

const readAuthCookies = vi.fn();
const loadTeacherMemberships = vi.fn();
const redirect = vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`); });
const notFound = vi.fn(() => { throw new Error("NOT_FOUND"); });

vi.mock("@/lib/server/authCookies", () => ({ readAuthCookies: () => readAuthCookies() }));
vi.mock("@/lib/server/teacher", () => ({ loadTeacherMemberships: () => loadTeacherMemberships() }));
vi.mock("next/navigation", () => ({ redirect, notFound }));
vi.mock("@/components/teacher/TeacherShell", () => ({ TeacherShell: () => null }));

beforeEach(() => {
  readAuthCookies.mockReset();
  loadTeacherMemberships.mockReset();
  redirect.mockClear();
  notFound.mockClear();
});

describe("TeacherLayout — the root gate", () => {
  it("no session at all → redirected to /login before any teacher check runs", async () => {
    readAuthCookies.mockResolvedValue({ accessToken: null, refreshToken: null });
    const { default: TeacherLayout } = await import("@/app/teacher/layout");
    await expect(TeacherLayout({ children: null })).rejects.toThrow("REDIRECT:/login");
    expect(loadTeacherMemberships).not.toHaveBeenCalled();
  });

  it("a real, authenticated STUDENT with zero staff memberships → redirected to /dashboard, not shown a Teacher shell", async () => {
    readAuthCookies.mockResolvedValue({ accessToken: "tok", refreshToken: "ref" });
    loadTeacherMemberships.mockResolvedValue([]);
    const { default: TeacherLayout } = await import("@/app/teacher/layout");
    await expect(TeacherLayout({ children: null })).rejects.toThrow("REDIRECT:/dashboard");
  });

  it("a real teacher with a real membership passes through", async () => {
    readAuthCookies.mockResolvedValue({ accessToken: "tok", refreshToken: "ref" });
    loadTeacherMemberships.mockResolvedValue([{ organizationId: "org-a", role: "teacher", organizationName: "Org A" }]);
    const { default: TeacherLayout } = await import("@/app/teacher/layout");
    const result = await TeacherLayout({ children: "content" as unknown as React.ReactNode });
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe("OrganizationLayout — the per-:organizationId gate", () => {
  it("a teacher of org A requesting org B in the URL gets notFound(), never that org's shell", async () => {
    loadTeacherMemberships.mockResolvedValue([{ organizationId: "org-a", role: "teacher", organizationName: "Org A" }]);
    const { default: OrganizationLayout } = await import("@/app/teacher/[organizationId]/layout");
    await expect(
      OrganizationLayout({ children: null, params: Promise.resolve({ organizationId: "org-b" }) }),
    ).rejects.toThrow("NOT_FOUND");
  });

  it("a completely fabricated organizationId is denied identically to a real foreign one", async () => {
    loadTeacherMemberships.mockResolvedValue([{ organizationId: "org-a", role: "teacher", organizationName: "Org A" }]);
    const { default: OrganizationLayout } = await import("@/app/teacher/[organizationId]/layout");
    await expect(
      OrganizationLayout({ children: null, params: Promise.resolve({ organizationId: "not-a-real-org-id" }) }),
    ).rejects.toThrow("NOT_FOUND");
  });

  it("the caller's OWN real organization renders, not blocked", async () => {
    loadTeacherMemberships.mockResolvedValue([{ organizationId: "org-a", role: "teacher", organizationName: "Org A" }]);
    const { default: OrganizationLayout } = await import("@/app/teacher/[organizationId]/layout");
    await expect(
      OrganizationLayout({ children: null, params: Promise.resolve({ organizationId: "org-a" }) }),
    ).resolves.toBeTruthy();
    expect(notFound).not.toHaveBeenCalled();
  });
});
