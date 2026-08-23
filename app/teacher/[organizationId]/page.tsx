import Link from "next/link";
import { loadOrganizationStudents, loadOrganizationAlerts } from "@/lib/server/teacher";

// B6 — Dashboard. Answers, in order of priority (the mandate's own
// sequence): attention, then activity/progress, in under two minutes of
// reading. No decorative charts — every number here is a real count from
// GET /students or GET /alerts, nothing computed client-side.
export default async function TeacherDashboard({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  const [roster, alerts] = await Promise.all([
    loadOrganizationStudents(organizationId, { limit: 1 }), // just need `.total`
    loadOrganizationAlerts(organizationId),
  ]);

  const total = roster?.total ?? 0;

  if (total === 0) {
    return (
      <>
        <h1 className="teacher-h1">Overview</h1>
        <div className="teacher-empty">
          No students yet. Once learners are added to this organization, their
          real activity and progress will appear here — nothing is shown
          until then.
        </div>
      </>
    );
  }

  const byStatus = { WATCH: 0, AT_RISK: 0, CRITICAL: 0 };
  for (const s of alerts?.students ?? []) {
    if (s.risk.status in byStatus) byStatus[s.risk.status as keyof typeof byStatus] += 1;
  }
  const healthy = total - (alerts?.students.length ?? 0);

  return (
    <>
      <h1 className="teacher-h1">Overview</h1>
      <p className="teacher-sub">{total} student{total === 1 ? "" : "s"} in this organization.</p>

      <div className="teacher-cards">
        <div className="teacher-card">
          <div className="value">{healthy}</div>
          <div className="label">Healthy</div>
        </div>
        <div className="teacher-card">
          <div className="value">{byStatus.WATCH}</div>
          <div className="label">Watch</div>
        </div>
        <div className="teacher-card">
          <div className="value">{byStatus.AT_RISK}</div>
          <div className="label">At risk</div>
        </div>
        <div className="teacher-card">
          <div className="value">{byStatus.CRITICAL}</div>
          <div className="label">Critical</div>
        </div>
      </div>

      <h2 style={{ fontSize: "var(--fs-section)", marginBottom: 12 }}>Needs attention</h2>
      {(alerts?.students.length ?? 0) === 0 ? (
        <div className="teacher-empty">No students currently need attention.</div>
      ) : (
        <table className="teacher-table">
          <thead>
            <tr><th>Student</th><th>Status</th><th>Last activity</th><th>Target</th></tr>
          </thead>
          <tbody>
            {alerts!.students
              .sort((a, b) => severityRank(b.risk.status) - severityRank(a.risk.status))
              .slice(0, 10)
              .map((s) => (
                <tr key={s.studentId}>
                  <td><Link href={`/teacher/${organizationId}/students/${s.studentId}`}>{s.studentId}</Link></td>
                  <td><span className={`risk-pill risk-${s.risk.status}`}>{s.risk.status.replace("_", " ")}</span></td>
                  <td>{s.lastActivityDate ?? "—"}</td>
                  <td>{s.targetLevel ?? "—"}</td>
                </tr>
              ))}
          </tbody>
        </table>
      )}
      <p style={{ marginTop: 8 }}>
        <Link href={`/teacher/${organizationId}/alerts`}>View all attention items →</Link>
      </p>
    </>
  );
}

function severityRank(status: string): number {
  return { CRITICAL: 3, AT_RISK: 2, WATCH: 1, HEALTHY: 0 }[status] ?? 0;
}
