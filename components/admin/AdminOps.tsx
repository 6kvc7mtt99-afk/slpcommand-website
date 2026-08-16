import { asList, asRecord, displayValue } from "@/lib/admin/format";
import { Dot, Empty } from "./AdminUi";

export function AdminStartup({ payload }: { payload: unknown }) {
  if (!payload) return <p>Startup endpoint unavailable.</p>;
  const rec = asRecord(payload);
  return (
    <section className="admin-card">
      <h3>Startup configuration</h3>
      <p className="admin-muted" style={{ marginTop: -4 }}>Exactly what the boot log prints — no need to open Render logs.</p>
      <p style={{ fontSize: 13 }}>
        <Dot status={rec.valid ? "green" : "red"} />
        raw <code>{rec.rawPresent ? JSON.stringify(rec.rawValue) : "(not set)"}</code>
        {" "}
        → normalized <strong>{displayValue(rec.normalizedValue)}</strong>
        <span className="admin-muted">
          {" "}
          · configuration hash {displayValue(rec.configurationHash)} · started {displayValue(rec.startedAt).slice(0, 19)}
        </span>
      </p>
      <div style={{ fontSize: 12, overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>skill</th>
              <th>resolved</th>
              <th>source</th>
              <th>variable</th>
              <th>raw</th>
            </tr>
          </thead>
          <tbody>
            {asList(rec.skills).map((item, index) => {
              const row = asRecord(item);
              return (
                <tr key={index}>
                  <td>{displayValue(row.skill)}</td>
                  <td>
                    <strong>{displayValue(row.resolved)}</strong>
                  </td>
                  <td>{displayValue(row.source)}</td>
                  <td style={{ fontFamily: "monospace", fontSize: 11 }}>{displayValue(row.variable)}</td>
                  <td>{displayValue(row.rawValue)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {asList(rec.warnings).length ? (
        asList(rec.warnings).map((item, index) => {
          const warning = asRecord(item);
          return (
            <p key={index} style={{ fontSize: 12, margin: "6px 0" }}>
              <Dot status={displayValue(warning.severity)} />
              {displayValue(warning.detail)}
              <br />
              <span style={{ marginLeft: 14, color: "#0284c7" }}>→ {displayValue(warning.action)}</span>
            </p>
          );
        })
      ) : (
        <p className="admin-muted" style={{ fontSize: 12 }}>No configuration warnings.</p>
      )}
      <details style={{ fontSize: 11, marginTop: 6 }}>
        <summary className="admin-muted">Boot log lines</summary>
        <pre style={{ background: "#0c1120", padding: 8, borderRadius: 6, overflowX: "auto" }}>{asList(rec.logLines).map(String).join("\n")}</pre>
      </details>
    </section>
  );
}

export function AdminDiagnose({
  verdict,
  payload,
  onRun,
}: {
  verdict: string;
  payload: unknown;
  onRun: () => void;
}) {
  const rec = asRecord(payload);
  return (
    <section className="admin-card">
      <h3>Diagnose system</h3>
      <p className="admin-muted" style={{ marginTop: -4 }}>{verdict}</p>
      <button type="button" onClick={onRun} style={{ marginBottom: 10 }}>
        Diagnose System
      </button>
      {payload ? (
        <div>
          <div style={{ fontSize: 12, marginBottom: 10 }}>
            {asList(rec.subsystems).map((item, index) => {
              const row = asRecord(item);
              return (
                <div key={index} style={{ padding: "3px 0", borderTop: "1px solid var(--admin-line)" }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Dot status={displayValue(row.severity || (row.ok ? "green" : "amber"))} />
                    <span style={{ width: 110 }}>{displayValue(row.id)}</span>
                    <strong style={{ width: 170 }}>{displayValue(row.measured)}</strong>
                    <span className="admin-muted">{displayValue(row.detail)}</span>
                  </div>
                  {row.action ? <div style={{ marginLeft: 124, color: "#0284c7" }}>→ {displayValue(row.action)}</div> : null}
                </div>
              );
            })}
          </div>
          {asList(asRecord(rec.alerts).alerts).length ? (
            <>
              <h4 style={{ margin: "12px 0 4px" }}>Alerts</h4>
              <div style={{ fontSize: 12 }}>
                {asList(asRecord(rec.alerts).alerts).map((item, index) => {
                  const alert = asRecord(item);
                  return (
                    <div key={index} style={{ padding: "4px 0", borderTop: "1px solid var(--admin-line)" }}>
                      <Dot status={displayValue(alert.severity)} />
                      <strong>{displayValue(alert.id)}</strong>
                      <span className="admin-muted"> ×{displayValue(alert.count)}</span>
                      <br />
                      <span style={{ marginLeft: 14 }}>{displayValue(alert.detail)}</span>
                      <br />
                      <span style={{ marginLeft: 14, color: "#0284c7" }}>→ {displayValue(alert.action)}</span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="admin-muted" style={{ fontSize: 12 }}>
              No alerts. All {asList(asRecord(rec.alerts).checked).length} conditions checked.
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}

export function AdminRecovery({
  recovery,
  replayUser,
  replay,
  onReplayUser,
  onReplay,
}: {
  recovery: unknown;
  replayUser: string;
  replay: unknown;
  onReplayUser: (value: string) => void;
  onReplay: () => void;
}) {
  const rec = asRecord(recovery);
  const coverage = asRecord(rec.coverage);
  return (
    <section className="admin-card">
      <h3>Recovery &amp; replay</h3>
      {recovery ? (
        <>
          <p style={{ fontSize: 13 }}>
            <Dot status={displayValue(rec.integrity)} />
            {displayValue(rec.explanation)}
          </p>
          <p className="admin-muted" style={{ fontSize: 12 }}>
            Sources rebuildable: {displayValue(coverage.covered)}/{displayValue(coverage.total)} · corrupt rows: {displayValue(rec.corrupt)}
          </p>
          <div style={{ fontSize: 12, overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>skill</th>
                  <th>observations</th>
                  <th>last event</th>
                  <th>state hash</th>
                  <th>age (d)</th>
                </tr>
              </thead>
              <tbody>
                {asList(rec.rows).map((item, index) => {
                  const row = asRecord(item);
                  return (
                    <tr key={index}>
                      <td>{displayValue(row.skill)}</td>
                      <td>{displayValue(row.observations)}</td>
                      <td>{displayValue(row.lastEventAt).slice(0, 10)}</td>
                      <td style={{ fontFamily: "monospace" }}>{displayValue(row.hash).slice(0, 16)}</td>
                      <td>{displayValue(row.ageDays)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p>Recovery endpoint unavailable.</p>
      )}
      <button type="button" onClick={onReplay} style={{ margin: "10px 8px 0 0" }}>
        Validate recovery (replay, read-only)
      </button>
      <input value={replayUser} onChange={(e) => onReplayUser(e.target.value)} placeholder="user id (optional)" />
      <div style={{ marginTop: 10 }}>
        {typeof replay === "string" ? (
          <p>{replay}</p>
        ) : replay ? (
          <ReplayBody payload={asRecord(replay)} />
        ) : null}
      </div>
    </section>
  );
}

function ReplayBody({ payload }: { payload: Record<string, unknown> }) {
  return (
    <>
      <p style={{ fontSize: 13 }}>
        <Dot status={payload.differing === 0 ? "green" : "red"} />
        {displayValue(payload.identical)} identical · {displayValue(payload.differing)} differing · {displayValue(payload.missing)} missing — {displayValue(payload.observationsProcessed)} observations in {displayValue(payload.durationMs)} ms. {displayValue(payload.note)}
      </p>
      <div style={{ fontSize: 12, overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>learner|skill</th>
              <th>status</th>
              <th>applied</th>
              <th>live hash</th>
              <th>rebuilt hash</th>
              <th>differing fields</th>
            </tr>
          </thead>
          <tbody>
            {asList(payload.rows).map((item, index) => {
              const row = asRecord(item);
              return (
                <tr key={index}>
                  <td>{displayValue(row.key)}</td>
                  <td>{displayValue(row.status)}</td>
                  <td>{displayValue(row.applied)}</td>
                  <td style={{ fontFamily: "monospace" }}>{displayValue(row.liveHash).slice(0, 12)}</td>
                  <td style={{ fontFamily: "monospace" }}>{displayValue(row.rebuiltHash).slice(0, 12)}</td>
                  <td>{asList(row.fields).join(", ")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function AdminCompare({ payload, onExport }: { payload: unknown; onExport: () => void }) {
  const rec = asRecord(payload);
  const summary = asRecord(rec.summary);
  return (
    <section className="admin-card">
      <h3>Compare — Legacy vs V2</h3>
      <button type="button" onClick={onExport} style={{ float: "right" }}>
        Export CSV
      </button>
      {!payload ? (
        <p>Compare endpoint unavailable.</p>
      ) : !asList(rec.rows).length ? (
        <p className="admin-muted" style={{ fontSize: 12 }}>No difference records yet. COMPARE has not observed traffic.</p>
      ) : (
        <>
          <p className="admin-muted" style={{ fontSize: 12 }}>
            {displayValue(summary.n)} records · worst {displayValue(summary.worst)} · median {displayValue(summary.median)} · {displayValue(summary.overNoticeable)} above the {displayValue(summary.noticeableThreshold)} threshold a learner would notice.
          </p>
          <div style={{ fontSize: 12, overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th />
                  <th>skill</th>
                  <th>legacy</th>
                  <th>V2</th>
                  <th>delta</th>
                  <th>meaning</th>
                </tr>
              </thead>
              <tbody>
                {asList(rec.rows).slice(0, 40).map((item, index) => {
                  const row = asRecord(item);
                  return (
                    <tr key={index}>
                      <td>
                        <Dot status={displayValue(row.severity)} />
                      </td>
                      <td>{displayValue(row.skill)}</td>
                      <td>{displayValue(row.legacy)}</td>
                      <td>{displayValue(row.v2)}</td>
                      <td>
                        <strong>{displayValue(row.delta)}</strong>
                      </td>
                      <td className="admin-muted">{displayValue(row.explanation)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

export function AdminTransition({ payload }: { payload: unknown }) {
  if (!payload) return (
    <section className="admin-card">
      <h3>Transition</h3>
      <p>Transition endpoint unavailable.</p>
    </section>
  );
  const rec = asRecord(payload);
  const census = asRecord(rec.census);
  return (
    <section className="admin-card">
      <h3>Transition</h3>
      <p style={{ fontSize: 13 }}>
        <Dot status={rec.active ? "amber" : "green"} />
        {rec.active ? "A migration is in progress." : "No learner is mid-migration; this panel has nothing to report."}
      </p>
      <p className="admin-muted" style={{ fontSize: 12 }}>
        legacy {displayValue(census.legacy)} · preview {displayValue(census.preview)} · switched {displayValue(census.switched)} · settled {displayValue(census.settled)} — {displayValue(census.noticeable)} would notice the change, {displayValue(census.notNoticeable)} would not.
      </p>
      <div style={{ fontSize: 12, overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>skill</th>
              <th>phase</th>
              <th>legacy</th>
              <th>V2</th>
              <th>delta</th>
              <th>noticeable</th>
              <th>rollback</th>
            </tr>
          </thead>
          <tbody>
            {asList(rec.rows).map((item, index) => {
              const row = asRecord(item);
              return (
                <tr key={index}>
                  <td>{displayValue(row.skill)}</td>
                  <td>{displayValue(row.phase)}</td>
                  <td>{displayValue(row.legacy)}</td>
                  <td>{displayValue(row.v2)}</td>
                  <td>{row.delta == null ? "—" : displayValue(row.delta)}</td>
                  <td>{row.noticeable ? "yes" : "no"}</td>
                  <td>{row.rollbackPossible ? "possible" : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function AdminCorpus({ payload }: { payload: unknown }) {
  if (!payload) {
    return (
      <section className="admin-card">
        <h3>Corpus</h3>
        <p>Corpus endpoint unavailable.</p>
      </section>
    );
  }
  const pools = asRecord(asRecord(payload).pools);
  return (
    <section className="admin-card">
      <h3>Corpus</h3>
      {Object.entries(pools).map(([name, value]) => {
        const pool = asRecord(value);
        const byLevel = asRecord(pool.byLevel);
        const coverage = asRecord(pool.coverage);
        const utilisation = asRecord(pool.utilisation);
        const exposure = asRecord(pool.exposure);
        const ageing = asRecord(pool.ageing);
        const discrimination = asRecord(pool.discrimination);
        return (
          <div key={name} style={{ borderTop: "1px solid var(--admin-line)", padding: "10px 0" }}>
            <strong>{name.replace(/_/g, " ")}</strong> <span className="admin-muted" style={{ fontSize: 12 }}>{displayValue(pool.total)} items</span>
            <div style={{ fontSize: 12, marginTop: 4 }}>
              <div>
                levels: {Object.entries(byLevel).map(([level, n]) => `${level}=${n}`).join(" · ")}
                {coverage.expectedLevels ? ` — coverage ${coverage.complete ? "complete" : "INCOMPLETE"}` : ""}
              </div>
              <div>
                utilisation: {Math.round(Number(utilisation.utilisationPct || 0) * 100)}% used · {displayValue(exposure.neverUsed)} never used · {displayValue(exposure.heavilyUsed)} above the 90th percentile ({displayValue(exposure.p90Uses)} uses)
              </div>
              <div>not used in {displayValue(ageing.staleDays)} days: {displayValue(ageing.notUsedInAYear)}</div>
              {exposure.note ? <div className="admin-muted">{displayValue(exposure.note)}</div> : null}
              <div className="admin-muted">discrimination: not available — {displayValue(discrimination.why)}</div>
            </div>
          </div>
        );
      })}
    </section>
  );
}

export function AdminSimulator({
  values,
  onChange,
  onRun,
  result,
  engineering,
}: {
  values: { correct: string; incorrect: string; itemLevel: string; daysSinceLast: string; constructs: string; examItems: string };
  onChange: (key: keyof typeof values, value: string) => void;
  onRun: () => void;
  result: unknown;
  engineering: boolean;
}) {
  const rec = asRecord(result);
  const product = asRecord(rec.product);
  const scale = asRecord(product.scale);
  return (
    <section className="admin-card">
      <h3>Simulator</h3>
      <p className="admin-muted" style={{ marginTop: -4 }}>Runs the certified engine on synthetic input. Writes nothing.</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "end", marginBottom: 10 }}>
        <label style={{ fontSize: 12 }}>
          correct
          <br />
          <input value={values.correct} onChange={(e) => onChange("correct", e.target.value)} style={{ width: 70 }} />
        </label>
        <label style={{ fontSize: 12 }}>
          incorrect
          <br />
          <input value={values.incorrect} onChange={(e) => onChange("incorrect", e.target.value)} style={{ width: 70 }} />
        </label>
        <label style={{ fontSize: 12 }}>
          item level
          <br />
          <input value={values.itemLevel} onChange={(e) => onChange("itemLevel", e.target.value)} style={{ width: 70 }} />
        </label>
        <label style={{ fontSize: 12 }}>
          days idle
          <br />
          <input value={values.daysSinceLast} onChange={(e) => onChange("daysSinceLast", e.target.value)} style={{ width: 70 }} />
        </label>
        <label style={{ fontSize: 12 }}>
          constructs
          <br />
          <input value={values.constructs} onChange={(e) => onChange("constructs", e.target.value)} style={{ width: 70 }} />
        </label>
        <label style={{ fontSize: 12 }}>
          exam items
          <br />
          <input value={values.examItems} onChange={(e) => onChange("examItems", e.target.value)} style={{ width: 70 }} />
        </label>
        <button type="button" onClick={onRun}>
          Simulate
        </button>
      </div>
      {result ? (
        <>
          <p style={{ fontSize: 14 }}>
            <strong>Level {displayValue(product.level)}</strong> · {displayValue(product.confidence)}{" "}
            <span className="admin-muted">— {displayValue(product.why)}</span>
          </p>
          <div style={{ fontSize: 12 }}>
            {asList(scale.steps).map((item, index) => {
              const step = asRecord(item);
              return (
                <div key={index} style={{ opacity: step.current ? 1 : 0.45 }}>
                  {step.current ? "▶" : "\u00a0"} {"█".repeat(Number(step.filled || 0))}
                  {"░".repeat(Math.max(0, 4 - Number(step.filled || 0)))} {displayValue(step.label)}
                </div>
              );
            })}
          </div>
          {asRecord(scale.nextStep).to ? (
            <p className="admin-muted" style={{ fontSize: 12 }}>
              Next: {displayValue(asRecord(scale.nextStep).to)} — {displayValue(asRecord(scale.nextStep).how)}
            </p>
          ) : null}
          {engineering ? (
            <pre style={{ fontSize: 11, background: "#0c1120", padding: 8, borderRadius: 6, overflowX: "auto" }}>
              {JSON.stringify(rec.engineering, null, 1)}
            </pre>
          ) : null}
        </>
      ) : null}
      {!result ? <Empty>Not run yet.</Empty> : null}
    </section>
  );
}
