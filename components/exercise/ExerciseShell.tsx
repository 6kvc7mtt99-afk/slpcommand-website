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
  layout = "page",
}: {
  skill: string;
  mode: string;
  title: string;
  children: React.ReactNode;
  layout?: "page" | "stage";
}) {
  if (layout === "stage") {
    return (
      <section className={`exercise page-skill ${skillClass(skill)}`}>
        <div className="stage-meta">
          <span>{skill}</span>
          <span>{mode}</span>
        </div>
        <h1 className="visually-hidden">{title}</h1>
        {children}
      </section>
    );
  }
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
