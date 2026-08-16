import { asList, asRecord, displayValue, formatWhen, shortId } from "@/lib/admin/format";
import { Empty, Section, Tile } from "./AdminUi";

export function AdminMetrics({
  data,
  onToggleFlag,
  onSetReportStatus,
}: {
  data: Record<string, unknown>;
  onToggleFlag: (key: string, enabled: boolean) => void;
  onSetReportStatus: (id: string, status: "open" | "resolved") => void;
}) {
  const users = asRecord(data.users);
  const learning = asRecord(data.learning);
  const usage = asRecord(data.usage);
  const health = asRecord(data.health);
  const reports = asRecord(data.reports);
  const retention = asRecord(data.retention);
  const deps = asRecord(data.deps);
  const flags = asList(asRecord(data.flags).flags);
  const audit = asList(asRecord(data.audit).logs);
  const attempts = asRecord(learning.attempts);
  const last30 = asRecord(usage.last30dAttemptsByModule);
  const d1 = asRecord(retention.d1);
  const d7 = asRecord(retention.d7);
  const d30 = asRecord(retention.d30);
  const segments = asRecord(retention.segments);
  const backend = asRecord(deps.backend);
  const dependencies = asRecord(deps.dependencies);
  const latestReports = asList(reports.latest);
  const recentErrors = asList(health.recentErrors);

  return (
    <>
      <Section title="Users">
        <div className="admin-grid">
          <Tile value={users.total} label="Total users" />
          <Tile value={users.activeToday} label="Active today" />
          <Tile value={users.active7d} label="Active 7 days" />
          <Tile value={users.active30d} label="Active 30 days" />
          <Tile value={asRecord(users.newRegistrations).d7} label="New (7d)" />
          <Tile value={asRecord(users.newRegistrations).d30} label="New (30d)" />
        </div>
      </Section>
      <Section title="Retention & Segments">
        <div className="admin-grid">
          <Tile value={d1.pct != null ? `${d1.pct}%` : "—"} label="D1 retention" />
          <Tile value={d7.pct != null ? `${d7.pct}%` : "—"} label="D7 retention" />
          <Tile value={d30.pct != null ? `${d30.pct}%` : "—"} label="D30 retention" />
          <Tile value={segments.power} label="Power users (≤3d)" />
          <Tile value={segments.engaged} label="Engaged (4–14d)" />
          <Tile value={segments.churnRisk} label="Churn risk (15–30d)" />
          <Tile value={segments.inactive} label="Inactive (30d+)" />
        </div>
      </Section>
      <Section title="Learning">
        <div className="admin-grid">
          <Tile value={attempts.listening} label="Listening attempts" />
          <Tile value={attempts.reading} label="Reading attempts" />
          <Tile value={attempts.writing} label="Writing attempts" />
          <Tile value={attempts.speaking} label="Speaking attempts" />
          <Tile value={learning.examsStarted} label="Exams started" />
          <Tile value={learning.examsCompleted} label="Exams completed" />
        </div>
      </Section>
      <Section title="Usage (last 30 days)">
        <div className="admin-grid">
          <Tile value={usage.mostUsedModule || "—"} label="Most used module" />
          <Tile value={last30.listening} label="Listening (30d)" />
          <Tile value={last30.reading} label="Reading (30d)" />
          <Tile value={last30.writing} label="Writing (30d)" />
          <Tile value={last30.speaking} label="Speaking (30d)" />
        </div>
      </Section>
      <Section title="System Health — Backend (since last deploy)">
        <div className="admin-grid">
          <Tile value={health.status5xx} label="5xx errors" />
          <Tile value={health.status4xx} label="4xx errors" />
          <Tile value={health.jwtFailures} label="JWT failures (401)" />
          <Tile value={health.rateLimitHits} label="Rate-limit hits (429)" />
          <Tile value={health.total} label="Total API calls" />
        </div>
        {recentErrors.length ? (
          <table style={{ marginTop: 14 }}>
            <thead>
              <tr>
                <th>When</th>
                <th>Status</th>
                <th>Endpoint</th>
              </tr>
            </thead>
            <tbody>
              {recentErrors.map((item, index) => {
                const row = asRecord(item);
                return (
                  <tr key={index}>
                    <td className="admin-muted">{formatWhen(row.at)}</td>
                    <td>{displayValue(row.status)}</td>
                    <td>
                      {displayValue(row.method)} {displayValue(row.path)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <Empty>No recent 4xx/5xx since last deploy.</Empty>
        )}
      </Section>
      <Section title="System Health — Dependencies">
        <div style={{ marginBottom: 10 }}>
          Overall: <span className={`admin-mode-banner admin-mode-${displayValue(deps.mode, "unknown")}`}>{displayValue(deps.mode, "unknown").toUpperCase()}</span>
          <span className="admin-muted" style={{ marginLeft: 10 }}>
            Backend uptime: {displayValue(backend.uptimeSeconds)}s · error rate: {displayValue(backend.errorRatePct)}%
          </span>
        </div>
        <div className="admin-grid">
          {Object.entries(dependencies).map(([name, value]) => {
            const dep = asRecord(value);
            const state = dep.ok ? "ok" : dep.degraded ? "degraded" : "down";
            return (
              <div key={name} className="admin-tile admin-dep">
                <span className={`admin-dot ${state}`} />
                <div>
                  <div style={{ fontWeight: 600 }}>{name}</div>
                  <div className="l">{state}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Section>
      <Section title="User Reports">
        <div className="admin-grid" style={{ marginBottom: 14 }}>
          <Tile value={reports.open} label="Open reports" />
          <Tile value={reports.resolved} label="Resolved reports" />
        </div>
        {latestReports.length ? (
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Category</th>
                <th>Description</th>
                <th>App / iOS</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {latestReports.map((item) => {
                const row = asRecord(item);
                const id = displayValue(row.id, "");
                return (
                  <tr key={id || displayValue(row.created_at)}>
                    <td className="admin-muted">{row.created_at ? new Date(String(row.created_at)).toLocaleDateString() : "—"}</td>
                    <td>{displayValue(row.category)}</td>
                    <td>{displayValue(row.description)}</td>
                    <td className="admin-muted">
                      {displayValue(row.app_version)}
                      <br />
                      {displayValue(row.ios_version)}
                    </td>
                    <td>
                      <span className={`admin-pill ${displayValue(row.status)}`}>{displayValue(row.status)}</span>
                    </td>
                    <td>
                      {row.status === "open" ? (
                        <button className="ghost" type="button" onClick={() => onSetReportStatus(id, "resolved")}>
                          Resolve
                        </button>
                      ) : (
                        <button className="ghost" type="button" onClick={() => onSetReportStatus(id, "open")}>
                          Reopen
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <Empty>No reports yet.</Empty>
        )}
      </Section>
      <Section title="Feature Flags">
        {flags.length ? (
          <table>
            <thead>
              <tr>
                <th>Flag</th>
                <th>Description</th>
                <th>Updated</th>
                <th>Enabled</th>
              </tr>
            </thead>
            <tbody>
              {flags.map((item) => {
                const flag = asRecord(item);
                const key = displayValue(flag.key);
                return (
                  <tr key={key}>
                    <td>
                      <code>{key}</code>
                    </td>
                    <td className="admin-muted">{displayValue(flag.description)}</td>
                    <td className="admin-muted">{flag.updated_at ? formatWhen(flag.updated_at) : "—"}</td>
                    <td>
                      <label className="admin-toggle">
                        <input
                          type="checkbox"
                          checked={Boolean(flag.enabled)}
                          onChange={(event) => onToggleFlag(key, event.target.checked)}
                          aria-label={`Toggle ${key}`}
                        />
                        <span className="admin-slider" />
                      </label>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <Empty>No flags found.</Empty>
        )}
      </Section>
      <Section title="Audit Log">
        {audit.length ? (
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Event</th>
                <th>Actor</th>
                <th>Target</th>
              </tr>
            </thead>
            <tbody>
              {audit.map((item, index) => {
                const row = asRecord(item);
                return (
                  <tr key={index}>
                    <td className="admin-muted">{formatWhen(row.created_at)}</td>
                    <td>{displayValue(row.event_type)}</td>
                    <td className="admin-muted">{row.actor_id ? shortId(row.actor_id) : "—"}</td>
                    <td className="admin-muted">{displayValue(row.target_id)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <Empty>No audit events yet.</Empty>
        )}
      </Section>
    </>
  );
}
