import Link from "next/link";
import { loadOrganizationGroups } from "@/lib/server/teacher";
import { CreateGroupForm } from "@/components/teacher/CreateGroupForm";

// FASE TEACHER-GROUPS-001 — group overview. Every count here is a live
// active-student count from lib/teacher/groups.js (listOrganizationGroups),
// not a cached or estimated figure. Clicking a group filters the roster
// (see app/teacher/[organizationId]/students/page.tsx?groupId=).
export default async function GroupsPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  const result = await loadOrganizationGroups(organizationId);

  if (!result) {
    return <div className="teacher-empty">Could not load groups right now.</div>;
  }

  return (
    <>
      <h1 className="teacher-h1">Groups</h1>
      <p className="teacher-sub">
        Organize students into cohorts. Groups affect only how the roster is filtered — every
        student&apos;s real progress is unaffected by group placement.
      </p>

      <CreateGroupForm organizationId={organizationId} />

      {result.groups.length === 0 && result.unassignedCount === 0 ? (
        <div className="teacher-empty">No groups yet. Create one above to get started.</div>
      ) : (
        <div className="teacher-group-list">
          {result.groups.map((g) => (
            <Link
              key={g.id}
              href={`/teacher/${organizationId}/students?groupId=${encodeURIComponent(g.id)}`}
              className="teacher-group-card"
            >
              <div className="name">{g.name}</div>
              <div className="count">{g.studentCount} student{g.studentCount === 1 ? "" : "s"}</div>
            </Link>
          ))}
          {result.unassignedCount > 0 ? (
            <Link
              href={`/teacher/${organizationId}/students?groupId=unassigned`}
              className="teacher-group-card"
            >
              <div className="name">Unassigned</div>
              <div className="count">{result.unassignedCount} student{result.unassignedCount === 1 ? "" : "s"}</div>
            </Link>
          ) : null}
        </div>
      )}
    </>
  );
}
