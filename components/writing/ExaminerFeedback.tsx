import type { ExaminerResult } from "@/lib/api/writingTools";

function toneFor(severity: string): "critical" | "warn" | "calm" {
  const value = severity.trim().toLowerCase();
  if (value === "critical") return "critical";
  if (value === "recurrent" || value === "moderate") return "warn";
  return "calm";
}

/**
 * Renders the full real `/writing/sentence-feedback` response — summary,
 * per-sentence notes with the actual suggested rewrite, priority focus and
 * memorise-worthy phrases. The endpoint returns all four; only `summary`
 * and a flattened category/explanation list were ever shown, so `improved`
 * (the one field with a concrete fix, not just a diagnosis) and both list
 * fields were silently dropped. Shared by the standalone Examiner Vision
 * tool and Writing Practice's in-draft feedback panel — same real shape,
 * same rendering, two entry points.
 */
export function ExaminerFeedback({ result }: { result: ExaminerResult }) {
  return (
    <div className="examiner-feedback">
      {result.summary ? <p className="examiner-summary">{result.summary}</p> : null}
      {result.sentenceFeedback.length ? (
        <ul className="examiner-sentences">
          {result.sentenceFeedback.map((item, index) => {
            const tone = toneFor(item.severity);
            return (
              <li key={index} className={`examiner-sentence tone-${tone} p-reveal-item`} style={{ ["--i" as string]: index }}>
                <span className="examiner-sentence-bar" aria-hidden="true" />
                <div className="examiner-sentence-body">
                  {item.original ? <p className="examiner-original">&ldquo;{item.original}&rdquo;</p> : null}
                  <p className="examiner-note">
                    {item.category ? <em className={`intel-sev tone-${tone}`}>{item.category}</em> : null}
                    {item.explanation}
                  </p>
                  {item.improved ? (
                    <p className="examiner-improved">
                      <span className="p-arrow" aria-hidden="true">→</span> {item.improved}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
      {result.priorityFocus.length ? (
        <div className="examiner-block">
          <p className="home-kicker">Focus on next</p>
          <ul>
            {result.priorityFocus.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {result.memoriseThese.length ? (
        <div className="examiner-block">
          <p className="home-kicker">Worth memorising</p>
          <ul>
            {result.memoriseThese.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
