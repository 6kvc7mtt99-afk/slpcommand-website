import { FREE_PLAN_QUOTAS } from "@/lib/conversion";

/**
 * The context column beside the signup and login forms.
 *
 * Every number here comes from `lib/conversion.ts`, which
 * `tests/unit/conversion.test.ts` pins to the live pricing section — so this
 * panel cannot drift into promising a quota the product does not give.
 */
export function AuthContext({ mode }: { mode: "signup" | "login" }) {
  const q = FREE_PLAN_QUOTAS;
  return (
    <aside className="auth-context">
      <p className="section-eyebrow">
        {mode === "signup" ? "Start free" : "Welcome back"}
      </p>
      <h2>
        {mode === "signup"
          ? "Measure the profile before the board does."
          : "Pick up where the evidence left off."}
      </h2>
      <p>
        {mode === "signup"
          ? "SLP Command trains Reading, Listening, Writing and Speaking against the constructs a STANAG 6001 / SLP sitting actually rates — at Levels 2 and 3."
          : "Your estimated SLP, your weakest digit and today’s mission are waiting where you left them."}
      </p>
      {mode === "signup" ? (
        <ul className="auth-facts">
          <li>
            <span className="fact-label">Reading practice</span>
            <span className="fact-value">{q.readingPerWeek} / week</span>
          </li>
          <li>
            <span className="fact-label">Listening practice</span>
            <span className="fact-value">{q.listeningPerWeek} / week</span>
          </li>
          <li>
            <span className="fact-label">Writing, AI-scored</span>
            <span className="fact-value">{q.writingPerMonth} / month</span>
          </li>
          <li>
            <span className="fact-label">Speaking, AI-scored</span>
            <span className="fact-value">{q.speakingPerMonth} / month</span>
          </li>
          <li>
            <span className="fact-label">Exam simulation</span>
            <span className="fact-value">{q.examPerMonth} / month</span>
          </li>
        </ul>
      ) : null}
      <p className="auth-note">
        {mode === "signup"
          ? "No card required. Independent trainer — not an official STANAG 6001 assessment."
          : "Independent trainer — not an official STANAG 6001 assessment."}
      </p>
    </aside>
  );
}
