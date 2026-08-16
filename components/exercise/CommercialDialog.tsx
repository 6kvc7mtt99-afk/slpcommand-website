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
      <article className="home-card dialog-card">
        <p className="home-kicker">Plan</p>
        <h2 id="commercial-title">{title}</h2>
        <p className="muted">{body}</p>
        <button className="btn btn-primary" type="button" onClick={onClose}>
          Close
        </button>
      </article>
    </div>
  );
}
