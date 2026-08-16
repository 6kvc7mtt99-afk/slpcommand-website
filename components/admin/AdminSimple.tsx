import { asList, asRecord, displayValue } from "@/lib/admin/format";
import { NA, Tile } from "./AdminUi";

function modeStatusTile(ms: unknown, skillLabel: string) {
  const rec = asRecord(ms);
  if (!ms || rec.__msError) {
    return (
      <Tile
        key={skillLabel}
        value={<NA />}
        label={`${skillLabel} — proficiency engine`}
        info="Mode/validation status not deployed in this environment yet."
      />
    );
  }
  const rollout = rec.shadowFlagEnabled ? `Enabled for ${displayValue(rec.rolloutPercent, "0")}% of users` : "Disabled";
  const validation = asRecord(rec.validation);
  const integrityText = validation.status
    ? validation.status === "PASS"
      ? "Healthy"
      : String(validation.status).replace(/_/g, " ")
    : "Not available yet";
  return (
    <div key={skillLabel} className="admin-tile">
      <div className="l" style={{ fontWeight: 600, marginBottom: 6 }}>{skillLabel}</div>
      <div className="l">
        Rollout: <b>{rollout}</b>
        <span className="admin-muted" title="Percentage of users receiving the new proficiency engine for this skill." style={{ cursor: "help" }}>
          {" "}ⓘ
        </span>
      </div>
      <div className="l">
        Data integrity: <b>{integrityText}</b>
        <span className="admin-muted" title="Whether the engine's own consistency checks are passing." style={{ cursor: "help" }}>
          {" "}ⓘ
        </span>
      </div>
    </div>
  );
}

export function AdminSimple({ data }: { data: Record<string, unknown> }) {
  const users = asRecord(data.users);
  const usage = asRecord(data.usage);
  const health = asRecord(data.health);
  const reports = asRecord(data.reports);
  const deps = asRecord(data.deps);
  const pe = asRecord(data.pe);
  const u = asRecord(usage.last30dAttemptsByModule);
  const mode = displayValue(deps.mode, "unknown");
  const statusLabel =
    mode === "healthy"
      ? "All systems normal"
      : mode === "degraded"
        ? "Degraded — some features may be slow"
        : mode === "outage"
          ? "Outage — investigate now"
          : "Unknown";
  const findings = pe.__peError ? [] : asList(pe.integrity);
  const failing = findings.filter((item) => asRecord(item).status !== "PASS");

  return (
    <div>
      <div className="admin-warn">
        Simple view — plain-language summary. Every figure below comes from the same data as Advanced; nothing here is estimated or invented. Figures not yet available from the backend are shown as &quot;Not available yet&quot;, never guessed.
      </div>
      <section className="admin-section">
        <h3>System status</h3>
        <div className="admin-grid">
          <div className="admin-tile">
            <div className="n">
              <span className={`admin-mode-banner admin-mode-${mode}`}>{statusLabel}</span>
            </div>
            <div className="l">Backend system status</div>
          </div>
          <Tile value={health.status5xx ?? 0} label="Server errors (since last deploy)" info="Count of 5xx server errors — should be near zero." />
          <Tile value={reports.open ?? 0} label="Open user reports" />
        </div>
      </section>
      <section className="admin-section">
        <h3>Users</h3>
        <div className="admin-grid">
          <Tile value={users.total ?? <NA />} label="Total users" />
          <Tile value={users.activeToday ?? <NA />} label="Active today" />
          <Tile value={users.active30d ?? <NA />} label="Active in last 30 days" />
          <Tile value={<NA />} label="Free vs Pro split" info="The users metrics endpoint does not currently break users down by plan." />
        </div>
      </section>
      <section className="admin-section">
        <h3>Usage per skill (last 30 days)</h3>
        <div className="admin-grid">
          <Tile value={u.reading ?? <NA />} label="Reading sessions" />
          <Tile value={u.listening ?? <NA />} label="Listening sessions" />
          <Tile value={u.writing ?? <NA />} label="Writing sessions" />
          <Tile value={u.speaking ?? <NA />} label="Speaking sessions" />
        </div>
      </section>
      <section className="admin-section">
        <h3>Subscriptions</h3>
        <div className="admin-grid">
          <Tile value={<NA />} label="Active Pro subscriptions" info="No subscription/revenue endpoint is exposed to /api/admin yet. This is intentionally left blank rather than estimated." />
        </div>
      </section>
      <section className="admin-section">
        <h3>AI cost</h3>
        <div className="admin-grid">
          <Tile value={<NA />} label="AI cost (last 30 days)" info="No AI-cost metric is exposed to /api/admin yet." />
        </div>
      </section>
      <section className="admin-section">
        <h3>Proficiency engine (per skill)</h3>
        <div className="admin-grid">
          {modeStatusTile(data.ms, "Reading")}
          {modeStatusTile(data.msListening, "Listening")}
          {modeStatusTile(data.msWriting, "Writing")}
          {modeStatusTile(data.msSpeaking, "Speaking")}
        </div>
      </section>
      <section className="admin-section">
        <h3>Data integrity &amp; alerts</h3>
        {!findings.length ? (
          <p className="admin-muted" style={{ fontSize: 13 }}>Proficiency engine integrity data not available yet in this environment.</p>
        ) : failing.length ? (
          <>
            <div className="admin-warn">
              Data integrity: {failing.length} issue{failing.length === 1 ? "" : "s"} detected
            </div>
            <table>
              <thead>
                <tr>
                  <th>Check</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {failing.map((item, index) => {
                  const row = asRecord(item);
                  return (
                    <tr key={index}>
                      <td>{displayValue(row.name ?? row.check)}</td>
                      <td>{displayValue(row.status)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        ) : (
          <p style={{ fontSize: 13, color: "var(--admin-green)" }}>Data integrity: Healthy — all checks passing.</p>
        )}
        {Number(reports.open ?? 0) > 0 ? (
          <p style={{ fontSize: 13, marginTop: 10 }}>
            {String(reports.open)} open user report{Number(reports.open) === 1 ? "" : "s"} awaiting review.
          </p>
        ) : null}
      </section>
      <p className="admin-muted" style={{ fontSize: 12 }}>
        Need the raw numbers, flags or logs? Switch to Advanced.
      </p>
    </div>
  );
}
