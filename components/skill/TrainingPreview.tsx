/**
 * Schematic previews of the real training interfaces.
 *
 * These are abstract renderings of the screen each destination actually
 * opens — a passage with an answer row, a transport with a waveform, an
 * editor with a word-count meter, a record ring. They carry no numbers
 * that could be mistaken for the learner's own results: every value is
 * a fixed, obviously-schematic constant, and nothing is read from or
 * implied about the account. That keeps the product honest (no invented
 * scores) while still showing what is behind each door instead of
 * describing it in a sentence.
 *
 * All server-rendered, no client JS, no images.
 */

export type PreviewKind =
  | "reading"
  | "reading-exam"
  | "listening"
  | "listening-exam"
  | "writing"
  | "writing-exam"
  | "speaking"
  | "speaking-exam"
  | "academy"
  | "intelligence"
  | "history"
  | "tools"
  | "coach";

/** Fixed bar heights — a drawn waveform, not sampled audio. */
const WAVE = [34, 52, 41, 68, 88, 62, 45, 74, 96, 70, 51, 38, 60, 82, 55, 40, 66, 47, 33, 58];
const LEVELS = [40, 72, 55, 90, 64, 46];
const BARS = [46, 70, 38, 92, 58];

function Lines({ widths, hi }: { widths: number[]; hi?: number }) {
  return (
    <>
      {widths.map((w, i) => (
        <div key={i} className={`p-prev-line${hi === i ? " hi" : ""}`} style={{ width: `${w}%` }} />
      ))}
    </>
  );
}

export function TrainingPreview({ kind }: { kind: PreviewKind }) {
  switch (kind) {
    case "reading":
    case "reading-exam":
      return (
        <div className="p-prev" aria-hidden="true">
          {kind === "reading-exam" ? <span className="p-timer">45:00</span> : null}
          <Lines widths={[68, 92, 84]} hi={1} />
          <div style={{ marginTop: 14 }}>
            <span className="p-prev-chip on" style={{ width: 62 }} />
            <span className="p-prev-chip" style={{ width: 48 }} />
            <span className="p-prev-chip" style={{ width: 54 }} />
          </div>
        </div>
      );

    case "listening":
    case "listening-exam":
      return (
        <div className="p-prev" aria-hidden="true">
          {kind === "listening-exam" ? <span className="p-timer">30:00</span> : null}
          <div className="p-wave">
            {WAVE.map((h, i) => (
              <i key={i} className={i < 8 ? "past" : ""} style={{ ["--h" as string]: `${h}%` }} />
            ))}
          </div>
          <div className="p-transport">
            <span className="p-play" />
            <span className="p-track">
              <i />
            </span>
            <span className="p-clock">0:38</span>
          </div>
        </div>
      );

    case "writing":
    case "writing-exam":
      return (
        <div className="p-prev" aria-hidden="true">
          {kind === "writing-exam" ? <span className="p-timer">70:00</span> : null}
          <Lines widths={[88, 96, 72]} />
          <div className="p-prev-line" style={{ width: "34%", marginBottom: 0 }} />
          <span className="p-caret" />
          <div className="p-meter">
            <i />
          </div>
          <div className="p-meta">
            <span>words</span>
            <span>target</span>
          </div>
        </div>
      );

    case "speaking":
    case "speaking-exam":
      return (
        <div className="p-prev" aria-hidden="true">
          {kind === "speaking-exam" ? <span className="p-timer">3 tasks</span> : null}
          <div className="p-rec">
            <span className="p-rec-ring">
              <span className="p-rec-dot" />
            </span>
            <span className="p-levels">
              {LEVELS.map((h, i) => (
                <i key={i} style={{ ["--h" as string]: `${h}%` }} />
              ))}
            </span>
          </div>
        </div>
      );

    case "coach":
      // Two parties taking turns, and the arc of a lesson under them. No
      // waveform: the Coach is a conversation, not a recording.
      return (
        <div className="p-prev" aria-hidden="true">
          <div className="p-turns">
            <span className="p-turn is-agent" />
            <span className="p-turn" />
            <span className="p-turn is-agent" />
          </div>
          <div className="p-arc">
            <i />
            <i className="on" />
            <i />
            <i />
          </div>
        </div>
      );

    case "academy":
      return (
        <div className="p-prev" aria-hidden="true">
          <div className="p-path">
            <div className="p-path-row">
              <span className="p-node done" />
              <span className="p-prev-line" style={{ width: "60%" }} />
            </div>
            <div className="p-path-row">
              <span className="p-node now" />
              <span className="p-prev-line hi" style={{ width: "80%" }} />
            </div>
            <div className="p-path-row">
              <span className="p-node" />
              <span className="p-prev-line" style={{ width: "52%" }} />
            </div>
            <div className="p-path-row">
              <span className="p-node" />
              <span className="p-prev-line" style={{ width: "68%" }} />
            </div>
          </div>
        </div>
      );

    case "intelligence":
      return (
        <div className="p-prev" aria-hidden="true">
          <div className="p-bars">
            {BARS.map((h, i) => (
              <i key={i} className={h === 92 ? "peak" : ""} style={{ ["--h" as string]: `${h}%` }} />
            ))}
          </div>
          <div style={{ marginTop: 12 }}>
            <div className="p-prev-line" style={{ width: "44%" }} />
            <div className="p-prev-line hi" style={{ width: "66%", marginBottom: 0 }} />
          </div>
        </div>
      );

    case "history":
      return (
        <div className="p-prev" aria-hidden="true">
          <div className="p-path">
            <div className="p-path-row">
              <span className="p-node done" />
              <span className="p-prev-line" style={{ width: "72%" }} />
            </div>
            <div className="p-path-row">
              <span className="p-node done" />
              <span className="p-prev-line" style={{ width: "58%" }} />
            </div>
            <div className="p-path-row">
              <span className="p-node done" />
              <span className="p-prev-line" style={{ width: "66%" }} />
            </div>
          </div>
        </div>
      );

    case "tools":
      return (
        <div className="p-prev" aria-hidden="true">
          <Lines widths={[62, 88]} hi={1} />
          <div style={{ marginTop: 12 }}>
            <span className="p-prev-chip on" style={{ width: 70 }} />
            <span className="p-prev-chip" style={{ width: 58 }} />
          </div>
          <div className="p-prev-line" style={{ width: "76%", marginTop: 8 }} />
        </div>
      );

    default:
      return null;
  }
}
