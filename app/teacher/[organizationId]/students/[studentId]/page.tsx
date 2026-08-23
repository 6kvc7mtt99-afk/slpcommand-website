import { notFound } from "next/navigation";
import {
  loadStudentSummary, loadStudentActivity, loadStudentWriting,
  loadStudentProficiency, loadStudentSpeaking, loadStudentDiagnosis,
} from "@/lib/server/teacher";

// B8 — Student 360. Every section here is one of the canonical sources the
// discovery pass identified — nothing computed a second time, nothing shown
// that the data cannot actually support.
export default async function Student360({
  params,
}: {
  params: Promise<{ organizationId: string; studentId: string }>;
}) {
  const { organizationId, studentId } = await params;

  const [summary, activity, writing, proficiency, speaking, diagnosis] = await Promise.all([
    loadStudentSummary(organizationId, studentId),
    loadStudentActivity(organizationId, studentId, 30),
    loadStudentWriting(organizationId, studentId),
    loadStudentProficiency(organizationId, studentId),
    loadStudentSpeaking(organizationId, studentId),
    loadStudentDiagnosis(organizationId, studentId),
  ]);

  // A 404 from ANY of these (all gated by the same requireOrgMembership +
  // assertStudentInOrganization) means the same thing: this student is not
  // real, or not this teacher's. One check, not six different partial pages.
  if (!summary) notFound();

  return (
    <>
      <h1 className="teacher-h1">{studentId}</h1>
      <p className="teacher-sub">
        Target {summary.targetLevel ?? "—"} · Member since {new Date(summary.memberSince).toLocaleDateString()}
        {diagnosis && (
          <> · <span className={`risk-pill risk-${diagnosis.risk.status}`}>{diagnosis.risk.status.replace("_", " ")}</span></>
        )}
      </p>

      <Section title="Diagnosis">
        <Diagnosis findings={diagnosis?.findings ?? []} />
      </Section>

      <Section title="Activity (last 30 days)">
        <ActivitySummary activity={activity?.activity ?? []} />
      </Section>

      <Section title="Proficiency">
        <ProficiencySummary skills={proficiency?.skills ?? []} />
      </Section>

      <Section title="Writing">
        <WritingHistory attempts={writing?.attempts ?? []} />
      </Section>

      <Section title="Speaking">
        <SpeakingSummary attempts={speaking?.attempts ?? []} />
      </Section>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: "var(--fs-section)", marginBottom: 10 }}>{title}</h2>
      {children}
    </section>
  );
}

// WHAT? / WHY? / WHAT NEXT? — the mandate's own required separation. Each
// finding renders its three parts as three distinct, labeled fields — never
// merged into one sentence that blurs a fact into a guess.
function Diagnosis({ findings }: { findings: { id: string; observed: string; calculated: string; recommended: string }[] }) {
  if (findings.length === 0) {
    return <p className="data-note">No findings yet — not enough recorded activity to say anything reliable.</p>;
  }
  return (
    <>
      {findings.map((f) => (
        <dl key={f.id} className="finding">
          <dt>Observed</dt><dd>{f.observed}</dd>
          <dt>Calculated</dt><dd>{f.calculated}</dd>
          <dt>Recommended</dt><dd className="recommended">{f.recommended}</dd>
        </dl>
      ))}
    </>
  );
}

