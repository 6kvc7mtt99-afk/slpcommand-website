// FASE PLATFORM-RBAC-001 — the permission table, mirrored for the UI.
//
// READ THIS BEFORE USING IT. This is NOT the security boundary. The backend's
// lib/platform/permissions.js decides, on every request, from a membership it
// resolved server-side out of a verified JWT. This copy exists for exactly one
// purpose: not showing a teacher a "Branding" tab whose every button would
// answer 403.
//
// So the failure mode to design against is not "someone edits this and gains
// access" — they cannot. It is DRIFT: this table saying yes where the backend
// says no, which produces a nav link into a dead end. The mirror is kept
// deliberately small and literal for that reason, and
// tests/platform/permissions.test.ts asserts it matches the backend table
// entry for entry by reading the backend file itself.

import type { TeacherRole } from "@/lib/teacher/types";

export const PERMISSIONS = {
  STUDENTS_READ: "students.read",
  GROUPS_READ: "groups.read",
  GROUPS_WRITE: "groups.write",
  MEMBERS_READ: "members.read",
  MEMBERS_INVITE: "members.invite",
  MEMBERS_MANAGE: "members.manage",
  ORGANIZATION_READ: "organization.read",
  ORGANIZATION_WRITE: "organization.write",
  BRANDING_WRITE: "branding.write",
  REPORTING_READ: "reporting.read",
  AUDIT_READ: "audit.read",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const ALL: Permission[] = Object.values(PERMISSIONS);

const ROLE_PERMISSIONS: Record<TeacherRole, readonly Permission[]> = {
  owner: ALL,
  admin: ALL,
  teacher: [
    PERMISSIONS.STUDENTS_READ,
    PERMISSIONS.GROUPS_READ,
    PERMISSIONS.GROUPS_WRITE,
    PERMISSIONS.MEMBERS_READ,
    PERMISSIONS.MEMBERS_INVITE,
    PERMISSIONS.ORGANIZATION_READ,
    PERMISSIONS.REPORTING_READ,
  ],
  student: [],
  // Present in the schema, unused by the product: the platform administrator
  // is user_profiles.is_admin, not a membership role. Empty is the safe
  // reading, and it matches the backend exactly.
  super_admin: [],
};

export function permissionsForRole(role: TeacherRole): readonly Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function roleHasPermission(role: TeacherRole, permission: Permission): boolean {
  return permissionsForRole(role).includes(permission);
}

/**
 * Does any of the caller's memberships in THIS organization hold this
 * permission? A user holding two roles in one organization gets the union,
 * matching the backend — the only reading that does not punish someone for
 * holding an extra role.
 */
export function hasPermission(
  memberships: readonly { organizationId: string; role: TeacherRole }[],
  organizationId: string,
  permission: Permission,
): boolean {
  return memberships.some((m) => m.organizationId === organizationId && roleHasPermission(m.role, permission));
}
