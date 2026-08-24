import type { Metadata } from "next";
import Link from "next/link";
import { ConfirmedClient } from "@/components/auth/ConfirmedClient";

// TEACHER-UX-POLISH-001 — the redirect target Supabase's confirmation email
// sends the browser to (see `emailRedirectTo` in server.js). On FAILURE
// (invalid, expired, already-used link) Supabase appends `?error=...
// &error_code=...&error_description=...` as query params, which a Server
// Component can read directly. On SUCCESS it appends the new session as a
// URL FRAGMENT instead (`#access_token=...`), which never reaches any
// server — that half of the flow is necessarily client-side; see
// components/auth/ConfirmedClient.tsx.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function ConfirmedPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; error_code?: string; error_description?: string }>;
}) {
  const { error, error_description: description } = await searchParams;

  return (
    <main className="auth-stage">
      <div className="auth-card">
        <p className="section-eyebrow">Workspace</p>
        <h1>Confirm your email</h1>
        {error ? (
          <>
            <div className="feedback-banner bad" role="alert">
              <p>
                {description
                  ? decodeURIComponent(description.replace(/\+/g, " "))
                  : "This confirmation link is invalid or has already been used."}
              </p>
            </div>
            <p style={{ marginTop: 16 }}>
              <Link href="/signup">Create a new account</Link> or{" "}
              <Link href="/login">try logging in</Link> — if your email was
              already confirmed, logging in directly will work.
            </p>
          </>
        ) : (
          <ConfirmedClient />
        )}
      </div>
    </main>
  );
}
