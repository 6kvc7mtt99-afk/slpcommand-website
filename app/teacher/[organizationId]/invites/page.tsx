import { loadOrganizationGroups } from "@/lib/server/teacher";
import { CreateInviteForm } from "@/components/teacher/CreateInviteForm";

// FASE TEACHER-GROUPS-001 / TEACHER — INVITATIONS — the secure onboarding
// mechanism the B2B mandate requires: a student can never join simply by
// knowing an organization_id. Only a real, single-use, expiring, hashed
// token — created here and redeemed at /invite/accept — creates a
// membership (see lib/teacher/invites.js on the backend).
export default async function InvitesPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  const groupsResult = await loadOrganizationGroups(organizationId);

  return (
    <>
      <h1 className="teacher-h1">Invite</h1>
      <p className="teacher-sub">
        Generate a secure, single-use invitation link for a new student or staff member. Nobody can
        join this organization without one.
      </p>
      <CreateInviteForm organizationId={organizationId} groups={groupsResult?.groups ?? []} />
    </>
  );
}
