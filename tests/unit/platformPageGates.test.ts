// FASE PLATFORM-ENTERPRISE-001 — the UX-level gate on the administration pages.
//
// Same discipline as teacherLayoutGates.test.ts: the backend enforces the real
// boundary independently on every fetch, and this proves the Next.js layer does
// not even render a page for someone it should not — so a teacher who types
// /settings gets a 404 page rather than a screen of controls that all answer
// 403, and a member of another organization gets nothing at all.

import { describe, expect, it, vi, beforeEach } from "vitest";

const loadTeacherMemberships = vi.fn();
const notFound = vi.fn(() => { throw new Error("NOT_FOUND"); });

vi.mock("@/lib/server/teacher", () => ({
  loadTeacherMemberships: () => loadTeacherMemberships(),
  // PLATFORM-GROUPS-001 — People now offers a group selector per row, so the
  // page loads the organization's groups. Added to the mock as capability;
  // no assertion in this file changed, and an empty list is the shape a
  // gate test wants — it is about who may reach the page, not what is on it.
  loadOrganizationGroups: vi.fn(async () => ({ ok: true, groups: [], unassignedCount: 0 })),
  loadOrganizationStudents: vi.fn(async () => ({ ok: true, students: [], total: 0 })),
}));
vi.mock("next/navigation", () => ({ notFound, redirect: vi.fn() }));
vi.mock("@/lib/server/platform", () => ({
  loadOrganizationMembers: vi.fn(async () => []),
  loadOrganizationInvites: vi.fn(async () => []),
  loadOrganizationSettings: vi.fn(async () => ({
    settings: {
      organizationId: "org-a", name: "Academy A", slug: "academy-a", type: "academy",
      status: "active", customDomain: null, customDomainStatus: "none",
      createdAt: "2026-01-01T00:00:00Z",
    },
    branding: null,
  })),
  loadOrganizationFlags: vi.fn(async () => ({})),
  loadOrganizationAudit: vi.fn(async () => ({ entries: [], total: 0 })),
  // PLATFORM-DOMAINS-001 — the settings page now also loads the domain claim.
  loadDomainClaim: vi.fn(async () => ({
    domain: null, status: "none", verifiedAt: null, lastCheckedAt: null,
    lastError: null, tokenExpired: false, instructions: null,
  })),
}));
vi.mock("@/lib/server/authCookies", () => ({ readAuthCookies: vi.fn(async () => ({ userId: "u1" })) }));
vi.mock("@/components/teacher/MemberTable", () => ({ MemberTable: () => null }));
vi.mock("@/components/teacher/InviteList", () => ({ InviteList: () => null }));
vi.mock("@/components/teacher/CreateInviteForm", () => ({ CreateInviteForm: () => null }));
vi.mock("@/components/teacher/BrandingForm", () => ({ BrandingForm: () => null }));
vi.mock("@/components/teacher/OrganizationNameForm", () => ({ OrganizationNameForm: () => null }));
vi.mock("@/components/teacher/FlagToggles", () => ({ FlagToggles: () => null }));
vi.mock("@/components/teacher/DomainManager", () => ({ DomainManager: () => null }));

beforeEach(() => {
  loadTeacherMemberships.mockReset();
  notFound.mockClear();
});

const ORG = "org-a";
const OTHER = "org-b";
const params = (organizationId: string) => Promise.resolve({ organizationId });

const membership = (organizationId: string, role: string) =>
  ({ organizationId, role, organizationName: "Academy A" });

async function renderPage(mod: string, organizationId: string) {
  const { default: Page } = await import(mod);
  return Page({ params: params(organizationId) });
}

const PAGES = [
  { name: "members", mod: "@/app/teacher/[organizationId]/members/page", allowedFor: ["owner", "admin", "teacher"] },
  { name: "settings", mod: "@/app/teacher/[organizationId]/settings/page", allowedFor: ["owner", "admin", "teacher"] },
  { name: "audit", mod: "@/app/teacher/[organizationId]/audit/page", allowedFor: ["owner", "admin"] },
  // PLATFORM-MAIL-001 — /invites had NO permission gate: the navigation hid
  // it, but typing the URL rendered the form for anyone who passed
  // TeacherLayout. The backend refused every request it made, so nothing was
  // exposed — but a page whose every control answers 403 is a worse
  // experience than a 404, and this list is where that is now enforced.
  // A teacher holds members.invite, so all three staff roles reach it.
  { name: "invites", mod: "@/app/teacher/[organizationId]/invites/page", allowedFor: ["owner", "admin", "teacher"] },
];

