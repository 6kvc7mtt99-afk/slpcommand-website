"use client";

import { useEffect } from "react";

/**
 * The last resort, for a throw in the root layout itself.
 *
 * A global-error boundary replaces the whole document, so it must render its own
 * <html> and <body> and cannot rely on any provider, font link or stylesheet the
 * root layout would normally have supplied. Everything here is therefore inline
 * and self-contained, and the palette is written out rather than tokenised —
 * app/product.css may be exactly what failed to load.
 *
 * The values are the brand's: --s-paper #f5f3ee, --s-ink #121417,
 * --s-muted #5e646e, --s-accent #1f49c9, --s-line #d9d4c9.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global] render error", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "32px",
          background: "#f5f3ee",
          color: "#121417",
          font: '16px/1.6 "Archivo", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <main style={{ maxWidth: "34rem" }}>
          <p
            style={{
              margin: "0 0 10px",
              font: '600 12px/1 "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#5e646e",
            }}
          >
            SLP Command
          </p>
          <h1 style={{ margin: "0 0 12px", fontSize: "28px", letterSpacing: "-0.02em" }}>
            Something went wrong
          </h1>
          <p style={{ margin: "0 0 24px", color: "#5e646e" }}>
            The application failed to start. Your account and your record are unaffected.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              font: "inherit",
              fontWeight: 600,
              padding: "12px 22px",
              borderRadius: "6px",
              border: "1px solid #1f49c9",
              background: "#1f49c9",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Reload
          </button>
          {error.digest ? (
            <p style={{ marginTop: "20px", color: "#5e646e", fontSize: "14px" }}>
              Reference{" "}
              <span style={{ fontFamily: '"IBM Plex Mono", ui-monospace, monospace' }}>
                {error.digest}
              </span>
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
