import Link from "next/link";

export function CommercialDialog({
  open,
  title = "This feature is not available on your current plan.",
  body = "Subscriptions are managed in the iOS app until web billing exists.",
  onClose,
}: {
  open: boolean;
  title?: string;
  body?: string;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="dialog-backdrop" role="dialog" aria-modal="true" aria-labelledby="commercial-title">
      <article className="plan-lock plan-lock-dialog">
        <span className="plan-lock-mark" aria-hidden="true" />
        <p className="plan-lock-kicker">Plan boundary</p>
        <h2 id="commercial-title">{title}</h2>
        <p className="plan-lock-body">{body}</p>
        <div className="cta-row" style={{ marginTop: 18 }}>
          <button className="btn btn-primary" type="button" onClick={onClose}>
            Close
          </button>
          <Link className="plan-lock-link" href="/profile#plan" onClick={onClose}>
            View plan &amp; usage
            <span className="p-arrow" aria-hidden="true">→</span>
          </Link>
        </div>
      </article>
    </div>
  );
}
