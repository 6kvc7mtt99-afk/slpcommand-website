"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Status = "checking" | "confirmed" | "no_token";

/**
 * TEACHER-UX-POLISH-001 — Supabase's own confirmation redirect (configured
 * via `emailRedirectTo` on signUp, server.js) lands here with the new
 * session in the URL FRAGMENT (`#access_token=...&refresh_token=...`) — a
 * fragment is never sent to any server automatically, which is exactly why
 * this has to run client-side rather than being read from `searchParams` on
 * the server component that wraps this.
 *
 * Nothing here is a new authorization decision: `sub`/`email` are read from
 * the token's own payload purely to label the two informational identity
 * cookies (`slp_uid`/`slp_em`) — the same non-authoritative role they already
 * play everywhere else in the product (see lib/server/identity.ts). The
 * backend still independently verifies the access token's signature on every
 * request that follows, exactly as it does after a normal password login.
 */
function decodeJwtClaim(token: string, claim: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const normalised = parts[1]!.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalised + "=".repeat((4 - (normalised.length % 4)) % 4);
    const payload = JSON.parse(atob(padded)) as Record<string, unknown>;
    const value = payload[claim];
    return typeof value === "string" ? value : null;
  } catch {
    return null;
  }
}

export function ConfirmedClient() {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    if (!accessToken || !refreshToken) {
      setStatus("no_token");
      return;
    }
    const userId = decodeJwtClaim(accessToken, "sub");
    const email = decodeJwtClaim(accessToken, "email");
    if (!userId) {
      setStatus("no_token");
      return;
    }
    (async () => {
      try {
        await fetch("/api/auth/session", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken, refreshToken, userId, email }),
        });
      } finally {
        // Strip the token pair from the visible URL/history regardless of
        // whether the cookie write succeeded — it must not sit in the
        // address bar or browser history.
        window.history.replaceState(null, "", window.location.pathname);
        setStatus("confirmed");
      }
    })();
  }, []);

  if (status === "checking") {
    return <p className="updated">Confirming…</p>;
  }

  if (status === "confirmed") {
    return (
      <div className="feedback-banner ok" role="status">
        <p><strong>Email confirmed.</strong> You&apos;re signed in.</p>
        <p style={{ marginTop: 8 }}>
          <Link className="btn btn-primary" href="/dashboard">Continue to your dashboard</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="feedback-banner info" role="status">
      <p>No confirmation is pending in this tab.</p>
      <p style={{ marginTop: 8 }}>
        If you already confirmed your email, <Link href="/login">log in</Link>.
      </p>
    </div>
  );
}
