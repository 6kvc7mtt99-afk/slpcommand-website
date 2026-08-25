import Link from "next/link";
import { loadOrganizationStudents, loadOrganizationAlerts } from "@/lib/server/teacher";
import {
  loadOrganizationOverview, loadOrganizationActivityTrend,
  loadOrganizationProficiency, loadOrganizationMembers,
} from "@/lib/server/platform";
import { hasPermission, PERMISSIONS } from "@/lib/platform/permissions";
import { loadTeacherMemberships } from "@/lib/server/teacher";

// FASE PLATFORM-ACADEMY-001 — the Academy Dashboard.
//
// The question this page answers, in the order an academy owner asks it:
//
//   1. Who needs attention TODAY?      (actionable, so it goes first)
//   2. How big is my academy?          (people)
//   3. Is anyone actually using it?    (engagement — the number that decides renewal)
//   4. What work is getting done?      (volume)
//   5. Where are they weak?            (pedagogy)
//
// B6 shipped the attention list against a raw roster. This composes the
// organization reporting that PLATFORM-TENANT-001 added, and fixes the flaw
// that made the old version unusable in front of a customer: it showed
// student UUIDs where names belong. Names come from the members endpoint —
// the roster deliberately does not carry them, so they are joined here rather
// than duplicated into a second backend shape.
//
// EVERY NUMBER IS A COUNT OF ROWS THAT EXIST. Where the data cannot support a
// statement, the page says so in words instead of showing a confident-looking
// figure. That is not modesty — a fabricated engagement percentage in a sales
// demo is a lie that gets discovered during the pilot.

export const dynamic = "force-dynamic";

const WINDOW_DAYS = 30;

function severityRank(status: string): number {
  return { CRITICAL: 3, AT_RISK: 2, WATCH: 1, HEALTHY: 0 }[status] ?? 0;
}

function Stat({ value, label, hint }: { value: string; label: string; hint?: string }) {
  return (
    <div className="teacher-stat">
      <div className="teacher-stat-value">{value}</div>
      <div className="teacher-stat-label">{label}</div>
      {hint ? <div className="teacher-stat-hint">{hint}</div> : null}
    </div>
  );
}

