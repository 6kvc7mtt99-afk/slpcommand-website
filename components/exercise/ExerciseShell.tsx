import Link from "next/link";

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
    <section className="exercise">
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
  return (
    <section className="exercise">
      <p className="section-eyebrow">{skill}</p>
      <h1>{title}</h1>
      <p className="muted">{lead}</p>
      <div className="skill-launch">
        {actions.map((action) => (
          <article key={action.href} className="home-card">
            <h2>{action.label}</h2>
            <p className="muted">{action.detail}</p>
            {action.disabled ? (
              <p className="muted">{action.disabledReason ?? "Not available on your current plan."}</p>
            ) : (
              <Link className="btn btn-primary" href={action.href}>
                {action.label}
              </Link>
            )}
          </article>
        ))}
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
