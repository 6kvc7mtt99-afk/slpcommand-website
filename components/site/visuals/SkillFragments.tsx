/**
 * Small, faithful fragments of each skill's product surface. Abstracted, not
 * screenshots: the point is to show the shape of the training, not to paste
 * an interface into a browser frame. All values illustrative.
 */

export function ReadingFragment() {
  return (
    <div className="skill-frag" aria-hidden="true">
      <div className="skill-frag-kicker">
        <span>
          <b>Practice</b> · Level 3 item
        </span>
        <span>1 of 10 this week</span>
      </div>
      <div className="frag-lines">
        <i style={{ ["--w" as string]: "96%" } as React.CSSProperties} />
        <i className="hi" style={{ ["--w" as string]: "78%" } as React.CSSProperties} />
        <i style={{ ["--w" as string]: "88%" } as React.CSSProperties} />
      </div>
      <p className="frag-q">Where does the order require the section to report?</p>
      <div className="frag-options">
        <span className="frag-option">
          <span className="k">A</span> The vehicle depot
        </span>
        <span className="frag-option is-correct">
          <span className="k">B</span> The assembly point named in paragraph 2
        </span>
        <span className="frag-option">
          <span className="k">C</span> The main gate
        </span>
      </div>
      <p className="frag-note">
        <b>Explanation.</b> The depot is where vehicles are drawn; the order names the assembly point for personnel.
      </p>
    </div>
  );
}

export function ListeningFragment() {
  return (
    <div className="skill-frag" aria-hidden="true">
      <div className="skill-frag-kicker">
        <span>
          <b>Exam simulation</b> · stage 1
        </span>
        <span>No transcript</span>
      </div>
      <div className="frag-audio">
        <span className="frag-play">
          <svg viewBox="0 0 16 16" fill="currentColor">
            <path d="M4 2.5v11l9-5.5z" />
          </svg>
        </span>
        <span className="frag-track">
          <span className="frag-track-bar" />
          <span className="frag-clock">
            <span>0:42</span>
            <span>1:58</span>
          </span>
        </span>
      </div>
      <p className="frag-q">What did the speaker ask the platoon to confirm?</p>
      <div className="frag-options">
        <span className="frag-option">
          <span className="k">A</span> The grid reference
        </span>
        <span className="frag-option">
          <span className="k">B</span> The time of the move
        </span>
      </div>
      <p className="frag-note">
        <b>Policy.</b> Level 3: one play per item. Level 2: two. No seeking. Time limit derived from the audio selected.
      </p>
    </div>
  );
}

export function WritingFragment() {
  return (
    <div className="skill-frag" aria-hidden="true">
      <div className="skill-frag-kicker">
        <span>
          <b>Evaluation</b> · task: short report
        </span>
        <span>Level 3 target</span>
      </div>
      <div className="frag-verdict">
        <span className="s-tag s-tag--signal">Task · partly fulfilled</span>
        <p>Reports what happened; never recommends the change the brief asked for.</p>
      </div>
      <div className="frag-lines">
        <i style={{ ["--w" as string]: "100%" } as React.CSSProperties} />
        <i style={{ ["--w" as string]: "92%" } as React.CSSProperties} />
        <i className="hi" style={{ ["--w" as string]: "64%" } as React.CSSProperties} />
      </div>
      <p className="frag-note">
        <b>Examiner&rsquo;s write-up.</b> Accuracy holds throughout. The missing move is the recommendation — add it and the register is already right.
      </p>
    </div>
  );
}

export function SpeakingFragment() {
  const bars = [30, 55, 80, 62, 40, 72, 95, 58, 36, 66, 84, 48, 28, 52, 70, 44];
  return (
    <div className="skill-frag" aria-hidden="true">
      <div className="skill-frag-kicker">
        <span>
          <b>Practice</b> · task 2 · 1:40
        </span>
        <span>Transcribed</span>
      </div>
      <div className="frag-wave">
        {bars.map((h, i) => (
          <i key={i} style={{ ["--h" as string]: `${h}%` } as React.CSSProperties} />
        ))}
      </div>
      <div className="frag-criteria">
        <span className="frag-criterion is-met">
          Content <b>MET</b>
        </span>
        <span className="frag-criterion is-met">
          Task fulfilment <b>MET</b>
        </span>
        <span className="frag-criterion is-unmet">
          Accuracy <b>NOT YET</b>
        </span>
        <span className="frag-criterion is-met">
          Text produced <b>MET</b>
        </span>
      </div>
      <p className="frag-note">
        <b>Reasoning.</b> Errors in past-tense narration reach meaning twice; the level&rsquo;s standard asks for none that do.
      </p>
    </div>
  );
}
