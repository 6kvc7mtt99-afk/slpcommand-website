import { asList, asRecord, displayValue, shortId } from "@/lib/admin/format";
import { Empty, Tile } from "./AdminUi";

function ModeStatus({ payload }: { payload: unknown }) {
  const rec = asRecord(payload);
  if (!payload || rec.__msError) {
    return (
      <p className="admin-muted" style={{ fontSize: 13 }}>
        Mode/validation status not available{rec.__msError ? ` (${displayValue(rec.__msError)})` : ""}. Expected until this backend build is deployed.
      </p>
    );
  }
  const validation = asRecord(rec.validation);
  const flagTxt = rec.shadowFlagEnabled ? `ON · ${displayValue(rec.rolloutPercent, "0")}%` : "OFF";
  return (
    <div className="admin-grid">
      <Tile value={displayValue(rec.mode)} label="Current mode" />
      <Tile value={rec.proficiencyV2Active ? "ACTIVE" : "inactive"} label="PROFICIENCY_V2" />
      <Tile value={flagTxt} label="Shadow flag · rollout" />
      <Tile value={displayValue(validation.status, "UNKNOWN")} label="Validation status" />
      <Tile value={displayValue(rec.algorithmVersion)} label="Algorithm version" />
      <Tile value={displayValue(rec.mappingVersion ?? rec.levelMapVersion)} label="Mapping version" />
      <Tile value={rec.legacyFallbackAvailable ? "yes" : "no"} label="Legacy fallback" />
    </div>
  );
}

function HBar({ buckets, labelFn }: { buckets: unknown; labelFn: (bucket: Record<string, unknown>) => string }) {
  const list = asList(buckets);
  if (!list.length) return <Empty>No data yet.</Empty>;
  const max = Math.max(1, ...list.map((item) => Number(asRecord(item).n || 0)));
  return (
    <>
      {list.map((item, index) => {
        const bucket = asRecord(item);
        const n = Number(bucket.n || 0);
        return (
          <div key={index} className="admin-hbar-row">
            <span className="admin-hbar-label">{labelFn(bucket)}</span>
            <div className="admin-hbar-track">
              <div className="admin-hbar-fill" style={{ width: `${Math.round((100 * n) / max)}%` }} />
            </div>
            <span className="admin-hbar-n">{n}</span>
          </div>
        );
      })}
    </>
  );
}

export function AdminPE({
  pe,
  ms,
  msListening,
  msWriting,
  msSpeaking,
}: {
  pe: unknown;
  ms: unknown;
  msListening: unknown;
  msWriting: unknown;
  msSpeaking: unknown;
}) {
  const rec = asRecord(pe);
  return (
    <section className="admin-section">
      <h3>
        Proficiency Engine <span className="admin-muted" style={{ textTransform: "none", fontWeight: 400, letterSpacing: 0 }}>{!rec.__peError && pe ? "· reading · shadow_v2" : ""}</span>
      </h3>
      <div className="admin-pe-sub">Control &amp; Validation · Reading</div>
      <ModeStatus payload={ms} />
      <div className="admin-pe-sub">Control &amp; Validation · Listening</div>
      <ModeStatus payload={msListening} />
      <div className="admin-pe-sub">Control &amp; Validation · Writing</div>
      <ModeStatus payload={msWriting} />
      <div className="admin-pe-sub">Control &amp; Validation · Speaking</div>
      <ModeStatus payload={msSpeaking} />
      {!pe || rec.__peError ? (
        <p className="admin-muted" style={{ fontSize: 13 }}>
          Proficiency Engine data not available{rec.__peError ? ` (${displayValue(rec.__peError)})` : ""}. This is expected until the IPS-003B migration is applied in this environment.
        </p>
      ) : (
        <PEBody pe={rec} />
      )}
    </section>
  );
}

