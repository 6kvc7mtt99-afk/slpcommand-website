import { asList, asRecord, displayValue } from "@/lib/admin/format";
import { Dot } from "./AdminUi";

function time(value: unknown) {
  return value ? (
    <span style={{ fontFamily: "monospace", fontSize: 11 }}>{String(value).slice(0, 19).replace("T", " ")}</span>
  ) : (
    <span className="admin-muted">—</span>
  );
}

function absent(value: unknown) {
  const rec = asRecord(value);
  return (
    <>
      <span className="admin-muted">not retained</span>{" "}
      <span style={{ fontSize: 11, color: "var(--admin-muted)" }}>— {displayValue(rec.why)}</span>
    </>
  );
}

export function AdminTrainer({
  learners,
  hint,
  userId,
  minutes,
  onUserId,
  onMinutes,
  onDiagnose,
  pipeline,
  loading,
}: {
  learners: unknown[];
  hint: string;
  userId: string;
  minutes: string;
  onUserId: (value: string) => void;
  onMinutes: (value: string) => void;
  onDiagnose: () => void;
  pipeline: unknown;
  loading: boolean;
}) {
  const p = asRecord(pipeline);
  const diagnose = asRecord(p.diagnose);
  return (
    <section className="admin-card">
      <h3>Trainer pipeline</h3>
      <p className="admin-muted" style={{ marginTop: -4 }}>Why this learner is being told this, today. Read-only.</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "end", marginBottom: 10 }}>
        <label style={{ fontSize: 12 }}>
          learner
          <br />
          <input list="tpLearners" value={userId} onChange={(e) => onUserId(e.target.value)} placeholder="user id" style={{ minWidth: 290 }} />
          <datalist id="tpLearners">
            {learners.map((item) => {
              const learner = asRecord(item);
              return (
                <option key={displayValue(learner.userId)} value={displayValue(learner.userId)}>
                  {asList(learner.skills).join(", ")} · {displayValue(learner.observations)} obs · {displayValue(learner.lastEventAt).slice(0, 10)}
                </option>
              );
            })}
          </datalist>
        </label>
        <label style={{ fontSize: 12 }}>
          minutes
          <br />
          <input type="number" value={minutes} min={5} max={120} onChange={(e) => onMinutes(e.target.value)} style={{ width: 70 }} />
        </label>
        <button type="button" onClick={onDiagnose}>
          Diagnose Trainer Pipeline
        </button>
      </div>
      <p className="admin-muted" style={{ fontSize: 12 }}>{hint}</p>
      {diagnose.status ? <TrainerDiagnose diagnose={diagnose} /> : null}
      {loading ? <p className="admin-muted">Loading…</p> : pipeline ? <TrainerBody payload={p} /> : null}
    </section>
  );
}

