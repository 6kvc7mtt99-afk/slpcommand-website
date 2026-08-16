import { asList, asRecord, displayValue } from "@/lib/admin/format";
import { Empty } from "./AdminUi";

function Bar({ label, n, total, color }: { label: string; n: unknown; total: number; color: string }) {
  const count = Number(n ?? 0);
  const pct = total > 0 ? Math.round((100 * count) / total) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "2px 0", fontSize: 12 }}>
      <span style={{ width: 120, color: "var(--admin-muted)" }}>{label}</span>
      <span style={{ flex: 1, height: 8, background: "#0c1120", borderRadius: 4, overflow: "hidden" }}>
        <span style={{ display: "block", height: "100%", width: `${pct}%`, background: color }} />
      </span>
      <span style={{ width: 34, textAlign: "right" }}>{count}</span>
    </div>
  );
}

export function AdminV2({ data, engineering }: { data: unknown; engineering: boolean }) {
  if (!data) {
    return <p className="admin-muted">The V2 overview endpoint is not available on this deployment yet.</p>;
  }
  const rec = asRecord(data);
  const product = asRecord(rec.product);
  const eng = asRecord(rec.engineering);
  const headline = asRecord(product.headline);
  const health = asRecord(rec.health);
  const lights = asList(health.lights);
  const bySkill = asRecord(product.bySkill);
  const modes = Object.values(bySkill)
    .map((item) => asRecord(item).mode)
    .filter((value, index, all) => all.indexOf(value) === index);

  return (
    <section className="admin-card" id="v2Section">
      <h3>
        Proficiency engine — V2 <span className="admin-muted" style={{ textTransform: "none", fontWeight: 400, letterSpacing: 0 }}>· {modes.map(String).join(" / ")}</span>
      </h3>
      <p className="admin-muted" style={{ marginTop: -4 }}>
        {displayValue(headline.summary)} {displayValue(headline.measurementsHeld)} measurements held.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "12px 0" }}>
        {lights.map((item, index) => {
          const light = asRecord(item);
          const status = displayValue(light.status);
          const color = status === "green" ? "#16a34a" : status === "amber" ? "#d97706" : "#dc2626";
          return (
            <span
              key={index}
              className="admin-light"
              title={displayValue(light.detail)}
              style={{ border: `1px solid ${color}33`, background: `${color}14`, color }}
            >
              <span style={{ width: 8, height: 8, borderRadius: 99, background: color }} />
              {displayValue(light.id).replace(/_/g, " ")}
            </span>
          );
        })}
      </div>
      <div>
        {Object.keys(bySkill).map((skill) => {
          const s = asRecord(bySkill[skill]);
          const conf = asRecord(s.confidence);
          const fr = asRecord(s.freshness);
          const measured = Number(s.learnersMeasured ?? 0);
          return (
            <div key={skill} style={{ borderTop: "1px solid var(--admin-line)", padding: "12px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <strong style={{ textTransform: "capitalize" }}>{skill}</strong>
                <span className="admin-muted" style={{ fontSize: 12 }}>
                  {displayValue(s.mode)} · {measured} measured · {displayValue(s.learnersOnPreviousMethod)} on the previous method
                </span>
              </div>
              <p className="admin-muted" style={{ fontSize: 12, margin: "4px 0 8px" }}>{displayValue(s.modeExplained)}</p>
              <Bar label="Reliable" n={conf.reliable} total={measured} color="#16a34a" />
              <Bar label="Fairly reliable" n={conf.fairly_reliable} total={measured} color="#65a30d" />
              <Bar label="Limited evidence" n={conf.limited_evidence} total={measured} color="#0284c7" />
              <Bar label="Out of date" n={conf.out_of_date} total={measured} color="#d97706" />
              <div style={{ marginTop: 6 }}>
                <Bar label="Fresh" n={fr.fresh} total={measured} color="#16a34a" />
                <Bar label="Ageing" n={fr.ageing} total={measured} color="#d97706" />
                <Bar label="Stale" n={fr.stale} total={measured} color="#dc2626" />
              </div>
            </div>
          );
        })}
      </div>
      {engineering ? <AdminV2Engineering engineering={eng} calibration={asRecord(rec.calibration)} /> : null}
    </section>
  );
}

