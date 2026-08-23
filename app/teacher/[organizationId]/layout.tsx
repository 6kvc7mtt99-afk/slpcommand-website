import { notFound } from "next/navigation";
import { loadTeacherMemberships } from "@/lib/server/teacher";
import { STAFF_ROLE_LABELS } from "@/lib/teacher/labels";
import { TeacherShell } from "@/components/teacher/TeacherShell";

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
  const membership = memberships.find((m) => m.organizationId === organizationId);
  if (!membership) notFound();

  return (
    <TeacherShell
      organizationId={organizationId}
      organizationName={membership.organizationName}
      roleLabel={STAFF_ROLE_LABELS[membership.role] ?? membership.role}
    >
      <main className="teacher-main">{children}</main>
    </TeacherShell>
  );
}
