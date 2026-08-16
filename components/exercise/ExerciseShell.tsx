import Link from "next/link";

export function skillClass(skill: string): string {
  const key = skill.trim().toLowerCase();
  if (key === "reading" || key === "listening" || key === "writing" || key === "speaking") {
    return `skill-${key}`;
  }
  return "";
}

export function ExerciseShell({
  skill,
  mode,
  title,
  children,
}: {
  skill: string;
  mode: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`exercise page-skill ${skillClass(skill)}`}>
      <p className="section-eyebrow">{skill}</p>
      <p className="home-kicker">{mode}</p>
      <h1>{title}</h1>
      {children}
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
  const primary = actions.find((action) => !action.disabled) ?? actions[0];
  const rest = actions.filter((action) => action !== primary);

  return (
    <section className={`exercise page-skill ${skillClass(skill)}`}>
      <header className="page-head">
        <p className="section-eyebrow">{skill}</p>
        <h1>{title}</h1>
        <p className="muted lead">{lead}</p>
      </header>
      <div className="skill-board">
        {primary ? (
          <article className="skill-primary">
            <p className="home-kicker">Start here</p>
            <h2>{primary.label}</h2>
            <p className="muted">{primary.detail}</p>
            {primary.disabled ? (
              <p className="muted">{primary.disabledReason ?? "Not available on your current plan."}</p>
            ) : (
              <Link className="btn btn-primary" href={primary.href}>
                {primary.label}
              </Link>
            )}
          </article>
        ) : null}
        <ul className="skill-destinations">
          {rest.map((action) => (
            <li key={action.href}>
              <strong>{action.label}</strong>
              <p className="muted">{action.detail}</p>
              {action.disabled ? (
                <p className="muted">{action.disabledReason ?? "Not available on your current plan."}</p>
              ) : (
                <Link className="btn btn-outline" href={action.href}>
                  {action.label}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function CommercialCard({
  title = "You have used the allowance on your current plan.",
  body = "Subscriptions are managed in the iOS app until web billing exists.",
}: {
  title?: string;
  body?: string;
}) {
  return (
    <article className="home-card home-pro-banner" role="status">
      <p className="home-kicker">Plan</p>
      <h2>{title}</h2>
      <p className="muted">{body}</p>
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