function TrainerDiagnose({ diagnose }: { diagnose: Record<string, unknown> }) {
  const counts = asRecord(diagnose.counts);
  return (
    <div>
      <p style={{ fontSize: 13, margin: "0 0 6px" }}>
        <Dot status={displayValue(diagnose.status)} />
        <strong>{displayValue(diagnose.headline)}</strong>
        <span className="admin-muted">
          {" "}
          · {displayValue(counts.ok)} OK · {displayValue(counts.warnings)} warning · {displayValue(counts.errors)} error
        </span>
      </p>
      <div style={{ fontSize: 12, overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>stage</th>
              <th>status</th>
              <th>detail</th>
            </tr>
          </thead>
          <tbody>
            {asList(diagnose.checks).map((item, index) => {
              const check = asRecord(item);
              return (
                <tr key={index}>
                  <td>
                    <strong>{displayValue(check.label)}</strong>
                  </td>
                  <td>
                    <Dot status={displayValue(check.status)} />
                    {displayValue(check.status)}
                  </td>
                  <td>
                    {displayValue(check.detail)}
                    {check.action ? (
                      <>
                        <br />
                        <span style={{ color: "#0284c7" }}>→ {displayValue(check.action)}</span>
                      </>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TrainerBody({ payload }: { payload: Record<string, unknown> }) {
  if (payload.available === false) {
    return <p className="admin-muted">{displayValue(payload.why, "Nothing to show.")}</p>;
  }
  const mission = asRecord(payload.mission);
  const session = asRecord(payload.session);
  const prediction = asRecord(payload.prediction);
  const recovery = asRecord(payload.recovery);
  const difficulty = asRecord(payload.difficulty);
  const pipeline = asRecord(payload.pipeline);
  const coach = asRecord(payload.coach);
  const roi = asRecord(payload.roi);
  const intelligence = asRecord(coach.intelligence);

  return (
    <div>
      <h4 style={{ margin: "16px 0 6px" }}>Today mission</h4>
      <p style={{ fontSize: 14, margin: 0 }}>
        <strong>{displayValue(mission.objective)}</strong>
        <span className="admin-muted"> · {displayValue(mission.priority)}</span>
      </p>
      <p style={{ fontSize: 12, color: "var(--admin-muted)", margin: "4px 0" }}>{displayValue(mission.reason)}</p>
      <p style={{ fontSize: 12, color: "var(--admin-muted)", margin: "4px 0" }}>
        {displayValue(mission.priorityWhy)} <em>Status: {displayValue(mission.status)}.</em>
      </p>

      <h4 style={{ margin: "16px 0 6px" }}>Adaptive session</h4>
      <p style={{ fontSize: 12, margin: "0 0 4px" }}>
        {displayValue(session.estimatedMinutes)} of {displayValue(session.requestedMinutes)} minutes planned
        {session.unusedMinutes ? ` · ${displayValue(session.unusedMinutes)} unused` : ""}
      </p>
      <div style={{ fontSize: 12, overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>skill</th>
              <th>min</th>
              <th>mode</th>
              <th>posture</th>
              <th>why this block</th>
            </tr>
          </thead>
          <tbody>
            {asList(session.plan).map((item, index) => {
              const block = asRecord(item);
              return (
                <tr key={index}>
                  <td>{displayValue(block.order)}</td>
                  <td>
                    <strong>{displayValue(block.skill)}</strong>
                  </td>
                  <td>{displayValue(block.minutes)}</td>
                  <td>{displayValue(block.mode)}</td>
                  <td>{displayValue(block.posture)}</td>
                  <td>{displayValue(block.why)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="admin-muted" style={{ fontSize: 11, margin: "6px 0" }}>{displayValue(session.orderRule)}</p>
      {asList(session.skillsSkipped).length ? (
        <ul style={{ margin: "4px 0", paddingLeft: 18, fontSize: 12 }}>
          {asList(session.skillsSkipped).map((item, index) => {
            const skip = asRecord(item);
            return (
              <li key={index}>
                <strong>{displayValue(skip.skill)}</strong> can wait — {displayValue(skip.why)}
              </li>
            );
          })}
        </ul>
      ) : null}

      <h4 style={{ margin: "16px 0 6px" }}>Prediction</h4>
      <div style={{ fontSize: 12, overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>skill</th>
              <th>now</th>
              <th>expected</th>
              <th>items</th>
              <th>changes</th>
            </tr>
          </thead>
          <tbody>
            {asList(prediction.perBlock).map((item, index) => {
              const block = asRecord(item);
              const current = asRecord(block.current);
              const expected = asRecord(block.expected);
              return (
                <tr key={index}>
                  <td>{displayValue(block.skill)}</td>
                  <td>
                    {displayValue(current.confidenceLabel)}
                    {current.level != null ? ` · ${Number(current.level).toFixed(2)}` : ""}
                  </td>
                  <td>
                    {displayValue(expected.confidenceLabel)}
                    {expected.level != null ? ` · ${Number(expected.level).toFixed(2)}` : ""}
                  </td>
                  <td>{displayValue(block.itemsExpected)}</td>
                  <td>
                    {asList(block.changes).map((change, changeIndex) => {
                      const c = asRecord(change);
                      return (
                        <span key={changeIndex}>
                          {c.certain ? "✓" : "○"} {displayValue(c.text)}
                          <br />
                        </span>
                      );
                    })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 12, margin: "6px 0" }}>
        <strong>Pass probability:</strong> {prediction.passProbability == null ? <span className="admin-muted">none</span> : displayValue(prediction.passProbability)}
        <br />
        <span style={{ fontSize: 11, color: "var(--admin-muted)" }}>{displayValue(prediction.passProbabilityWhy)}</span>
      </p>
      <details style={{ fontSize: 11 }}>
        <summary className="admin-muted">Limitations of this prediction</summary>
        <ul style={{ margin: "4px 0", paddingLeft: 18 }}>
          {asList(prediction.limitations).map((item, index) => (
            <li key={index}>{displayValue(item)}</li>
          ))}
        </ul>
      </details>

      <h4 style={{ margin: "16px 0 6px" }}>Confidence</h4>
      <div style={{ fontSize: 12, overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>skill</th>
              <th>state</th>
              <th>position</th>
              <th>obs</th>
              <th>days</th>
              <th>why</th>
              <th>how to improve</th>
            </tr>
          </thead>
          <tbody>
            {asList(payload.confidence).map((item, index) => {
              const row = asRecord(item);
              return (
                <tr key={index}>
                  <td>{displayValue(row.skill)}</td>
                  <td>
                    <strong>{displayValue(row.label)}</strong>
                  </td>
                  <td>
                    {Number(row.position ?? 0) + 1} of {displayValue(row.total)}
                  </td>
                  <td>{displayValue(row.observations)}</td>
                  <td>{displayValue(row.daysSinceLast)}</td>
                  <td>{displayValue(row.why)}</td>
                  <td style={{ color: "#0284c7" }}>{displayValue(row.howToImprove)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h4 style={{ margin: "16px 0 6px" }}>Recovery</h4>
      <p style={{ fontSize: 12, margin: "0 0 4px" }}>{displayValue(recovery.summary)}</p>
      {(["recovering", "recovered", "expired", "needsNewEvidence"] as const).map((key) =>
        asList(recovery[key]).length ? (
          <p key={key} style={{ fontSize: 12, margin: "4px 0" }}>
            <strong>{key}</strong>
            <ul style={{ margin: "4px 0", paddingLeft: 18 }}>
              {asList(recovery[key]).map((item, index) => {
                const row = asRecord(item);
                return (
                  <li key={index}>
                    {displayValue(row.skill)} — {displayValue(row.why)}
                  </li>
                );
              })}
            </ul>
          </p>
        ) : null,
      )}

      <h4 style={{ margin: "16px 0 6px" }}>ROI</h4>
      <p style={{ fontSize: 12, margin: 0 }}>{displayValue(roi.why)}</p>
      {asList(roi.postpone).length ? (
        <p style={{ fontSize: 12, margin: "4px 0" }}>
          <strong>Worth postponing</strong>
          <ul style={{ margin: "4px 0", paddingLeft: 18 }}>
            {asList(roi.postpone).map((item, index) => {
              const row = asRecord(item);
              return (
                <li key={index}>
                  {displayValue(row.skill)} — {displayValue(asList(row.because)[0])}
                </li>
              );
            })}
          </ul>
        </p>
      ) : null}

      <h4 style={{ margin: "16px 0 6px" }}>Difficulty</h4>
      <p style={{ fontSize: 12, margin: 0 }}>
        Intensity <strong>{displayValue(difficulty.intensity)}</strong> · cognitive load <strong>{displayValue(difficulty.cognitiveLoad)}</strong> · {displayValue(difficulty.productionMinutes)} min production / {displayValue(difficulty.receptionMinutes)} min reception
      </p>
      <p style={{ fontSize: 12, color: "var(--admin-muted)", margin: "4px 0" }}>{displayValue(difficulty.why)}</p>
      <p style={{ fontSize: 11, color: "var(--admin-muted)", margin: "4px 0" }}>
        {displayValue(difficulty.cognitiveLoadWhy)}
        <br />
        <strong>Fatigue:</strong> {displayValue(difficulty.fatigueWhy)}
      </p>

      <h4 style={{ margin: "16px 0 6px" }}>Coach</h4>
      <p style={{ fontSize: 13, margin: 0 }}>{displayValue(coach.served)}</p>
      <p style={{ fontSize: 11, color: "var(--admin-muted)", margin: "4px 0" }}>
        {displayValue(coach.why)}
        <br />
        Produced by <code>{displayValue(coach.engine)}</code>
      </p>
      {asList(intelligence.findings).length ? (
        <details style={{ fontSize: 12 }}>
          <summary className="admin-muted">Intelligence findings served alongside it</summary>
          <ul style={{ margin: "4px 0", paddingLeft: 18 }}>
            {asList(intelligence.findings).map((item, index) => {
              const finding = asRecord(item);
              return (
                <li key={index}>
                  <strong>{displayValue(finding.question)}</strong>
                  <br />
                  {displayValue(finding.answer)}
                </li>
              );
            })}
          </ul>
        </details>
      ) : null}

      <h4 style={{ margin: "16px 0 6px" }}>Pipeline</h4>
      <div style={{ fontSize: 12, overflowX: "auto" }}>
        <table>
          <tbody>
            <tr>
              <td className="admin-muted">generated at</td>
              <td>{time(pipeline.generatedAt)}</td>
            </tr>
            <tr>
              <td className="admin-muted">cache key</td>
              <td>
                <span style={{ fontFamily: "monospace", fontSize: 11 }}>{displayValue(pipeline.cacheKey)}</span>
              </td>
            </tr>
            <tr>
              <td className="admin-muted">cache age</td>
              <td>
                <span className="admin-muted">n/a ({displayValue(pipeline.cacheScope)})</span>{" "}
                <span style={{ fontSize: 11, color: "var(--admin-muted)" }}>— {displayValue(pipeline.cacheAgeWhy)}</span>
              </td>
            </tr>
            <tr>
              <td className="admin-muted">last refresh</td>
              <td>
                {time(pipeline.lastRefresh)} <span style={{ fontSize: 11, color: "var(--admin-muted)" }}>{displayValue(pipeline.lastRefreshNote)}</span>
              </td>
            </tr>
            <tr>
              <td className="admin-muted">last training</td>
              <td>{time(pipeline.lastTraining)}</td>
            </tr>
            <tr>
              <td className="admin-muted">last state write</td>
              <td>{time(pipeline.lastStateWrite)}</td>
            </tr>
            <tr>
              <td className="admin-muted">last plan change</td>
              <td>
                {time(pipeline.lastPlanChange)} <span style={{ fontSize: 11, color: "var(--admin-muted)" }}>{displayValue(pipeline.lastPlanChangeNote)}</span>
              </td>
            </tr>
            <tr>
              <td className="admin-muted">last invalidation</td>
              <td>
                {time(pipeline.lastInvalidation)} <span style={{ fontSize: 11, color: "var(--admin-muted)" }}>{displayValue(pipeline.lastInvalidationBy)}</span>
              </td>
            </tr>
            <tr>
              <td className="admin-muted">last confidence change</td>
              <td>{absent(pipeline.lastConfidenceChange)}</td>
            </tr>
            <tr>
              <td className="admin-muted">last level change</td>
              <td>{absent(pipeline.lastLevelChange)}</td>
            </tr>
            <tr>
              <td className="admin-muted">last recovery change</td>
              <td>{absent(pipeline.lastRecoveryChange)}</td>
            </tr>
            <tr>
              <td className="admin-muted">last transition</td>
              <td>{absent(pipeline.lastTransition)}</td>
            </tr>
            <tr>
              <td className="admin-muted">source</td>
              <td>{displayValue(pipeline.source)}</td>
            </tr>
            <tr>
              <td className="admin-muted">rows inspected</td>
              <td>
                {displayValue(pipeline.rowsInspected)} · {asList(pipeline.skillsWithState).join(", ") || "none"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