describe("cross-tenant: a member of another organization gets nothing", () => {
  for (const page of PAGES) {
    it(`${page.name} 404s when the URL names an organization the caller is not in`, async () => {
      loadTeacherMemberships.mockResolvedValue([membership(OTHER, "owner")]);
      await expect(renderPage(page.mod, ORG)).rejects.toThrow("NOT_FOUND");
      expect(notFound).toHaveBeenCalled();
    });
  }

  it("a caller with no memberships at all gets nothing", async () => {
    loadTeacherMemberships.mockResolvedValue([]);
    for (const page of PAGES) {
      await expect(renderPage(page.mod, ORG)).rejects.toThrow("NOT_FOUND");
    }
  });
});

describe("permission: the audit trail is not open to teachers", () => {
  it("a teacher of this organization still 404s on Security", async () => {
    // The one place a role INSIDE the organization is refused. Membership is
    // real; the permission is not.
    loadTeacherMemberships.mockResolvedValue([membership(ORG, "teacher")]);
    await expect(renderPage("@/app/teacher/[organizationId]/audit/page", ORG)).rejects.toThrow("NOT_FOUND");
  });

  it("an owner reaches it", async () => {
    loadTeacherMemberships.mockResolvedValue([membership(ORG, "owner")]);
    await expect(renderPage("@/app/teacher/[organizationId]/audit/page", ORG)).resolves.toBeTruthy();
  });

  it("an admin reaches it", async () => {
    loadTeacherMemberships.mockResolvedValue([membership(ORG, "admin")]);
    await expect(renderPage("@/app/teacher/[organizationId]/audit/page", ORG)).resolves.toBeTruthy();
  });
});

describe("the pages a teacher legitimately reaches still render", () => {
  for (const page of PAGES.filter((p) => p.allowedFor.includes("teacher"))) {
    it(`${page.name} renders for a teacher of this organization`, async () => {
      loadTeacherMemberships.mockResolvedValue([membership(ORG, "teacher")]);
      await expect(renderPage(page.mod, ORG)).resolves.toBeTruthy();
      expect(notFound).not.toHaveBeenCalled();
    });
  }
});

describe("PLATFORM-MAIL-001 — the /invites gate, and what distinguishes it", () => {
  // /invites had no permission gate before D4. Adding one is only meaningful
  // if something can tell the difference, and the cross-tenant tests above
  // cannot: with the permission gate removed, the MEMBERSHIP check still
  // refuses a member of another organization, and with the membership check
  // removed, hasPermission still refuses them. That redundancy is correct
  // defence in depth — and it means a mutation of either survives a suite that
  // only tests the cross-tenant case.
  //
  // super_admin is what separates them. It is a real staff role: it passes
  // TeacherRequireRole and TeacherLayout, so it HAS a membership here — and it
  // is deliberately mapped to the empty permission set. Only the permission
  // gate can refuse it.
  it("a super_admin membership reaches the page's membership check and is refused by the PERMISSION", async () => {
    loadTeacherMemberships.mockResolvedValue([membership(ORG, "super_admin")]);
    await expect(renderPage("@/app/teacher/[organizationId]/invites/page", ORG)).rejects.toThrow("NOT_FOUND");
  });

  it("a student membership is refused too", async () => {
    loadTeacherMemberships.mockResolvedValue([membership(ORG, "student")]);
    await expect(renderPage("@/app/teacher/[organizationId]/invites/page", ORG)).rejects.toThrow("NOT_FOUND");
  });

  it("all three inviting roles reach it", async () => {
    for (const role of ["owner", "admin", "teacher"]) {
      notFound.mockClear();
      loadTeacherMemberships.mockResolvedValue([membership(ORG, role)]);
      await expect(renderPage("@/app/teacher/[organizationId]/invites/page", ORG)).resolves.toBeTruthy();
      expect(notFound).not.toHaveBeenCalled();
    }
  });

  it("the page carries BOTH gates in source — the membership one cannot be proven behaviourally", async () => {
    // A weaker kind of test, here for the specific reason stated above: the
    // two checks are mutually redundant against every input a real role can
    // produce, so removing one changes no observable behaviour. Pinning it in
    // source is what stops a refactor quietly dropping the outer gate.
    const fs = await import("node:fs");
    const src = fs.readFileSync(
      new URL("../../app/teacher/[organizationId]/invites/page.tsx", import.meta.url), "utf8");
    expect(src).toMatch(/memberships\.some\(\(m\) => m\.organizationId === organizationId\)\) notFound\(\)/);
    expect(src).toMatch(/hasPermission\(memberships, organizationId, PERMISSIONS\.MEMBERS_INVITE\)\) notFound\(\)/);
  });
});
