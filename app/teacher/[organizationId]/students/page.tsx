import Link from "next/link";
import { loadTeacherMemberships, loadOrganizationStudents, loadOrganizationGroups } from "@/lib/server/teacher";
import { hasPermission, PERMISSIONS } from "@/lib/platform/permissions";
import { GroupRoster } from "@/components/teacher/GroupRoster";

// B7 — Student Roster. Server-side pagination via ?page=.
//
// FASE TEACHER-GROUPS-001 — the roster's own comment used to say filters
// were "deliberately absent" because there was nothing real to filter by.
// Groups now exist as a real, backend-verified concept (a student's actual
// group_id), so ?groupId= filters server-side (see loadOrganizationStudents
// / listOrganizationStudents) rather than being a client-side illusion over
// one already-fetched page.
const PAGE_SIZE = 50;

export default async function StudentRoster({
  params,
  searchParams,
}: {
  params: Promise<{ organizationId: string }>;
  searchParams: Promise<{ page?: string; groupId?: string }>;
}) {
  const { organizationId } = await params;
  const { page: pageParam, groupId } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const [roster, groupsResult, memberships] = await Promise.all([
    loadOrganizationStudents(organizationId, { limit: PAGE_SIZE, offset, groupId }),
    loadOrganizationGroups(organizationId),
    loadTeacherMemberships(),
  ]);
  // PLATFORM-GROUPS-001 — whether to render the group selector or plain text.
  // The backend re-decides on every PATCH from the caller's real membership;
  // this only chooses what to draw.
  const canWriteGroups = hasPermission(memberships, organizationId, PERMISSIONS.GROUPS_WRITE);

  if (!roster) {
    return <div className="teacher-empty">Could not load the roster right now.</div>;
  }

  const hasAnyGroups = (groupsResult?.groups.length ?? 0) > 0 || (groupsResult?.unassignedCount ?? 0) > 0;

  if (roster.total === 0 && !groupId) {
    return (
      <>
        <h1 className="teacher-h1">Students</h1>
        <div className="teacher-empty">No students in this organization yet.</div>
      </>
    );
  }

  const lastPage = Math.ceil(roster.total / PAGE_SIZE);
  const base = `/teacher/${organizationId}/students`;

  return (
    <>
      <h1 className="teacher-h1">Students</h1>
      <p className="teacher-sub">{roster.total} {groupId ? "in this filter" : "total"}.</p>

      {hasAnyGroups ? (
        <div className="teacher-filter-bar">
          <Link href={base} data-active={!groupId}>All students</Link>
          {(groupsResult?.groups ?? []).map((g) => (
            <Link key={g.id} href={`${base}?groupId=${encodeURIComponent(g.id)}`} data-active={groupId === g.id}>
              {g.name}
            </Link>
          ))}
          {groupsResult && groupsResult.unassignedCount > 0 ? (
            <Link href={`${base}?groupId=unassigned`} data-active={groupId === "unassigned"}>
              Unassigned
            </Link>
          ) : null}
        </div>
      ) : null}

      {/* PLATFORM-GROUPS-001 — the same table the group detail page renders.
          It used to print s.studentId in the Student column, so a teacher saw
          a UUID per row; the roster carries real identity now. Sharing one
          component is what keeps the two views from drifting apart. */}
      <GroupRoster
        organizationId={organizationId}
        students={roster.students}
        groups={groupsResult?.groups ?? []}
        canWriteGroups={canWriteGroups}
        emptyLabel="No students match this filter."
      />
      {lastPage > 1 && (
        <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
          {page > 1 && <Link href={`?page=${page - 1}${groupId ? `&groupId=${groupId}` : ""}`}>← Previous</Link>}
          <span className="teacher-sub" style={{ margin: 0 }}>Page {page} of {lastPage}</span>
          {page < lastPage && <Link href={`?page=${page + 1}${groupId ? `&groupId=${groupId}` : ""}`}>Next →</Link>}
        </div>
      )}
    </>
  );
}