function ActivitySummary({ activity }: { activity: { reading_practice_question_count: number; listening_practice_question_count: number; writing_submission_count: number; speaking_evaluation_count: number; academy_completion_count: number; activity_date: string }[] }) {
  if (activity.length === 0) {
    return <p className="data-note">No activity recorded in this window.</p>;
  }
  const sum = (key: keyof typeof activity[number]) => activity.reduce((s, d) => s + (Number(d[key]) || 0), 0);
  return (
    <div className="teacher-cards">
      <div className="teacher-card"><div className="value skill-badge-reading">{sum("reading_practice_question_count")}</div><div className="label">Reading items</div></div>
      <div className="teacher-card"><div className="value skill-badge-listening">{sum("listening_practice_question_count")}</div><div className="label">Listening items</div></div>
      <div className="teacher-card"><div className="value skill-badge-writing">{sum("writing_submission_count")}</div><div className="label">Writing submissions</div></div>
      <div className="teacher-card"><div className="value skill-badge-speaking">{sum("speaking_evaluation_count")}</div><div className="label">Speaking evaluations</div></div>
      <div className="teacher-card"><div className="value">{sum("academy_completion_count")}</div><div className="label">Academy lessons</div></div>
      <div className="teacher-card"><div className="value">{activity.length}</div><div className="label">Active days</div></div>
    </div>
  );
}

// theta/sigma2 are raw IRT parameters, not a 1-3 SLP level — showing them as
// one would be reinterpreting the engine's output past what the mandate
// allows. Only the evidence VOLUME (n_events) is turned into a presentation
// label; the raw numbers stay in a clearly-marked technical disclosure.
function evidenceLabel(nEvents: number): string {
  if (nEvents === 0) return "No evidence yet";
  if (nEvents < 5) return "Thin evidence";
  if (nEvents < 15) return "Moderate evidence";
  return "Strong evidence";
}

function ProficiencySummary({ skills }: { skills: { skill: string; theta: number | null; sigma2: number | null; n_events: number; last_event_at: string | null }[] }) {
  if (skills.length === 0) {
    return <p className="data-note">No proficiency data recorded for this student yet.</p>;
  }
  return (
    <table className="teacher-table">
      <thead><tr><th>Skill</th><th>Evidence</th><th>Last measured</th></tr></thead>
      <tbody>
        {skills.map((s) => (
          <tr key={s.skill}>
            <td className={`skill-badge-${s.skill}`}>{s.skill}</td>
            <td>{evidenceLabel(s.n_events)} ({s.n_events})</td>
            <td>{s.last_event_at ? new Date(s.last_event_at).toLocaleDateString() : "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function WritingHistory({ attempts }: { attempts: { id: string; submitted_at: string; overall_score: number | null; target_level: string | null; estimated_level: string | null; topic: string | null; status: string }[] }) {
  if (attempts.length === 0) {
    return <p className="data-note">No Writing submissions yet.</p>;
  }
  return (
    <table className="teacher-table">
      <thead><tr><th>Date</th><th>Topic</th><th>Score</th><th>Target → Estimated</th><th>Status</th></tr></thead>
      <tbody>
        {attempts.map((a) => (
          <tr key={a.id}>
            <td>{new Date(a.submitted_at).toLocaleDateString()}</td>
            <td>{a.topic ?? "—"}</td>
            <td>{a.overall_score ?? "Pending"}</td>
            <td>{a.target_level ?? "—"} → {a.estimated_level ?? "—"}</td>
            <td>{a.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// speaking_attempts is real but DATA_SPARSE across all of production as of
// the discovery pass (8 rows total) — this label is not per-student, it is
// an honest description of what a handful of rows can and cannot support.
function SpeakingSummary({ attempts }: { attempts: { id: string; created_at: string; fluency_score: number | null }[] }) {
  if (attempts.length === 0) {
    return <p className="data-note">No Speaking evaluations recorded yet.</p>;
  }
  return (
    <>
      {attempts.length < 5 && (
        <p className="data-note">
          DATA LIMITED — {attempts.length} recorded evaluation{attempts.length === 1 ? "" : "s"}, not enough for a trend.
        </p>
      )}
      <table className="teacher-table">
        <thead><tr><th>Date</th><th>Fluency</th></tr></thead>
        <tbody>
          {attempts.map((a) => (
            <tr key={a.id}>
              <td>{new Date(a.created_at).toLocaleDateString()}</td>
              <td>{a.fluency_score ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
