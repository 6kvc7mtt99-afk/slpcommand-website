import { notFound } from "next/navigation";
import { loadTeacherMemberships } from "@/lib/server/teacher";
import { loadOrganizationMembers, loadOrganizationInvites } from "@/lib/server/platform";
import { hasPermission, PERMISSIONS } from "@/lib/platform/permissions";
import { readAuthCookies } from "@/lib/server/authCookies";
import { STAFF_ROLE_LABELS } from "@/lib/teacher/labels";
import { MemberTable } from "@/components/teacher/MemberTable";
import { InviteList } from "@/components/teacher/InviteList";

// FASE PLATFORM-ENTERPRISE-001 — People.
//
// The permission check here decides what to RENDER, not what is allowed: the
// backend re-decides on every request from the caller's real membership. A
// teacher who reached this URL by typing it sees the roster read-only, which
// is exactly what the backend would let them do anyway.

export const dynamic = "force-dynamic";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  const memberships = await loadTeacherMemberships();
  if (!memberships.some((m) => m.organizationId === organizationId)) notFound();

  const canRead = hasPermission(memberships, organizationId, PERMISSIONS.MEMBERS_READ);
  if (!canRead) notFound();

  const canManage = hasPermission(memberships, organizationId, PERMISSIONS.MEMBERS_MANAGE);
  const canInvite = hasPermission(memberships, organizationId, PERMISSIONS.MEMBERS_INVITE);

  const [members, invites, auth] = await Promise.all([
    loadOrganizationMembers(organizationId),
    canInvite ? loadOrganizationInvites(organizationId) : Promise.resolve(null),
    readAuthCookies(),
  ]);

  if (!members) {
    return <div className="teacher-empty">Could not load members right now.</div>;
  }

  const byRole = members.reduce<Record<string, number>>((acc, m) => {
    acc[m.role] = (acc[m.role] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <h1 className="teacher-h1">People</h1>
      <p className="teacher-sub">
        {Object.entries(byRole)
          .map(([role, count]) => `${count} ${STAFF_ROLE_LABELS[role as keyof typeof STAFF_ROLE_LABELS] ?? role}${count === 1 ? "" : "s"}`)
          .join(" · ") || "Nobody yet"}
      </p>

      <MemberTable
        organizationId={organizationId}
        members={members}
        canManage={canManage}
        currentUserId={auth.userId ?? null}
      />

      {canInvite && invites ? (
        <section className="teacher-section">
          <h2 className="teacher-h2">Invitations</h2>
          <InviteList organizationId={organizationId} invites={invites} />
        </section>
      ) : null}
    </>
  );
}
