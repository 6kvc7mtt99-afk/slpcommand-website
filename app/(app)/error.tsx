"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * The authenticated product's error boundary.
 *
 * There was no error.tsx, no global-error.tsx and no loading.tsx anywhere under
 * app/ — so any throw in a server component rendered Next's own error page, with
 * the product's chrome gone and no way back except the browser's back button.
 * `lib/server/backend.ts` no longer throws on an unreachable backend (it returns
 * a synthetic 504 that every loader already handles), but a boundary is what
 * makes that a defence in depth rather than a single point of failure.
 *
 * It deliberately does NOT explain the cause. A learner cannot act on a stack
 * trace, and guessing between "the backend is cold", "your session expired" and
 * "this page has a bug" would be inventing a diagnosis the client does not have.
 * It states what is true, offers the two actions that can help, and keeps the
 * digest available for support.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Sentry is initialised in the root layout; this keeps the boundary from
    // swallowing the failure silently in environments where it is not.
    console.error("[app] render error", error);
  }, [error]);

  return (
    <main className="app-shell" id="main">
      <div className="app-main">
        <section className="state-page" role="alert">
          <p className="section-eyebrow">SLP Command</p>
          <h1>This screen didn’t load</h1>
          <p className="muted">
            Something went wrong on our side. Your work and your record are unaffected — nothing was
            lost and nothing was recorded.
          </p>
          <div className="cta-row" style={{ marginTop: 20 }}>
            <button className="btn btn-primary" type="button" onClick={reset}>
              Try again
            </button>
            <Link className="btn btn-outline" href="/dashboard">
              Back to Home
            </Link>
          </div>
          {error.digest ? (
            <p className="muted" style={{ marginTop: 18 }}>
              Reference <span className="p-num">{error.digest}</span>
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
