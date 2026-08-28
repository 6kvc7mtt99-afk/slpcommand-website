import { notFound } from "next/navigation";
import { loadTeacherMemberships, loadOrganizationGroups } from "@/lib/server/teacher";
import { loadOrganizationInvites } from "@/lib/server/platform";
import { hasPermission, PERMISSIONS } from "@/lib/platform/permissions";
import { CreateInviteForm } from "@/components/teacher/CreateInviteForm";
import { InviteList } from "@/components/teacher/InviteList";

// FASE TEACHER-GROUPS-001 / TEACHER — INVITATIONS — the secure onboarding
// mechanism the B2B mandate requires: a student can never join simply by
// knowing an organization_id. Only a real, single-use, expiring, hashed
// token — created here and redeemed at /invite/accept — creates a
// membership (see lib/teacher/invites.js on the backend).
//
// FASE PLATFORM-MAIL-001 — two changes.
//
// First, the permission gate. This page had none: the navigation hid it from
// anyone without members.invite, but typing the URL rendered the form anyway.
// The backend refused every request it made, so nothing was ever exposed —
// but a page whose every control answers 403 is a worse experience than a
// 404, and every other administration page in this product already gates.
//
// Second, the invitation list moved here, beside the form that creates them.
// Creating an invitation and checking whether it arrived are the same task.

export const dynamic = "force-dynamic";

export default async function InvitesPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;

  const memberships = await loadTeacherMemberships();
  if (!memberships.some((m) => m.organizationId === organizationId)) notFound();
  if (!hasPermission(memberships, organizationId, PERMISSIONS.MEMBERS_INVITE)) notFound();

  const [groupsResult, invites] = await Promise.all([
    loadOrganizationGroups(organizationId),
    loadOrganizationInvites(organizationId),
  ]);

  return (
    <>
      <h1 className="teacher-h1">Invite</h1>
      <p className="teacher-sub">
        Send a branded invitation by email, or create a link you send yourself. Nobody can join this
        organization without one.
      </p>

      <CreateInviteForm organizationId={organizationId} groups={groupsResult?.groups ?? []} />

      <section className="teacher-section">
        <h2 className="teacher-h2">Invitations</h2>
        {invites === null ? (
          <div className="teacher-empty">Could not load invitations right now.</div>
        ) : (
          <InviteList organizationId={organizationId} invites={invites} canInvite />
        )}
      </section>
    </>
  );
}
