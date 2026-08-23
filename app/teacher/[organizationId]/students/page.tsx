import Link from "next/link";
import { loadOrganizationStudents } from "@/lib/server/teacher";

// B7 — Student Roster. Server-side pagination via ?page= (no client-side
// "load everyone"); filters are deliberately absent — the mandate is explicit
// that a filter with nothing real to drive it must not be built to look busy.
const PAGE_SIZE = 50;

export default async function StudentRoster({
  params,
  searchParams,
}: {
  params: Promise<{ organizationId: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { organizationId } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const roster = await loadOrganizationStudents(organizationId, { limit: PAGE_SIZE, offset });

  if (!roster) {
    return <div className="teacher-empty">Could not load the roster right now.</div>;
  }
  if (roster.total === 0) {
    return (
      <>
        <h1 className="teacher-h1">Students</h1>
        <div className="teacher-empty">No students in this organization yet.</div>
      </>
    );
  }

  const lastPage = Math.ceil(roster.total / PAGE_SIZE);

  return (
    <>
      <h1 className="teacher-h1">Students</h1>
      <p className="teacher-sub">{roster.total} total.</p>
      <table className="teacher-table">
        <thead>
          <tr><th>Student</th><th>Target</th><th>Last activity</th><th>Member since</th></tr>
        </thead>
        <tbody>
          {roster.students.map((s) => (
            <tr key={s.studentId}>
              <td><Link href={`/teacher/${organizationId}/students/${s.studentId}`}>{s.studentId}</Link></td>
              <td>{s.targetLevel ?? "—"}</td>
              <td>{s.lastActivityDate ?? "No activity recorded"}</td>
              <td>{new Date(s.memberSince).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {lastPage > 1 && (
        <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
          {page > 1 && <Link href={`?page=${page - 1}`}>← Previous</Link>}
          <span className="teacher-sub" style={{ margin: 0 }}>Page {page} of {lastPage}</span>
          {page < lastPage && <Link href={`?page=${page + 1}`}>Next →</Link>}
        </div>
      )}
    </>
  );
}
