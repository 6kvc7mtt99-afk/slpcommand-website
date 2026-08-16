import { asList, asRecord, displayValue } from "@/lib/admin/format";
import { Dot } from "./AdminUi";

export function AdminWritingEval({
  userId,
  limit,
  onUserId,
  onLimit,
  onLoad,
  payload,
  loading,
}: {
  userId: string;
  limit: string;
  onUserId: (value: string) => void;
  onLimit: (value: string) => void;
  onLoad: () => void;
  payload: unknown;
  loading: boolean;
}) {
  return (
    <section className="admin-card">
      <h3>Writing evaluation</h3>
      <p className="admin-muted" style={{ marginTop: -4 }}>What the scores produced, what task coverage did to it, and under which rule.</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "end", marginBottom: 10 }}>
        <label style={{ fontSize: 12 }}>
          learner (optional)
          <br />
          <input value={userId} onChange={(e) => onUserId(e.target.value)} placeholder="user id" style={{ minWidth: 280 }} />
        </label>
        <label style={{ fontSize: 12 }}>
          attempts
          <br />
          <input type="number" value={limit} min={1} max={200} onChange={(e) => onLimit(e.target.value)} style={{ width: 80 }} />
        </label>
        <button type="button" onClick={onLoad}>
          Load writing evaluations
        </button>
      </div>
      {loading ? <p className="admin-muted">Loading…</p> : payload ? <WritingEvalBody payload={asRecord(payload)} /> : null}
    </section>
  );
}

function level(value: unknown) {
  return value == null ? <span className="admin-muted">—</span> : <strong>{displayValue(value)}</strong>;
}

function WritingEvalBody({ payload }: { payload: Record<string, unknown> }) {
  const summary = asRecord(payload.summary);
  const distribution = asRecord(summary.distribution);
  return (
    <div>
      <p style={{ fontSize: 13, margin: "0 0 8px" }}>
        {displayValue(summary.headline)}
        <span className="admin-muted"> · contract {displayValue(payload.contractVersion)}</span>
      </p>
      <h4 style={{ margin: "14px 0 4px" }}>The rule</h4>
      <div style={{ fontSize: 12, overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>task coverage</th>
              <th>ceiling</th>
              <th>effect</th>
              <th>seen</th>
            </tr>
          </thead>
          <tbody>
            {asList(payload.rules).map((item, index) => {
              const rule = asRecord(item);
              return (
                <tr key={index}>
                  <td style={{ fontFamily: "monospace", fontSize: 11 }}>{displayValue(rule.value)}</td>
                  <td>{rule.ceiling == null ? <span className="admin-muted">none</span> : <strong>{displayValue(rule.ceiling)}</strong>}</td>
                  <td>{displayValue(rule.effect)}</td>
                  <td>{displayValue(distribution[String(rule.value)], "0")}</td>
                </tr>
              );
            })}
            {summary.notRecorded ? (
              <tr>
                <td className="admin-muted" colSpan={3}>
                  Evaluated before task coverage existed — no ceiling was available
                </td>
                <td>{displayValue(summary.notRecorded)}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <h4 style={{ margin: "16px 0 4px" }}>Decision path, per attempt</h4>
      <div style={{ fontSize: 12, overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>when</th>
              <th>task/content/lang</th>
              <th>band</th>
              <th>coverage</th>
              <th>before</th>
              <th>ceiling</th>
              <th>final</th>
              <th>applied rule</th>
            </tr>
          </thead>
          <tbody>
            {asList(payload.attempts).map((item, index) => {
              const attempt = asRecord(item);
              const scores = asRecord(attempt.scores);
              return (
                <tr key={index} style={attempt.contradiction ? { background: "rgba(255,159,10,0.08)" } : undefined}>
                  <td style={{ whiteSpace: "nowrap" }}>{displayValue(attempt.createdAt).slice(0, 10)}</td>
                  <td>
                    {displayValue(scores.task)} / {displayValue(scores.content)} / {displayValue(scores.language)}
                  </td>
                  <td>{displayValue(attempt.overallBand)}</td>
                  <td style={{ fontFamily: "monospace", fontSize: 11 }}>
                    {attempt.taskCoverage ? displayValue(attempt.taskCoverage) : <span className="admin-muted">not recorded</span>}
                  </td>
                  <td>{level(attempt.levelBeforeCoverage)}</td>
                  <td>{attempt.ceiling == null ? <span className="admin-muted">—</span> : displayValue(attempt.ceiling)}</td>
                  <td>
                    {level(attempt.levelAfterCoverage ?? attempt.reportedLevel)}
                    {attempt.applied ? <span style={{ color: "#d97706" }}> capped</span> : null}
                  </td>
                  <td>
                    {displayValue(attempt.rule)}
                    {attempt.reason ? (
                      <>
                        <br />
                        <span style={{ fontSize: 11, color: "var(--admin-muted)" }}>Model&apos;s reason: {displayValue(attempt.reason)}</span>
                      </>
                    ) : null}
                    {attempt.warning ? (
                      <>
                        <br />
                        <span style={{ color: "#dc2626", fontSize: 11 }}>{displayValue(attempt.warning)}</span>
                      </>
                    ) : null}
                    {attempt.ceilingSuppressed ? (
                      <>
                        <br />
                        <span style={{ fontSize: 11, color: "var(--admin-muted)" }}>Emerging-level claim suppressed: the task was not delivered.</span>
                      </>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {summary.contradictions ? (
        <p style={{ fontSize: 12, marginTop: 8 }}>
          <Dot status="amber" />
          <strong>{displayValue(summary.contradictions)}</strong> attempt(s) highlighted: the model scored the language 60+ and still reported the task unfulfilled. A run of these means the rubric is confusing the model — a content problem, not an engine one.
        </p>
      ) : null}
    </div>
  );
}