function PEBody({ pe }: { pe: Record<string, unknown> }) {
  const summary = asRecord(pe.summary);
  const readiness = asRecord(pe.readiness);
  const convergence = asRecord(pe.convergence);
  const drift = asRecord(pe.drift);
  const driftStats = asRecord(drift.stats);
  const regime = asRecord(asRecord(pe.regimeShift).summary);
  const outliers = asRecord(pe.outliers);
  const outlierSummary = asRecord(outliers.summary);
  const op = asRecord(summary.operational);
  const integrity = asList(pe.integrity);
  const integrityPassing = integrity.filter((item) => asRecord(item).status === "PASS").length;
  const engineState = summary.featureFlagState ? `ON · ${displayValue(summary.rolloutPercent, "0")}%` : "OFF";
  const convergedPct = summary.usuariosAnalizados
    ? `${Math.round((100 * Number(summary.usuariosConvergidos || 0)) / Number(summary.usuariosAnalizados))}%`
    : "—";
  const glyph: Record<string, string> = { PASS: "✓", WARNING: "!", FAIL: "✕" };
  const color: Record<string, string> = { PASS: "var(--admin-green)", WARNING: "var(--admin-orange)", FAIL: "var(--admin-red)" };

  return (
    <div>
      <div className="admin-grid">
        <Tile value={engineState} label="Engine state (flag · rollout)" />
        <Tile value={readiness.score ?? "—"} label="Readiness score" />
        <Tile value={displayValue(pe.verdict).replace(/_/g, " ")} label="Verdict" />
        <Tile value={summary.eventosTotales} label="Events total" />
        <Tile value={summary.usuariosAnalizados} label="Users analyzed" />
        <Tile value={convergedPct} label="Converged" />
        <Tile value={driftStats.mean_abs ?? "—"} label="Drift mean |Δ|" />
        <Tile value={`${integrityPassing}/${integrity.length}`} label="Integrity checks passing" />
        <Tile value={summary.operational ? "ephemeral" : "—"} label="Operational data" />
        <Tile value={summary.generatedAt ? new Date(String(summary.generatedAt)).toLocaleString() : "—"} label="Last updated" />
      </div>

      <div className="admin-pe-sub">Readiness Score</div>
      {readiness.score == null && !asList(readiness.breakdown).length ? (
        <Empty>No readiness data.</Empty>
      ) : (
        <>
          <div className="admin-row" style={{ alignItems: "baseline" }}>
            <span className="admin-readiness-score">{displayValue(readiness.score)}</span>
            <span className={`admin-readiness-band admin-band-${displayValue(readiness.band)}`}>{displayValue(readiness.band).replace(/_/g, " ").toUpperCase()}</span>
          </div>
          <table style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>Points</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {asList(readiness.breakdown).map((item, index) => {
                const row = asRecord(item);
                const points = Number(row.points ?? 0);
                const tone = points > 0 ? "var(--admin-green)" : points < 0 ? "var(--admin-red)" : "var(--admin-muted)";
                return (
                  <tr key={index}>
                    <td style={{ color: tone, fontWeight: 700 }}>
                      {points > 0 ? "+" : ""}
                      {points}
                    </td>
                    <td>{displayValue(row.reason)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}

      <div className="admin-pe-sub">Convergence</div>
      <div className="admin-grid">
        <Tile value={asRecord(convergence.stability).users_stable} label="Stable users" />
        <Tile value={asRecord(convergence.stability).users_unstable} label="Unstable users" />
        <Tile value={asRecord(convergence.time).avg_events_to_converge ?? "—"} label="Avg. events to converge" />
        <Tile value={asRecord(convergence.time).users_fast_converge} label="Fast convergence" />
        <Tile value={asRecord(convergence.time).users_slow_converge} label="Slow convergence" />
        <Tile value={asRecord(convergence.time).users_without_convergence} label="Without convergence" />
      </div>
      <div className="admin-muted" style={{ fontSize: 12, margin: "12px 0 4px" }}>Theta distribution</div>
      <HBar buckets={convergence.thetaHistogram} labelFn={(b) => Number(b.bucket_lo).toFixed(2)} />
      <div className="admin-muted" style={{ fontSize: 12, margin: "12px 0 4px" }}>Sigma distribution</div>
      <HBar buckets={convergence.sigmaHistogram} labelFn={(b) => Number(b.bucket_lo).toFixed(2)} />

      <div className="admin-pe-sub">Drift — Shadow vs Current</div>
      <div className="admin-grid">
        <Tile value={driftStats.mean_signed ?? "—"} label="Mean drift (signed)" />
        <Tile value={driftStats.mean_abs ?? "—"} label="Mean drift (abs)" />
        <Tile value={driftStats.abs_p50 ?? "—"} label="p50 |Δ|" />
        <Tile value={driftStats.abs_p90 ?? "—"} label="p90 |Δ|" />
        <Tile value={driftStats.abs_p95 ?? "—"} label="p95 |Δ|" />
        <Tile value={driftStats.abs_p99 ?? "—"} label="p99 |Δ|" />
      </div>
      <div className="admin-muted" style={{ fontSize: 12, margin: "12px 0 4px" }}>Drift histogram (signed)</div>
      <HBar buckets={drift.histogram} labelFn={(b) => Number(b.bucket_lo).toFixed(2)} />
      {asList(drift.top).length ? (
        <>
          <div className="admin-muted" style={{ fontSize: 12, margin: "12px 0 4px" }}>Top divergences</div>
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Drift (signed)</th>
                <th>Drift (abs)</th>
              </tr>
            </thead>
            <tbody>
              {asList(drift.top).map((item, index) => {
                const row = asRecord(item);
                return (
                  <tr key={index}>
                    <td className="admin-muted">
                      <code>{shortId(row.userHash, 12)}</code>
                    </td>
                    <td>{displayValue(row.drift_signed)}</td>
                    <td>{displayValue(row.drift_abs)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      ) : (
        <Empty>No divergences recorded.</Empty>
      )}

      <div className="admin-pe-sub">Regime Shift</div>
      <div className="admin-grid">
        <Tile value={regime.detections_total ?? 0} label="Detections" />
        <Tile value={regime.users_with_regime_shift ?? 0} label="Users affected" />
        <Tile value={asRecord(pe.regimeShift).apparentFalsePositives ?? 0} label="Apparent false positives" />
      </div>

      <div className="admin-pe-sub">Outliers</div>
      <div className="admin-grid">
        <Tile value={outlierSummary.dampened_total ?? 0} label="Outliers dampened" />
        <Tile value={outlierSummary.users_with_outliers ?? 0} label="Users affected" />
        <Tile value={outlierSummary.mean_abs_impact ?? "—"} label="Mean abs impact" />
      </div>
      {asList(outliers.top).length ? (
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Outlier count</th>
            </tr>
          </thead>
          <tbody>
            {asList(outliers.top).map((item, index) => {
              const row = asRecord(item);
              return (
                <tr key={index}>
                  <td className="admin-muted">
                    <code>{shortId(row.userHash, 12)}</code>
                  </td>
                  <td>{displayValue(row.outlier_count)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <Empty>No outliers recorded.</Empty>
      )}

      <div className="admin-pe-sub">Integrity</div>
      {integrity.length ? (
        <table>
          <thead>
            <tr>
              <th>Check</th>
              <th>Status</th>
              <th>Findings</th>
            </tr>
          </thead>
          <tbody>
            {integrity.map((item, index) => {
              const row = asRecord(item);
              const status = displayValue(row.status);
              return (
                <tr key={index}>
                  <td>{displayValue(row.label)}</td>
                  <td style={{ color: color[status] || "var(--admin-muted)", fontWeight: 700 }}>
                    {glyph[status] || "?"} {status}
                  </td>
                  <td>{displayValue(row.findingCount)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <Empty>No integrity data.</Empty>
      )}

      <div className="admin-pe-sub">Telemetry</div>
      {op.note || Object.keys(op).length ? (
        <>
          {op.note ? <div className="admin-warn" style={{ marginBottom: 10 }}>{displayValue(op.note)}</div> : null}
          <div className="admin-grid">
            <Tile value={op.rpcSuccessRate != null ? `${(100 * Number(op.rpcSuccessRate)).toFixed(1)}%` : "—"} label="RPC success (ephemeral)" />
            <Tile value={op.rpcErrorRate != null ? `${(100 * Number(op.rpcErrorRate)).toFixed(1)}%` : "—"} label="RPC error (ephemeral)" />
            <Tile value={op.shadowAppliedRate != null ? `${(100 * Number(op.shadowAppliedRate)).toFixed(1)}%` : "—"} label="Applied (ephemeral)" />
            <Tile value={op.shadowSkippedRate != null ? `${(100 * Number(op.shadowSkippedRate)).toFixed(1)}%` : "—"} label="Skipped (ephemeral)" />
            <Tile value={op.latencyP50 != null ? `${Number(op.latencyP50).toFixed(1)}ms` : "—"} label="Latency p50 (ephemeral)" />
            <Tile value={op.latencyP95 != null ? `${Number(op.latencyP95).toFixed(1)}ms` : "—"} label="Latency p95 (ephemeral)" />
            <Tile value={op.latencyP99 != null ? `${Number(op.latencyP99).toFixed(1)}ms` : "—"} label="Latency p99 (ephemeral)" />
          </div>
        </>
      ) : (
        <Empty>No operational telemetry yet.</Empty>
      )}

      <div className="admin-pe-sub">Recommendations</div>
      {asList(pe.recommendations).length ? (
        asList(pe.recommendations).map((item, index) => {
          const row = asRecord(item);
          return (
            <div key={index} className={`admin-rec-item admin-rec-${displayValue(row.severity, "info")}`}>
              {displayValue(row.message)}
            </div>
          );
        })
      ) : (
        <Empty>No recommendations.</Empty>
      )}
    </div>
  );
}
