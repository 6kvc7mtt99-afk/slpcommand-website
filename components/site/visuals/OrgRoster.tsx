/** A cohort view, abstracted. Students are anonymised placeholders, not people. */
const ROWS = [
  { name: "Student 01", slp: "2.4", weakest: "Listening", weakestSkill: "listening", last: "2 days ago" },
  { name: "Student 02", slp: "3.1", weakest: "Writing", weakestSkill: "writing", last: "today" },
  { name: "Student 03", slp: "2.8", weakest: "Speaking", weakestSkill: "speaking", last: "5 days ago" },
  { name: "Student 04", slp: "—", weakest: "No evidence", weakestSkill: null, last: "invited" },
];

export function OrgRoster() {
  return (
    <div className="org-roster" role="table" aria-label="Illustrative cohort view">
      <div className="org-roster-head" role="row">
        <span role="columnheader">Student</span>
        <span role="columnheader">Estimated SLP</span>
        <span role="columnheader">Weakest skill</span>
        <span role="columnheader">Active</span>
      </div>
      {ROWS.map((row) => (
        <div key={row.name} className="org-roster-row" role="row">
          <b role="cell">{row.name}</b>
          <span className="s-mono" role="cell">
            {row.slp}
          </span>
          <span role="cell" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            {row.weakestSkill ? <i className={`s-dot s-dot--${row.weakestSkill}`} aria-hidden="true" /> : null}
            {row.weakest}
          </span>
          <span className="s-mono" role="cell">
            {row.last}
          </span>
        </div>
      ))}
    </div>
  );
}