function AdminV2Engineering({
  engineering,
  calibration,
}: {
  engineering: Record<string, unknown>;
  calibration: Record<string, unknown>;
}) {
  const gate = asRecord(engineering.promotionGate);
  const rebuild = asRecord(engineering.rebuild);
  const bySkill = asRecord(engineering.bySkill);
  const criteria = asList(gate.criteria);
  const parameters = asList(calibration.parameters);
  const counts = asRecord(calibration.counts);
  const detailRows = Object.keys(bySkill).flatMap((skill) =>
    asList(asRecord(bySkill[skill]).detail).map((item) => ({ skill, row: asRecord(item) })),
  );

  return (
    <>
      <h4 style={{ margin: "16px 0 6px" }}>
        Promotion gate — {displayValue(gate.passed)}/{displayValue(gate.total)}
        {gate.eligible ? " · eligible" : ""}
      </h4>
      <div style={{ fontSize: 12 }}>
        {criteria.map((item, index) => {
          const c = asRecord(item);
          return (
            <div key={index} style={{ display: "flex", gap: 8, padding: "2px 0" }}>
              <span style={{ color: c.pass ? "#16a34a" : "#d97706", width: 44 }}>{c.pass ? "PASS" : "FAIL"}</span>
              <span style={{ width: 220 }}>{displayValue(c.id)}</span>
              <span className="admin-muted">measured {JSON.stringify(c.measured)} — {displayValue(c.required)}</span>
            </div>
          );
        })}
      </div>
      <h4 style={{ margin: "16px 0 6px" }}>Per-learner state</h4>
      <div style={{ fontSize: 12, overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>skill</th>
              <th>confidence</th>
              <th>limiting</th>
              <th>obs</th>
              <th>constructs</th>
              <th>exam</th>
              <th>days</th>
              <th>theta</th>
              <th>sigma²</th>
              <th>highest</th>
            </tr>
          </thead>
          <tbody>
            {detailRows.map((item, index) => {
              const eng = asRecord(item.row.engineering);
              return (
                <tr key={index}>
                  <td>{item.skill}</td>
                  <td>{displayValue(item.row.label)}</td>
                  <td>{displayValue(item.row.limitingFactor)}</td>
                  <td>{displayValue(item.row.observations)}</td>
                  <td>{displayValue(item.row.constructs)}</td>
                  <td>{displayValue(item.row.examItems)}</td>
                  <td>{displayValue(item.row.daysSinceLast)}</td>
                  <td>{displayValue(eng.theta)}</td>
                  <td>{displayValue(eng.sigma2)}</td>
                  <td>{displayValue(eng.highestEvidenced)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <h4 style={{ margin: "16px 0 6px" }}>Rebuild coverage</h4>
      <p style={{ fontSize: 12 }}>
        {displayValue(rebuild.covered)}/{displayValue(rebuild.total)} sources rebuildable
        {asList(rebuild.gaps).length ? ` · gaps: ${asList(rebuild.gaps).map((gap) => displayValue(asRecord(gap).source)).join(", ")}` : " · no gaps"}
      </p>
      <h4 style={{ margin: "16px 0 6px" }}>
        Calibration — {Object.entries(counts).map(([key, value]) => `${value} ${key}`).join(", ")}
      </h4>
      <div style={{ fontSize: 12 }}>
        {parameters.length ? (
          parameters.map((item, index) => {
            const p = asRecord(item);
            return (
              <details key={index} style={{ padding: "3px 0" }}>
                <summary>
                  <strong>{displayValue(p.key)}</strong>{" "}
                  <span className="admin-muted">
                    {displayValue(p.status)} · {displayValue(p.value)}
                  </span>
                </summary>
                <p style={{ margin: "4px 0 0 16px" }}>
                  {displayValue(p.whatItDoes)}
                  <br />
                  <span className="admin-muted">If it changed: {displayValue(p.ifItChanged)}</span>
                </p>
              </details>
            );
          })
        ) : (
          <Empty>No calibration parameters.</Empty>
        )}
      </div>
    </>
  );
}
