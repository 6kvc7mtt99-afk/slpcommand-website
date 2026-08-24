import {
  loadOrganizationOverview, loadOrganizationActivityTrend,
  loadOrganizationProficiency, loadGroupBreakdown,
} from "@/lib/server/platform";

// FASE PLATFORM-REPORTING-001 — the organization report.
//
// THE RULE THIS PAGE IS BUILT AROUND: every number below is a count or a sum
// of rows that exist. There is no "94% engagement", no extrapolation, and no
// percentage over a denominator of three. Where the data cannot support a
// statement, the page says so in words instead of showing a confident-looking
// figure — which is why "never started" and "not active lately" are shown as
// two separate counts rather than merged into one "inactive" number that
// would read as insight and tell an administrator nothing they can act on.

export const dynamic = "force-dynamic";

const WINDOW_DAYS = 30;

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="teacher-stat">
      <div className="teacher-stat-value">{value}</div>
      <div className="teacher-stat-label">{label}</div>
      {hint ? <div className="teacher-stat-hint">{hint}</div> : null}
    </div>
  );
}

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  const [overview, trend, proficiency, breakdown] = await Promise.all([
    loadOrganizationOverview(organizationId, WINDOW_DAYS),
    loadOrganizationActivityTrend(organizationId, WINDOW_DAYS),
    loadOrganizationProficiency(organizationId),
    loadGroupBreakdown(organizationId, WINDOW_DAYS),
  ]);

  if (!overview) {
    return <div className="teacher-empty">Could not load reporting right now.</div>;
  }

  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
  const peakDay = trend?.days.length
    ? trend.days.reduce((a, b) => (b.qualifyingActivities > a.qualifyingActivities ? b : a))
    : null;

  return (
    <>
      <h1 className="teacher-h1">Reports</h1>
      <p className="teacher-sub">
        Everything on this page is counted from what students actually did, over the last{" "}
        {WINDOW_DAYS} days. Nothing is estimated.
      </p>

      {overview.studentCount === 0 ? (
        <div className="teacher-empty">
          <strong>No students yet.</strong>
          <p>
            Invite students from the Invite page. Once they start practising, their activity
            appears here — until then there is genuinely nothing to report.
          </p>
        </div>
      ) : (
        <>
          <section className="teacher-section">
            <h2 className="teacher-h2">People</h2>
            <div className="teacher-stat-grid">
              <StatCard label="Students" value={String(overview.studentCount)} />
              <StatCard label="Staff" value={String(overview.staffCount)} hint="Owners, admins and teachers" />
              <StatCard label="Groups" value={String(overview.groupCount)} />
            </div>
          </section>

          <section className="teacher-section">
            <h2 className="teacher-h2">Engagement</h2>
            <div className="teacher-stat-grid">
              <StatCard
                label={`Active in ${WINDOW_DAYS} days`}
                value={`${overview.activeStudentsInWindow} of ${overview.studentCount}`}
                hint="Students with at least one recorded day of activity"
              />
              <StatCard
                label="Not active recently"
                value={String(overview.studentsInactiveInWindow)}
                hint={`No recorded activity in the last ${WINDOW_DAYS} days`}
              />
              <StatCard
                label="Never started"
                value={String(overview.studentsWithNoActivityEver)}
                hint="No recorded activity at any point — a different problem from lapsing"
              />
            </div>
          </section>

          <section className="teacher-section">
            <h2 className="teacher-h2">Work completed</h2>
            {overview.hasData ? (
              <div className="teacher-table-scroll">
                <table className="teacher-table">
                  <caption className="teacher-caption">
                    Totals across the organization in the last {WINDOW_DAYS} days.
                  </caption>
                  <tbody>
                    <tr><th scope="row">Reading practice questions</th><td>{overview.totals.readingPracticeQuestions}</td></tr>
                    <tr><th scope="row">Reading exams</th><td>{overview.totals.readingExams}</td></tr>
                    <tr><th scope="row">Listening practice questions</th><td>{overview.totals.listeningPracticeQuestions}</td></tr>
                    <tr><th scope="row">Listening exams</th><td>{overview.totals.listeningExams}</td></tr>
                    <tr><th scope="row">Writing submissions</th><td>{overview.totals.writingSubmissions}</td></tr>
                    <tr><th scope="row">Speaking evaluations</th><td>{overview.totals.speakingEvaluations}</td></tr>
                    <tr><th scope="row">Academy lessons completed</th><td>{overview.totals.academyCompletions}</td></tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="teacher-empty">
                No activity recorded in this window yet.
              </div>
            )}
          </section>

          <section className="teacher-section">
            <h2 className="teacher-h2">Writing</h2>
            {overview.writing.scoredAttempts > 0 ? (
              <p className="teacher-note">
                <strong>{overview.writing.averageOverallScore}</strong> average overall score,
                across {plural(overview.writing.scoredAttempts, "scored submission")}
                {overview.writing.attempts !== overview.writing.scoredAttempts
                  ? ` (of ${plural(overview.writing.attempts, "submission")} in total)`
                  : ""}.
                {overview.writing.scoredAttempts < 5 ? (
                  <> That is too few submissions to read as a trend — treat it as a description
                  of those {overview.writing.scoredAttempts}, not of the cohort.</>
                ) : null}
              </p>
            ) : (
              <div className="teacher-empty">
                {overview.writing.attempts > 0
                  ? `${plural(overview.writing.attempts, "submission")}, none scored yet.`
                  : "No writing submitted in this window."}
              </div>
            )}
          </section>

          {peakDay ? (
            <section className="teacher-section">
              <h2 className="teacher-h2">Daily activity</h2>
              <p className="teacher-note">
                {plural(trend!.days.length, "day")} with recorded activity in this window. Busiest
                was {peakDay.date}, with {plural(peakDay.qualifyingActivities, "qualifying activity")}
                {" "}from {plural(peakDay.activeStudents, "student")}.
              </p>
              <div className="teacher-table-scroll">
                <table className="teacher-table">
                  <caption className="teacher-caption">
                    Only days with real activity are listed. A missing date means no student
                    recorded anything that day — it is not shown as a zero, because a measured
                    zero and no data are different facts.
                  </caption>
                  <thead>
                    <tr><th scope="col">Date</th><th scope="col">Active students</th><th scope="col">Qualifying activities</th></tr>
                  </thead>
                  <tbody>
                    {trend!.days.slice(-14).reverse().map((d) => (
                      <tr key={d.date}>
                        <td>{d.date}</td>
                        <td>{d.activeStudents}</td>
                        <td>{d.qualifyingActivities}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {proficiency && proficiency.skills.length > 0 ? (
            <section className="teacher-section">
              <h2 className="teacher-h2">Proficiency</h2>
              <p className="teacher-note">
                These are the learning engine&apos;s own ability estimates (theta), shown exactly
                as it computed them. They are not converted to a STANAG level here — that mapping
                belongs to the engine, and a second version of it on this page would eventually
                disagree with the student&apos;s own screens.
              </p>
              <div className="teacher-table-scroll">
                <table className="teacher-table">
                  <thead>
                    <tr>
                      <th scope="col">Skill</th><th scope="col">Students measured</th>
                      <th scope="col">Mean theta</th><th scope="col">Range</th><th scope="col">Events</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proficiency.skills.map((s) => (
                      <tr key={s.skill}>
                        <td>{s.skill}</td>
                        <td>{s.studentCount}</td>
                        <td>{s.meanTheta}</td>
                        <td>{s.minTheta} to {s.maxTheta}</td>
                        <td>{s.totalEvents}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {breakdown && breakdown.groups.length > 0 ? (
            <section className="teacher-section">
              <h2 className="teacher-h2">By group</h2>
              <div className="teacher-table-scroll">
                <table className="teacher-table">
                  <thead>
                    <tr>
                      <th scope="col">Group</th><th scope="col">Students</th>
                      <th scope="col">Active</th><th scope="col">Activities</th>
                      <th scope="col">Writing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {breakdown.groups.map((g) => (
                      <tr key={g.groupId ?? "unassigned"}>
                        <td>{g.groupName ?? "Unassigned"}</td>
                        <td>{g.studentCount}</td>
                        <td>{g.activeStudentsInWindow}</td>
                        <td>{g.qualifyingActivities}</td>
                        <td>{g.writingSubmissions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </>
      )}
    </>
  );
}
