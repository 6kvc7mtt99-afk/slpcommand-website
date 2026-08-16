export function LoadingState({
  label,
  lines = 3,
}: {
  label: string;
  lines?: number;
}) {
  return (
    <div className="state-loading" role="status" aria-busy="true">
      <p className="muted">{label}</p>
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className={i === 0 ? "skel lg" : "skel"} />
      ))}
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="state-empty">
      <p className="state-empty-title">{title}</p>
      <p className="muted">{body}</p>
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <article className="state-error" role="alert">
      <p>{message}</p>
      {onRetry ? (
        <button className="btn btn-primary" type="button" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </article>
  );
}