export default async function AcademyDashboard({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  const memberships = await loadTeacherMemberships();
  const canSeeReporting = hasPermission(memberships, organizationId, PERMISSIONS.REPORTING_READ);
  const canSeeMembers = hasPermission(memberships, organizationId, PERMISSIONS.MEMBERS_READ);

  const [roster, alerts, overview, trend, proficiency, members] = await Promise.all([
    loadOrganizationStudents(organizationId, { limit: 1 }), // only `.total` is needed
    loadOrganizationAlerts(organizationId),
    canSeeReporting ? loadOrganizationOverview(organizationId, WINDOW_DAYS) : Promise.resolve(null),
    canSeeReporting ? loadOrganizationActivityTrend(organizationId, WINDOW_DAYS) : Promise.resolve(null),
    canSeeReporting ? loadOrganizationProficiency(organizationId) : Promise.resolve(null),
    canSeeMembers ? loadOrganizationMembers(organizationId) : Promise.resolve(null),
  ]);

  const total = roster?.total ?? 0;

  // userId → display name, so the attention list reads like people rather than
  // identifiers. A member with no recorded name stays null and renders as a
  // short id — never a fabricated "Student 1".
  const nameById = new Map<string, string>();
  for (const m of members ?? []) {
    if (m.name) nameById.set(m.userId, m.name);
    else if (m.email) nameById.set(m.userId, m.email);
  }

  if (total === 0) {
    return (
      <>
        <h1 className="teacher-h1">Academy</h1>
        <div className="teacher-empty">
          <strong>No students yet.</strong>
          <p>
            Invite learners from the Invite page. Once they join and start practising, their real
            activity, progress and weak areas appear here — nothing is shown until then.
          </p>
        </div>
      </>
    );
  }

  const attention = (alerts?.students ?? [])
    .slice()
    .sort((a, b) => severityRank(b.risk.status) - severityRank(a.risk.status));
  const byStatus = { WATCH: 0, AT_RISK: 0, CRITICAL: 0 };
  for (const s of attention) {
    if (s.risk.status in byStatus) byStatus[s.risk.status as keyof typeof byStatus] += 1;
  }
  const healthy = Math.max(total - attention.length, 0);
  const peakDay = trend?.days.length
    ? trend.days.reduce((a, b) => (b.qualifyingActivities > a.qualifyingActivities ? b : a))
    : null;

  return (
    <>
      <h1 className="teacher-h1">Academy</h1>
      <p className="teacher-sub">
        {total} student{total === 1 ? "" : "s"}
        {overview ? ` · ${overview.staffCount} staff · ${overview.groupCount} group${overview.groupCount === 1 ? "" : "s"}` : ""}
        {" "}· last {WINDOW_DAYS} days
      </p>

      {/* ── 1. What needs doing, first ────────────────────────────────────── */}
      <section className="teacher-section">
        <h2 className="teacher-h2">Needs attention</h2>
        {attention.length === 0 ? (
          <div className="teacher-empty">
            <strong>Nobody needs attention right now.</strong>
            <p>Every student has recorded activity recently.</p>
          </div>
        ) : (
          <>
            <div className="teacher-table-scroll">
              <table className="teacher-table">
                <caption className="teacher-caption">
                  Ranked by severity. Status is derived from recorded activity — a student with no
                  activity at all is flagged, rather than being assumed to be fine.
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Student</th>
                    <th scope="col">Status</th>
                    <th scope="col">Why</th>
                    <th scope="col">Last activity</th>
                    <th scope="col">Target</th>
                  </tr>
                </thead>
                <tbody>
                  {attention.slice(0, 10).map((s) => (
                    <tr key={s.studentId}>
                      <td>
                        <Link href={`/teacher/${organizationId}/students/${s.studentId}`}>
                          {nameById.get(s.studentId) ?? (
                            <span className="teacher-muted">{s.studentId.slice(0, 8)}…</span>
                          )}
                        </Link>
                      </td>
                      <td>
                        <span className={`risk-pill risk-${s.risk.status}`}>
                          {s.risk.status.replace("_", " ")}
                        </span>
                      </td>
                      <td>
                        {s.risk.reason === "no_activity_recorded"
                          ? "Has not started"
                          : s.risk.idleDays != null
                            ? `${s.risk.idleDays} days inactive`
                            : "—"}
                      </td>
                      <td>{s.lastActivityDate ?? <span className="teacher-muted">Never</span>}</td>
                      <td>{s.targetLevel ?? <span className="teacher-muted">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {attention.length > 10 ? (
              <p className="teacher-note">
                <Link href={`/teacher/${organizationId}/alerts`}>
                  View all {attention.length} attention items →
                </Link>
              </p>
            ) : null}
          </>
        )}
      </section>

      {/* ── 2. Cohort health at a glance ──────────────────────────────────── */}
      <section className="teacher-section">
        <h2 className="teacher-h2">Cohort</h2>
        <div className="teacher-stat-grid">
          <Stat value={String(healthy)} label="Healthy" hint="Active recently" />
          <Stat value={String(byStatus.WATCH)} label="Watch" />
          <Stat value={String(byStatus.AT_RISK)} label="At risk" />
          <Stat value={String(byStatus.CRITICAL)} label="Critical" />
        </div>
      </section>

      {/* ── 3. Engagement — the renewal number ────────────────────────────── */}
      {overview ? (
        <section className="teacher-section">
          <h2 className="teacher-h2">Engagement</h2>
          <div className="teacher-stat-grid">
            <Stat
              value={`${overview.activeStudentsInWindow} of ${overview.studentCount}`}
              label={`Active in ${WINDOW_DAYS} days`}
              hint="At least one recorded day of activity"
            />
            <Stat
              value={String(overview.studentsWithNoActivityEver)}
              label="Never started"
              hint="No recorded activity at any point — a different problem from lapsing"
            />
            <Stat
              value={String(overview.studentsInactiveInWindow)}
              label="Lapsed"
              hint={`Started, but nothing in the last ${WINDOW_DAYS} days`}
            />
          </div>
          {peakDay ? (
            <p className="teacher-note">
              Busiest day was {peakDay.date}, with {peakDay.qualifyingActivities} qualifying
              activit{peakDay.qualifyingActivities === 1 ? "y" : "ies"} from {peakDay.activeStudents}{" "}
              student{peakDay.activeStudents === 1 ? "" : "s"}.{" "}
              {trend!.days.length} day{trend!.days.length === 1 ? "" : "s"} had any activity at all
              in this window.
            </p>
          ) : null}
        </section>
      ) : null}

      {/* ── 4. Work completed ─────────────────────────────────────────────── */}
      {overview?.hasData ? (
        <section className="teacher-section">
          <h2 className="teacher-h2">Work completed</h2>
          <div className="teacher-stat-grid">
            <Stat value={String(overview.totals.readingPracticeQuestions)} label="Reading questions" />
            <Stat value={String(overview.totals.listeningPracticeQuestions)} label="Listening questions" />
            <Stat value={String(overview.totals.writingSubmissions)} label="Writing submissions" />
            <Stat value={String(overview.totals.academyCompletions)} label="Academy lessons" />
          </div>
          {overview.writing.scoredAttempts > 0 ? (
            <p className="teacher-note">
              Writing averages <strong>{overview.writing.averageOverallScore}</strong> across{" "}
              {overview.writing.scoredAttempts} scored submission
              {overview.writing.scoredAttempts === 1 ? "" : "s"}.
              {overview.writing.scoredAttempts < 5 ? (
                <> That is too few to read as a trend — treat it as a description of those{" "}
                {overview.writing.scoredAttempts}, not of the academy.</>
              ) : null}
            </p>
          ) : null}
        </section>
      ) : null}

      {/* ── 5. Where they stand ───────────────────────────────────────────── */}
      {proficiency && proficiency.skills.length > 0 ? (
        <section className="teacher-section">
          <h2 className="teacher-h2">Proficiency</h2>
          <div className="teacher-table-scroll">
            <table className="teacher-table">
              <caption className="teacher-caption">
                The learning engine&apos;s own ability estimates (theta), shown exactly as it
                computed them. They are deliberately not converted to a STANAG level here — that
                mapping belongs to the engine, and a second version of it on this page would
                eventually disagree with the student&apos;s own screens.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Skill</th>
                  <th scope="col">Students measured</th>
                  <th scope="col">Mean</th>
                  <th scope="col">Range</th>
                </tr>
              </thead>
              <tbody>
                {proficiency.skills.map((s) => (
                  <tr key={s.skill}>
                    <td style={{ textTransform: "capitalize" }}>{s.skill}</td>
                    <td>{s.studentCount}</td>
                    <td>{s.meanTheta}</td>
                    <td>{s.minTheta} to {s.maxTheta}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {canSeeReporting ? (
        <p className="teacher-note">
          <Link href={`/teacher/${organizationId}/reports`}>Full reports →</Link>
        </p>
      ) : null}
    </>
  );
}
