// FASE PLATFORM-RBAC-001 — the Web permission mirror, and the drift that
// would make it useless.
//
// lib/platform/permissions.ts is NOT a security boundary — the backend
// re-decides every request from a membership it resolved out of a verified
// JWT. It exists so a teacher is not shown a "Branding" tab whose every button
// answers 403.
//
// Which means the failure to protect against is not "someone edits this file
// and gains access" (they cannot), but DRIFT: this table saying yes where the
// backend says no, producing a nav link into a dead end — or saying no where
// the backend says yes, hiding a feature a customer is paying for. So the
// central test here READS THE BACKEND FILE and compares the two tables entry
// by entry. A mirror nobody checks is just a second opinion.

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  PERMISSIONS, permissionsForRole, roleHasPermission, hasPermission,
  type Permission,
} from "@/lib/platform/permissions";
import type { TeacherRole } from "@/lib/teacher/types";

const ORG_A = "org-a";
const ORG_B = "org-b";

// The backend repo sits beside this one in the workspace. Resolved relative to
// this file so it works from any cwd.
const BACKEND_PERMISSIONS = path.resolve(
  process.cwd(),
  "../../BACKEND/english-learning-backend/lib/platform/permissions.js",
);

describe("the mirror matches the backend", () => {
  const backendExists = fs.existsSync(BACKEND_PERMISSIONS);
  const source = backendExists ? fs.readFileSync(BACKEND_PERMISSIONS, "utf8") : "";

  it("can see the backend permission table", () => {
    // If this fails the workspace layout changed. Better to fail loudly here
    // than to silently skip the only test that catches drift.
    expect(backendExists, `expected the backend table at ${BACKEND_PERMISSIONS}`).toBe(true);
  });

  it("declares exactly the same permission strings", () => {
    // The trailing `,` may be followed by a line comment — MEMBERS_MANAGE has
    // one — so the pattern must not anchor to end-of-line straight after it.
    const backendValues = [...source.matchAll(/^\s+[A-Z_]+:\s*"([a-z_.]+)",/gm)].map((m) => m[1]);
    expect(backendValues.length).toBeGreaterThan(0);
    expect([...new Set(backendValues)].sort()).toEqual(Object.values(PERMISSIONS).sort());
  });

  it("gives owner and admin every permission, exactly as the backend does", () => {
    // Backend: [TEACHER_ROLES.OWNER]: [...ALL_PERMISSIONS] — same for ADMIN.
    expect(source).toMatch(/\[TEACHER_ROLES\.OWNER\]:\s*Object\.freeze\(\[\.\.\.ALL_PERMISSIONS\]\)/);
    expect(source).toMatch(/\[TEACHER_ROLES\.ADMIN\]:\s*Object\.freeze\(\[\.\.\.ALL_PERMISSIONS\]\)/);
    expect([...permissionsForRole("owner")].sort()).toEqual(Object.values(PERMISSIONS).sort());
    expect([...permissionsForRole("admin")].sort()).toEqual(Object.values(PERMISSIONS).sort());
  });

  it("gives teacher exactly the permissions the backend lists", () => {
    const block = source.slice(
      source.indexOf("[TEACHER_ROLES.TEACHER]"),
      source.indexOf("[TEACHER_ROLES.STUDENT]"),
    );
    const backendTeacher = [...block.matchAll(/PERMISSIONS\.([A-Z_]+)/g)]
      .map((m) => PERMISSIONS[m[1] as keyof typeof PERMISSIONS])
      .filter(Boolean)
      .sort();
    expect(backendTeacher.length).toBeGreaterThan(0);
    expect([...permissionsForRole("teacher")].sort()).toEqual(backendTeacher);
  });

  it("gives student and super_admin nothing, on both sides", () => {
    expect(source).toMatch(/\[TEACHER_ROLES\.STUDENT\]:\s*Object\.freeze\(\[\]\)/);
    expect(source).toMatch(/\[TEACHER_ROLES\.SUPER_ADMIN\]:\s*Object\.freeze\(\[\]\)/);
    expect(permissionsForRole("student")).toEqual([]);
    expect(permissionsForRole("super_admin")).toEqual([]);
  });
});

