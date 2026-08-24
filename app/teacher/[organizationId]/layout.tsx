import { notFound } from "next/navigation";
import { loadTeacherMemberships } from "@/lib/server/teacher";
import { STAFF_ROLE_LABELS } from "@/lib/teacher/labels";
import { TeacherShell } from "@/components/teacher/TeacherShell";
import { permissionsForRole, type Permission } from "@/lib/platform/permissions";

// The UX-level twin of the backend's requireOrgMembership: the URL segment
// is checked against the caller's OWN real memberships, never trusted.
// notFound() (a real 404 page), not a redirect — this is UX polish on top of
// a boundary the backend enforces independently on every single data fetch
// below; even a client that skipped this layout entirely gets nothing back.
export default async function OrganizationLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  const memberships = await loadTeacherMemberships();
  const mine = memberships.filter((m) => m.organizationId === organizationId);
  if (mine.length === 0) notFound();

  // The union across every role held in THIS organization — the same rule the
  // backend's hasPermission uses, so the navigation cannot offer a link the
  // backend would refuse, or hide one it would allow. A user holding two roles
  // here (owner AND teacher, which the schema permits) is not punished for the
  // extra one.
  const permissions = [...new Set(mine.flatMap((m) => permissionsForRole(m.role)))] as Permission[];

  // The highest-ranked role is what the header shows: "Owner" is the honest
  // answer for someone who is both an owner and a teacher.
  const ORDER = ["owner", "admin", "teacher", "student", "super_admin"] as const;
  const primary = mine.slice().sort(
    (a, b) => ORDER.indexOf(a.role as typeof ORDER[number]) - ORDER.indexOf(b.role as typeof ORDER[number]),
  )[0];

  return (
    <TeacherShell
      organizationId={organizationId}
      organizationName={primary.organizationName}
      roleLabel={STAFF_ROLE_LABELS[primary.role] ?? primary.role}
      permissions={permissions}
    >
      <main className="teacher-main">{children}</main>
    </TeacherShell>
  );
}
