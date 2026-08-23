import type { Metadata } from "next";
import Link from "next/link";
import { readAuthCookies } from "@/lib/server/authCookies";
import { AcceptInviteForm } from "@/components/teacher/AcceptInviteForm";

// FASE TEACHER-GROUPS-001 — deliberately OUTSIDE /teacher/*: the person
// opening this link is, by definition, not yet a member of anything, so
// TeacherLayout's staff-membership gate must not apply here. The backend
// route this posts to (POST /api/teacher/invites/accept) is gated the same
// way — requireAuth only, no staff role required — so this page's only job
// is: require a real session, then let a person explicitly redeem the token.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const auth = await readAuthCookies();
  const signedIn = Boolean(auth.accessToken || auth.refreshToken);

  return (
    <main className="auth-stage">
      <div className="auth-card">
        <p className="home-kicker">SLP Command</p>
        <h1>Join an organization</h1>

        {!token ? (
          <p className="updated">This invitation link is missing its token. Ask whoever invited you for a new link.</p>
        ) : !signedIn ? (
          <>
            <p className="updated">
              Sign in to your SLP Command account first, then open this same invitation link again
              to accept it.
            </p>
            <Link href="/login" className="btn btn-primary" style={{ marginTop: 12, display: "inline-block" }}>
              Sign in
            </Link>
          </>
        ) : (
          <>
            <p className="updated">You&apos;ve been invited to join an organization on SLP Command.</p>
            <AcceptInviteForm token={token} />
          </>
        )}
      </div>
    </main>
  );
}
