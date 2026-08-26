import Link from "next/link";
import { notFound } from "next/navigation";
import { loadTeacherMemberships, loadOrganizationGroups, loadOrganizationStudents } from "@/lib/server/teacher";
import { hasPermission, PERMISSIONS } from "@/lib/platform/permissions";
import { GroupNameForm } from "@/components/teacher/GroupNameForm";
import { GroupRoster } from "@/components/teacher/GroupRoster";

// FASE PLATFORM-GROUPS-001 — one cohort, and who is in it.
//
// NO NEW ENDPOINT. The group's name comes from the existing GET …/groups
// (which returns every group of this organization — a list that is small by
// construction) and the roster from the existing GET …/students?groupId=.
// Adding GET …/groups/:groupId would have meant a new route, a new proxy rule
// and a new thing to authorize, to save a filter over an array already in
// memory.
//
// A group id belonging to another organization simply is not in that list, so
// it 404s here — and would 404 at the backend too, which is the boundary that
// actually matters. This page only decides what to render.

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function GroupDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ organizationId: string; groupId: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { organizationId, groupId } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const memberships = await loadTeacherMemberships();
  if (!memberships.some((m) => m.organizationId === organizationId)) notFound();
  if (!hasPermission(memberships, organizationId, PERMISSIONS.GROUPS_READ)) notFound();

  const canWriteGroups = hasPermission(memberships, organizationId, PERMISSIONS.GROUPS_WRITE);

  const [groupsResult, roster] = await Promise.all([
    loadOrganizationGroups(organizationId),
    loadOrganizationStudents(organizationId, { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE, groupId }),
  ]);

  if (!groupsResult) {
    return <div className="teacher-empty">Could not load this group right now.</div>;
  }

  // Not in this organization's list of groups → not this organization's group.
  const group = groupsResult.groups.find((g) => g.id === groupId);
  if (!group) notFound();

  const lastPage = roster ? Math.max(1, Math.ceil(roster.total / PAGE_SIZE)) : 1;

  return (
    <>
      <p className="teacher-breadcrumb">
        <Link href={`/teacher/${organizationId}/groups`}>← All groups</Link>
      </p>

      <h1 className="teacher-h1">{group.name}</h1>
      <p className="teacher-sub">
        {group.studentCount} student{group.studentCount === 1 ? "" : "s"} in this group.
      </p>

      {!roster ? (
        <div className="teacher-empty">Could not load this group&apos;s roster right now.</div>
      ) : roster.total === 0 ? (
        <div className="teacher-empty">
          Nobody is in this group yet. Assign students from{" "}
          <Link href={`/teacher/${organizationId}/members`}>People</Link>, or from the{" "}
          <Link href={`/teacher/${organizationId}/students?groupId=unassigned`}>unassigned list</Link>.
        </div>
      ) : (
        <GroupRoster
          organizationId={organizationId}
          students={roster.students}
          groups={groupsResult.groups}
          canWriteGroups={canWriteGroups}
        />
      )}

      {roster && lastPage > 1 && (
        <div className="teacher-pager">
          {page > 1 && <Link href={`?page=${page - 1}`}>← Previous</Link>}
          <span className="teacher-sub">Page {page} of {lastPage}</span>
          {page < lastPage && <Link href={`?page=${page + 1}`}>Next →</Link>}
        </div>
      )}

      {canWriteGroups ? (
        <section className="teacher-section">
          <h2 className="teacher-h2">Rename</h2>
          <GroupNameForm organizationId={organizationId} groupId={group.id} name={group.name} />
        </section>
      ) : null}
    </>
  );
}