describe("what each role may actually do", () => {
  it("a teacher reads students but cannot administer the organization", () => {
    expect(roleHasPermission("teacher", PERMISSIONS.STUDENTS_READ)).toBe(true);
    expect(roleHasPermission("teacher", PERMISSIONS.GROUPS_WRITE)).toBe(true);
    expect(roleHasPermission("teacher", PERMISSIONS.MEMBERS_INVITE)).toBe(true);

    expect(roleHasPermission("teacher", PERMISSIONS.MEMBERS_MANAGE)).toBe(false);
    expect(roleHasPermission("teacher", PERMISSIONS.BRANDING_WRITE)).toBe(false);
    expect(roleHasPermission("teacher", PERMISSIONS.ORGANIZATION_WRITE)).toBe(false);
    expect(roleHasPermission("teacher", PERMISSIONS.AUDIT_READ)).toBe(false);
  });

  it("a student may do nothing at all", () => {
    for (const permission of Object.values(PERMISSIONS)) {
      expect(roleHasPermission("student", permission)).toBe(false);
    }
  });

  it("an unknown role gets nothing, never everything", () => {
    // The direction a lookup miss must fail in. `as TeacherRole` deliberately
    // forces a value the type would otherwise forbid, because a stale role
    // string from the database is exactly how this would happen in reality.
    expect(permissionsForRole("nonsense" as TeacherRole)).toEqual([]);
    expect(roleHasPermission("nonsense" as TeacherRole, PERMISSIONS.STUDENTS_READ)).toBe(false);
  });
});

describe("hasPermission is scoped per organization", () => {
  const owner = [{ organizationId: ORG_A, role: "owner" as TeacherRole }];

  it("an owner of A holds nothing in B", () => {
    expect(hasPermission(owner, ORG_A, PERMISSIONS.BRANDING_WRITE)).toBe(true);
    expect(hasPermission(owner, ORG_B, PERMISSIONS.BRANDING_WRITE)).toBe(false);
    expect(hasPermission(owner, ORG_B, PERMISSIONS.STUDENTS_READ)).toBe(false);
  });

  it("no memberships means no permissions", () => {
    expect(hasPermission([], ORG_A, PERMISSIONS.STUDENTS_READ)).toBe(false);
  });

  it("two roles in the same organization grant the union", () => {
    // The schema permits it (UNIQUE is on user+org+role), and taking the union
    // is the only reading that does not punish someone for holding an extra
    // legitimate role. The backend does the same.
    const both = [
      { organizationId: ORG_A, role: "teacher" as TeacherRole },
      { organizationId: ORG_A, role: "owner" as TeacherRole },
    ];
    expect(hasPermission(both, ORG_A, PERMISSIONS.BRANDING_WRITE)).toBe(true);
    expect(hasPermission(both, ORG_A, PERMISSIONS.STUDENTS_READ)).toBe(true);
  });

  it("roles do not leak between two organizations the same user belongs to", () => {
    const mixed = [
      { organizationId: ORG_A, role: "owner" as TeacherRole },
      { organizationId: ORG_B, role: "teacher" as TeacherRole },
    ];
    expect(hasPermission(mixed, ORG_A, PERMISSIONS.AUDIT_READ)).toBe(true);
    expect(hasPermission(mixed, ORG_B, PERMISSIONS.AUDIT_READ)).toBe(false);
    expect(hasPermission(mixed, ORG_B, PERMISSIONS.STUDENTS_READ)).toBe(true);
  });
});

describe("the navigation cannot offer what the backend would refuse", () => {
  // The nav table lives in the shell; this asserts the pairing it depends on,
  // so a future edit that adds an admin link without a permission is caught.
  const ADMIN_SECTIONS: { label: string; permission: Permission }[] = [
    { label: "People", permission: PERMISSIONS.MEMBERS_READ },
    { label: "Invite", permission: PERMISSIONS.MEMBERS_INVITE },
    { label: "Organization", permission: PERMISSIONS.ORGANIZATION_READ },
    { label: "Security", permission: PERMISSIONS.AUDIT_READ },
    { label: "Reports", permission: PERMISSIONS.REPORTING_READ },
  ];

  it("a teacher sees only the administration sections they can use", () => {
    const visible = ADMIN_SECTIONS.filter((s) => roleHasPermission("teacher", s.permission)).map((s) => s.label);
    expect(visible.sort()).toEqual(["Invite", "Organization", "People", "Reports"]);
    expect(visible).not.toContain("Security");
  });

  it("an owner sees all of them", () => {
    const visible = ADMIN_SECTIONS.filter((s) => roleHasPermission("owner", s.permission));
    expect(visible).toHaveLength(ADMIN_SECTIONS.length);
  });

  it("a student sees none of them", () => {
    const visible = ADMIN_SECTIONS.filter((s) => roleHasPermission("student", s.permission));
    expect(visible).toHaveLength(0);
  });
});
