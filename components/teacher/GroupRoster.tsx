import Link from "next/link";
import { AssignGroupControl } from "./AssignGroupControl";
import type { RosterStudent, TeacherGroup } from "@/lib/teacher/types";

// FASE PLATFORM-GROUPS-001 — the people in a cohort.
//
// A Server Component wrapping one client control, rather than a client
// component fetching its own data: the roster is already loaded by the page,
// and only the group selector needs to be interactive. Everything else here is
// static markup that never has to reach the browser as JavaScript.
//
// NAMES, NOT IDS. Until PLATFORM-GROUPS-001 the roster carried only a UUID and
// this is what the table rendered — thirty-six hex characters where a person's
// name belongs. `name` is nullable and stays nullable: a member with nothing
// recorded in Auth reads "No name recorded", which is true, rather than an id
// pretending to be a name.

export function GroupRoster({
  organizationId,
  students,
  groups,
  canWriteGroups,
  emptyLabel = "Nobody here yet.",
}: {
  organizationId: string;
  students: RosterStudent[];
  groups: TeacherGroup[];
  canWriteGroups: boolean;
  emptyLabel?: string;
}) {
  if (students.length === 0) {
    return <div className="teacher-empty">{emptyLabel}</div>;
  }

  return (
    <div className="teacher-table-scroll">
      <table className="teacher-table">
        <caption className="teacher-caption">
          Active students. Changing someone&apos;s group takes effect immediately.
        </caption>
        <thead>
          <tr>
            <th scope="col">Student</th>
            <th scope="col">Email</th>
            <th scope="col">Target</th>
            <th scope="col">Last activity</th>
            <th scope="col">Group</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.studentId}>
              <td>
                <Link href={`/teacher/${organizationId}/students/${s.studentId}`}>
                  {s.name ?? <span className="teacher-muted">No name recorded</span>}
                </Link>
              </td>
              <td className="teacher-cell-email">{s.email ?? <span className="teacher-muted">—</span>}</td>
              <td>{s.targetLevel ?? <span className="teacher-muted">—</span>}</td>
              <td>{s.lastActivityDate ?? <span className="teacher-muted">No activity recorded</span>}</td>
              <td>
                {canWriteGroups && groups.length > 0 ? (
                  <AssignGroupControl
                    organizationId={organizationId}
                    userId={s.studentId}
                    // This roster is students only (listOrganizationStudents
                    // filters role='student'), so the row being updated is the
                    // student membership. Stated rather than defaulted, because
                    // the endpoint's own default is the thing that would hide a
                    // mistake if this list ever widened.
                    role="student"
                    currentGroupId={s.groupId}
                    groups={groups}
                    label={s.name ?? s.email ?? "this student"}
                  />
                ) : (
                  s.groupName ?? <span className="teacher-muted">Unassigned</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
