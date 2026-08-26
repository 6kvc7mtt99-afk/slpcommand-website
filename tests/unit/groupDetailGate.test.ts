// FASE PLATFORM-GROUPS-001 — who may open a group's detail page, and what a
// group id from another organization does.
//
// Same discipline as platformPageGates.test.ts: the backend re-decides on
// every fetch from the caller's real membership, so this is UX routing rather
// than the boundary. What it proves is that a page which renders a cohort's
// roster does not render one for somebody who should not see it, and does not
// render another tenant's group because its id was typed into the URL.

import { describe, expect, it, vi, beforeEach } from "vitest";

const { notFound, loadTeacherMemberships, loadOrganizationGroups, loadOrganizationStudents } = vi.hoisted(() => ({
  notFound: vi.fn(() => { throw new Error("NOT_FOUND"); }),
  loadTeacherMemberships: vi.fn(),
  loadOrganizationGroups: vi.fn(),
  loadOrganizationStudents: vi.fn(),
}));

vi.mock("next/navigation", () => ({ notFound, redirect: vi.fn() }));
vi.mock("@/lib/server/teacher", () => ({
  loadTeacherMemberships: () => loadTeacherMemberships(),
  loadOrganizationGroups: (...a: unknown[]) => loadOrganizationGroups(...a),
  loadOrganizationStudents: (...a: unknown[]) => loadOrganizationStudents(...a),
}));

import GroupDetailPage from "../../app/teacher/[organizationId]/groups/[groupId]/page";

const ORG = "org-a";
const OTHER_ORG = "org-b";
const GROUP = "group-a1";
const OTHER_GROUP = "group-b1";

const membership = (organizationId: string, role: string) => ({
  organizationId, role, organizationName: "Academy",
});

const render = (organizationId = ORG, groupId = GROUP) =>
  GroupDetailPage({
    params: Promise.resolve({ organizationId, groupId }),
    searchParams: Promise.resolve({}),
  });

/** The visible text of a rendered element tree. */
function textOf(node: unknown): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  const el = node as { type?: unknown; props?: { children?: unknown } };
  const name = typeof el.type === "function" ? `<${(el.type as { name?: string }).name ?? "anon"}>` : "";
  return name + textOf(el.props?.children);
}

beforeEach(() => {
  notFound.mockClear();
  loadTeacherMemberships.mockReset().mockResolvedValue([membership(ORG, "owner")]);
  loadOrganizationGroups.mockReset().mockResolvedValue({
    ok: true,
    groups: [{ id: GROUP, name: "Morning", created_at: "2026-01-01", studentCount: 1 }],
    unassignedCount: 0,
  });
  loadOrganizationStudents.mockReset().mockResolvedValue({
    ok: true,
    total: 1,
    students: [{
      studentId: "u1", name: "Ana Alpha", email: "ana@example.com",
      memberSince: "2026-01-01", groupId: GROUP, groupName: "Morning",
      targetLevel: "3", lastActivityAt: null, lastActivityDate: "2026-08-01",
    }],
  });
});

describe("the gate on a group's detail page", () => {
  it("renders for an owner of this organization", async () => {
    const tree = textOf(await render());
    expect(tree).toContain("Morning");
    expect(notFound).not.toHaveBeenCalled();
  });

  it("renders for a TEACHER — organising a class is not an admin act", async () => {
    loadTeacherMemberships.mockResolvedValue([membership(ORG, "teacher")]);
    await expect(render()).resolves.toBeTruthy();
    expect(notFound).not.toHaveBeenCalled();
  });

  it("404s for a member of ANOTHER organization", async () => {
    loadTeacherMemberships.mockResolvedValue([membership(OTHER_ORG, "owner")]);
    await expect(render()).rejects.toThrow("NOT_FOUND");
  });

  it("404s for someone with no memberships at all", async () => {
    loadTeacherMemberships.mockResolvedValue([]);
    await expect(render()).rejects.toThrow("NOT_FOUND");
  });

  it("404s for a role holding no groups.read — a student membership", async () => {
    loadTeacherMemberships.mockResolvedValue([membership(ORG, "student")]);
    await expect(render()).rejects.toThrow("NOT_FOUND");
  });

  it("404s for super_admin, which is mapped to no permissions", async () => {
    loadTeacherMemberships.mockResolvedValue([membership(ORG, "super_admin")]);
    await expect(render()).rejects.toThrow("NOT_FOUND");
  });

  it("404s for a group id that is not in THIS organization's list", async () => {
    // The cross-tenant case, at the page layer. The group list comes back
    // scoped to this organization, so another tenant's id is simply absent —
    // and the backend would refuse it independently.
    await expect(render(ORG, OTHER_GROUP)).rejects.toThrow("NOT_FOUND");
  });

  it("404s for a group id that does not exist anywhere", async () => {
    await expect(render(ORG, "not-a-real-group")).rejects.toThrow("NOT_FOUND");
  });
});

describe("what the detail page shows", () => {
  it("renders the roster with real names, not ids", async () => {
    const tree = textOf(await render());
    expect(tree).toContain("<GroupRoster>");
    expect(tree).not.toContain("u1");
  });

  it("offers rename to someone with groups.write", async () => {
    expect(textOf(await render())).toContain("<GroupNameForm>");
  });

  it("offers rename to a teacher too — groups.write is not an admin permission", async () => {
    // Named for what it actually checks. There is no role today holding
    // groups.read WITHOUT groups.write, so "hides rename from a read-only
    // role" cannot be exercised through a real role, and a test asserting it
    // would have to fake a permission set that does not exist. The gate is
    // covered where it is real instead: platformPermissions.test.ts pins the
    // role→permission table, and the backend refuses independently.
    loadTeacherMemberships.mockResolvedValue([membership(ORG, "teacher")]);
    expect(textOf(await render())).toContain("<GroupNameForm>");
  });

  it("says the group is empty rather than rendering an empty table", async () => {
    loadOrganizationStudents.mockResolvedValue({ ok: true, total: 0, students: [] });
    const tree = textOf(await render());
    expect(tree).toMatch(/Nobody is in this group yet/i);
    expect(tree).not.toContain("<GroupRoster>");
  });

  it("says so plainly when the groups list cannot be loaded", async () => {
    loadOrganizationGroups.mockResolvedValue(null);
    const tree = textOf(await render());
    expect(tree).toMatch(/could not load this group/i);
  });

  it("still renders the group when only the ROSTER fails to load", async () => {
    // A failed roster is not a failed group: the name and the rename control
    // are still useful, and claiming the whole group is unavailable would be
    // a worse answer than the true one.
    loadOrganizationStudents.mockResolvedValue(null);
    const tree = textOf(await render());
    expect(tree).toContain("Morning");
    expect(tree).toMatch(/could not load this group's roster/i);
  });

  it("asks the backend for THIS group's students only", async () => {
    await render();
    expect(loadOrganizationStudents).toHaveBeenCalledWith(ORG, expect.objectContaining({ groupId: GROUP }));
  });

  it("uses the singular for one student and the plural for more", async () => {
    expect(textOf(await render())).toMatch(/1 student in this group/);
    loadOrganizationGroups.mockResolvedValue({
      ok: true,
      groups: [{ id: GROUP, name: "Morning", created_at: "2026-01-01", studentCount: 4 }],
      unassignedCount: 0,
    });
    expect(textOf(await render())).toMatch(/4 students in this group/);
  });
});
