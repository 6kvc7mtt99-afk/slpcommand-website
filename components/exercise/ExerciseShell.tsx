import Link from "next/link";

export function skillClass(skill: string): string {
  const key = skill.trim().toLowerCase();
  if (key === "reading" || key === "listening" || key === "writing" || key === "speaking") {
    return `skill-${key}`;
  }
  return "";
}

/** Modes that are a real assessment, not a browsing surface. */
function isExam(mode: string): boolean {
  const m = mode.trim().toLowerCase();
  return m.startsWith("exam") || m.startsWith("prompt ");
}

/**
 * The assessment environment.
 *
 * Every training screen in the product — reading/listening/writing/speaking,
 * practice and exam — renders through here, so this is the one place that
 * decides what taking a task feels like. Previously it emitted a bare
 * eyebrow + heading and let each screen stack its own content underneath,
 * which is why a task looked like a page with questions on it rather than
 * a session you had entered.
 *
 * It now frames the work: a sticky task bar that states the mode, the
 * skill, how far through you are and how long you have; the content as a
 * dedicated stage; and a way out that does not require the sidebar. The
 * app chrome recedes while a task is open (see .task-env in task.css), so
 * the exercise is the only thing on screen.
 *
 * PRACTICE and EXAM are deliberately different objects: practice carries
 * the skill's own colour and stays calm, exam switches to the assessment
 * accent and shows a live clock. A learner should never have to read text
 * to know which one they are in.
 */
export function ExerciseShell({
  skill,
  mode,
  title,
  children,
  layout = "page",
  showTitle = false,
  progress,
  toolbar,
  exitHref,
  exitLabel,
}: {
  skill: string;
  mode: string;
  title: string;
  children: React.ReactNode;
  layout?: "page" | "stage";
  showTitle?: boolean;
  /** Position in a multi-item task. Rendered only when the screen knows it. */
  progress?: { current: number; total: number } | null;
  /** Live controls that belong in the bar — an exam clock, typically. */
  toolbar?: React.ReactNode;
  exitHref?: string;
  exitLabel?: string;
}) {
  const key = skill.trim().toLowerCase();
  const exam = isExam(mode);
  const backHref = exitHref ?? (["reading", "listening", "writing", "speaking"].includes(key) ? `/${key}` : "/dashboard");

  return (
    <section className={`task-env ${skillClass(skill)} ${exam ? "is-exam" : "is-practice"}`}>
      <header className="task-bar">
        <div className="task-bar-lead">
          <Link className="task-exit" href={backHref}>
            <span className="task-exit-glyph" aria-hidden="true">←</span>
            <span>{exitLabel ?? `Exit ${key}`}</span>
          </Link>
          <span className="task-mode">
            <span className="task-mode-dot" aria-hidden="true" />
            {/* The bar used to hard-code "Practice" for everything that was
                not an exam, so History read as Practice and Coach — which
                spends Coach minutes, not the practice allowance — would have
                read as Practice too. Exam styling and the exam clock still key
                off isExam(); only the word shown is the caller's own. */}
            {exam ? "Exam" : mode}
          </span>
          <span className="task-skill">{skill}</span>
        </div>
        <div className="task-bar-trail">
          {progress && progress.total > 0 ? (
            <span className="task-progress">
              <span className="task-progress-text p-num">
                {progress.current} <i>/</i> {progress.total}
              </span>
              <span className="task-progress-track" aria-hidden="true">
                <i style={{ width: `${Math.min(100, (progress.current / progress.total) * 100)}%` }} />
              </span>
            </span>
          ) : null}
          {toolbar}
        </div>
      </header>

      <div className={`task-stage ${layout === "stage" ? "is-bleed" : ""}`}>
        <h1 className={showTitle ? "task-title" : "visually-hidden"}>{title}</h1>
        {children}
      </div>
    </section>
  );
}

export function SkillLaunch({
  skill,
  title,
  lead,
  actions,
}: {
  skill: string;
  title: string;
  lead: string;
  actions: Array<{ href: string; label: string; detail: string; disabled?: boolean; disabledReason?: string }>;
}) {
  const rank = (label: string) => {
    const key = label.toLowerCase();
    if (key === "practice") return 0;
    if (key === "exam") return 1;
    return 2;
  };
  const enabled = actions.filter((action) => !action.disabled);
  const primary = [...enabled].sort((a, b) => rank(a.label) - rank(b.label))[0] ?? actions[0];
  const rest = actions.filter((action) => action !== primary);

  return (
    <section className={`exercise page-skill skill-brief ${skillClass(skill)}`}>
      <header>
        <p className="section-eyebrow">{skill}</p>
        <h1>{title}</h1>
        <p className="muted lead">{lead}</p>
        {primary && !primary.disabled ? (
          <Link className="btn btn-primary btn-command" href={primary.href}>
            {primary.label}
          </Link>
        ) : primary?.disabled ? (
          <p className="muted">{primary.disabledReason ?? "Not available on your current plan."}</p>
        ) : null}
      </header>
      <ul className="skill-index">
        {rest.map((action) => (
          <li key={action.href}>
            {action.disabled ? (
              <>
                <strong>{action.label}</strong>
                <p className="muted">{action.detail}</p>
                <p className="muted">{action.disabledReason ?? "Not available on your current plan."}</p>
              </>
            ) : (
              <>
                <Link href={action.href}>{action.label}</Link>
                <p className="muted">{action.detail}</p>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * The plan boundary.
 *
 * Every caller supplies its own real reason — a spent weekly quota
 * reads differently from a feature the plan has never included, and
 * conflating them into one generic "upgrade" message would misstate
 * which one actually happened (see SkillHub's lockReason for the same
 * distinction on skill-hub entry points). This component only owns the
 * shared identity: a boundary is a boundary, wherever it's hit, and the
 * one honest, universal next step is the real plan page — not a
 * fabricated benefits list this component cannot verify per caller.
 */
export function CommercialCard({
  title = "You have used the allowance on your current plan.",
  body = "Subscriptions are managed in the iOS app until web billing exists.",
}: {
  title?: string;
  body?: string;
}) {
  return (
    <article className="plan-lock" role="status">
      <span className="plan-lock-mark" aria-hidden="true" />
      <p className="plan-lock-kicker">Plan boundary</p>
      <h2>{title}</h2>
      <p className="plan-lock-body">{body}</p>
      {/* One destination for every plan boundary in the product. It used to
          be Settings' usage meter, which answers "how much is left" but not
          "what am I on and what would change" — the question someone who just
          hit a wall is actually asking. */}
      <Link className="plan-lock-link" href="/subscription">
        See your plan
        <span className="p-arrow" aria-hidden="true">→</span>
      </Link>
    </article>
  );
}

export function FeedbackBanner({
  correct,
  explanation,
}: {
  correct: boolean;
  explanation: string;
}) {
  return (
    <div className={`feedback-banner ${correct ? "ok" : "bad"}`} role="status">
      <strong>{correct ? "Correct" : "Not quite"}</strong>
      {explanation ? <p>{explanation}</p> : null}
    </div>
  );
}
