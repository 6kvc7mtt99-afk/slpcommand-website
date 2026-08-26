import Link from "next/link";
import { loadOrganizationAlerts } from "@/lib/server/teacher";

// B12 — Attention Center. Every row here is a student whose computed risk
// (lib/teacher/intelligence.js, backend) is not HEALTHY — inactivity today,
// the only signal wired to a status (see the backend module's own comment on
// why performance-drop/skill-neglect aren't risk-status inputs yet).
export default async function AlertsPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  const alerts = await loadOrganizationAlerts(organizationId);

  if (!alerts) {
    return <div className="teacher-empty">Could not load alerts right now.</div>;
  }
  if (alerts.students.length === 0) {
    return (
      <>
        <h1 className="teacher-h1">Alerts</h1>
        <div className="teacher-empty">
          Nobody needs attention right now — every student has been active
          within the last week.
        </div>
      </>
    );
  }

  const sorted = [...alerts.students].sort((a, b) => severityRank(b.risk.status) - severityRank(a.risk.status));

  return (
    <>
      <h1 className="teacher-h1">Alerts</h1>
      <p className="teacher-sub">{alerts.students.length} of {alerts.totalStudents} students need attention.</p>
      <div className="teacher-table-scroll">
        <table className="teacher-table">
          <thead><tr><th>Student</th><th>Status</th><th>Idle</th><th>Last activity</th></tr></thead>
          <tbody>
            {sorted.map((s) => (
              <tr key={s.studentId}>
                {/* PLATFORM-GROUPS-001 — Alerts is a student roster too, and it
                    was printing the raw studentId in the Student column. The
                    identity is available here now (AlertStudent extends
                    RosterStudent, which the same backend query fills), so
                    leaving it would have shipped one screen showing UUIDs
                    beside two showing names. Same honest null as everywhere
                    else: no invented placeholder, and never the id as a name. */}
                <td>
                  <Link href={`/teacher/${organizationId}/students/${s.studentId}`}>
                    {s.name ?? <span className="teacher-muted">No name recorded</span>}
                  </Link>
                </td>
                <td><span className={`risk-pill risk-${s.risk.status}`}>{s.risk.status.replace("_", " ")}</span></td>
                <td>{s.risk.idleDays !== null ? `${s.risk.idleDays}d` : "—"}</td>
                <td>{s.lastActivityDate ?? "Never recorded"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function severityRank(status: string): number {
  return { CRITICAL: 3, AT_RISK: 2, WATCH: 1, HEALTHY: 0 }[status] ?? 0;
}
