import Link from "next/link";

/**
 * The priority object.
 *
 * Both Intelligence's top mission and Academy's recommended lesson are the
 * same kind of thing: one item the backend selected from real evidence,
 * presented as the decision to act on rather than as one card in a row.
 * One component, so the two surfaces read as one system instead of each
 * inventing its own "important card" pattern.
 *
 * `evidence` is a sentence the caller composes from real fields — this
 * component only renders it, never derives copy from numbers itself, so
 * nothing here can drift into inventing a claim the backend didn't make.
 */
export function PriorityAction({
  eyebrow,
  title,
  detail,
  evidence,
  href,
  ctaLabel,
  secondaryHref,
  secondaryLabel,
}: {
  eyebrow: string;
  title: string;
  detail?: string;
  evidence?: string;
  href: string;
  ctaLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <div className="priority-action" data-reveal>
      <span className="priority-mark" aria-hidden="true" />
      <Link href={href} className="priority-body">
        <span className="p-eyebrow">{eyebrow}</span>
        <strong>{title}</strong>
        {detail ? <p>{detail}</p> : null}
        {evidence ? <p className="priority-why">{evidence}</p> : null}
        <span className="priority-go">
          {ctaLabel}
          <span className="p-arrow" aria-hidden="true">→</span>
        </span>
      </Link>
      {secondaryHref && secondaryLabel ? (
        <Link href={secondaryHref} className="priority-alt">
          {secondaryLabel}
          <span className="p-arrow" aria-hidden="true">→</span>
        </Link>
      ) : null}
    </div>
  );
}
