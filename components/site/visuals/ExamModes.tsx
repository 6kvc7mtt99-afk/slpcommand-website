/** Practice beside Exam: the two modes, side by side, so the difference is the visual. */
export function ExamModes() {
  return (
    <div className="modes" role="group" aria-label="Practice mode compared with exam mode">
      <div className="mode">
        <div className="mode-kicker">
          <span className="s-tag">Practice</span>
          <span className="s-tag">Untimed</span>
        </div>
        <h4>Learn from every item</h4>
        <ul>
          <li>One item at a time, at your target level</li>
          <li>Every answer explained</li>
          <li>Replay and seek allowed in Listening</li>
          <li>Writing and Speaking evaluated one task at a time</li>
        </ul>
      </div>
      <div className="mode mode--exam">
        <div className="mode-kicker">
          <span className="s-tag">Exam simulation</span>
          <span className="s-tag">SLP 3 format</span>
        </div>
        <p className="mode-clock" aria-label="Forty-eight minutes remaining">
          48:00 <small>remaining</small>
        </p>
        <ul>
          <li>Timed to the format of your target level</li>
          <li>No transcript; replay and seek policy applied</li>
          <li>Speaking: warm-up, preparation time, recorded tasks, examiner follow-ups</li>
          <li>Scored as one sitting, weighted more in your estimate</li>
        </ul>
      </div>
    </div>
  );
}
