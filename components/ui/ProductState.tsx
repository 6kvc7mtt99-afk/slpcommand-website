import Link from "next/link";

/**
 * ONE language for every non-content state in the authenticated product.
 *
 * THE PROBLEM THIS SOLVES. "This failed" had several visual identities
 * depending on which screen you were standing on — a hairline `.state-error`
 * block, an `article.home-card` with a kicker, a red `.err` one-liner, and a
 * `.plan-lock` card — and the distinction between them tracked which file the
 * author happened to be editing, not what had actually happened. Worse, one
 * component was doing two jobs: `EmptyAcademy` rendered both "the Academy is
 * unavailable right now" (an ERROR) and "no such lesson" (an EMPTY), so a
 * backend outage and a bad URL looked identical to the learner.
 *
 * Two axes, deliberately separate:
 *
 *   KIND  — what happened: loading | empty | error | locked
 *   SCOPE — how much of the screen it owns: inline | panel | page
 *
 * The old API had kind without scope, which is why every route that needed a
 * whole-screen state hand-rolled one.
 *
 *   inline  one or two lines under the control that produced it. No surface.
 *   panel   a block inside a stage: hairline, left mark, optional heading.
 *   page    the whole route body: eyebrow, h1, lead, actions. Keeps a heading
 *           and a way back, so a failure is never a dead end.
 *
 * Roles are DERIVED, never passed per-site — that is how they drifted before:
 *   error   → role="alert"        (interrupts; something needs attention now)
 *   loading → role="status" aria-busy
 *   empty   → role="status" polite
 *   locked  → role="status" polite (a plan boundary is information, not a fault)
 *
 * WHAT THIS IS NOT. It is not the plan boundary a learner hits head-on — that
 * is `CommercialCard` / `CommercialDialog`, which are deliberately more
 * elevated objects and whose exact copy the e2e suite pins. `kind="locked"`
 * here is the same boundary seen from a distance: in a list, on a hub, beside
 * a destination. They share the `lockReason` vocabulary and both lead to
 * /subscription.
 */
export type StateKind = "loading" | "empty" | "error" | "locked";
export type StateScope = "inline" | "panel" | "page";

/**
 * WHY something is locked, in the vocabulary `featureAccess` already returns.
 * `unknown` is the one that matters: the entitlements read failed, so the
 * product must not claim the learner lacks the feature.
 */
export type LockReason = "spent" | "notOnPlan" | "unknown";

export type StateAction =
  | { kind: "retry"; label?: string; onPress: () => void }
  | { kind: "link"; label: string; href: string };

const LOCK_CHIP: Record<LockReason, string> = {
  spent: "Used up",
  notOnPlan: "Locked",
  unknown: "Check failed",
};

function roleFor(kind: StateKind): { role: string; "aria-live"?: "polite"; "aria-busy"?: true } {
  if (kind === "error") return { role: "alert" };
  if (kind === "loading") return { role: "status", "aria-busy": true };
  return { role: "status", "aria-live": "polite" };
}

export function ProductState({
  kind,
  scope,
  title,
  body,
  detail,
  actions,
  lockReason,
  lines = 3,
}: {
  kind: StateKind;
  /** No default: every call site must decide how much screen it owns. */
  scope: StateScope;
  /** Required in practice for scope="page" — the route needs a heading. */
  title?: string;
  body: string;
  detail?: string;
  actions?: StateAction[];
  lockReason?: LockReason;
  lines?: number;
}) {
  const aria = roleFor(kind);
  const cls = `state state-${kind} is-${scope}`;

  const actionRow = actions?.length ? (
    <div className="cta-row state-actions">
      {actions.map((action, i) =>
        action.kind === "retry" ? (
          <button
            key={i}
            className={i === 0 ? "btn btn-primary" : "btn btn-outline"}
            type="button"
            onClick={action.onPress}
          >
            {action.label ?? "Try again"}
          </button>
        ) : (
          <Link key={i} className={i === 0 ? "btn btn-primary" : "btn btn-outline"} href={action.href}>
            {action.label}
          </Link>
        ),
      )}
    </div>
  ) : null;

  if (kind === "loading") {
    return (
      <div className={cls} {...aria}>
        <p className="muted">{body}</p>
        {Array.from({ length: lines }, (_, i) => (
          <div key={i} className={i === 0 ? "skel lg" : "skel"} />
        ))}
      </div>
    );
  }

  if (scope === "page") {
    return (
      <div className="state-page" {...aria}>
        <p className="section-eyebrow">{title ?? "SLP Command"}</p>
        <h1>{body}</h1>
        {detail ? <p className="muted">{detail}</p> : null}
        {actionRow}
      </div>
    );
  }

  if (scope === "inline") {
    return (
      <p className={cls} {...aria}>
        {body}
        {detail ? <span className="muted"> {detail}</span> : null}
      </p>
    );
  }

  return (
    <section className={cls} {...aria}>
      {kind === "locked" && lockReason ? <span className="state-chip">{LOCK_CHIP[lockReason]}</span> : null}
      {title ? <strong className="state-title">{title}</strong> : null}
      <p>{body}</p>
      {detail ? <p className="muted">{detail}</p> : null}
      {actionRow}
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   The Phase-2 API, kept as thin wrappers.
   These have call sites across every skill; rewriting all of them in one
   pass would be churn with no behavioural gain, and each is now a single
   expression over the component above — so there is exactly one
   implementation of each state even while two spellings exist.
   ──────────────────────────────────────────────────────────────────────── */

export function LoadingState({ label, lines = 3 }: { label: string; lines?: number }) {
  return <ProductState kind="loading" scope="panel" body={label} lines={lines} />;
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return <ProductState kind="empty" scope="panel" title={title} body={body} />;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <ProductState
      kind="error"
      scope="panel"
      body={message}
      actions={onRetry ? [{ kind: "retry", onPress: onRetry }] : undefined}
    />
  );
}
