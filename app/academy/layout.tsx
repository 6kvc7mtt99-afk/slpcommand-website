import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { readAuthCookies } from "@/lib/server/authCookies";
import "../academy.css";

// FASE PLATFORM-PROVISIONING-001 — deliberately NOT under /teacher/*.
//
// TeacherLayout redirects anybody with zero staff memberships to /dashboard,
// which is right for every page it guards and exactly wrong for this one: the
// person creating their first academy has zero memberships BY DEFINITION.
// Putting the creation flow behind that gate would make it reachable only by
// people who no longer need it.
//
// So the gate here is the one thing that genuinely applies — a real session —
// and nothing more. There is no role to check, because the whole point is that
// the caller does not have one yet.
//
// As everywhere else in this app, this is UX routing and not the security
// boundary. POST /api/academies is authenticated, rate-limited per user, and
// counts the caller's existing academies inside the same transaction that
// creates the next one. Deleting this file would produce a worse experience,
// not a hole.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AcademyLayout({ children }: { children: React.ReactNode }) {
  const auth = await readAuthCookies();
  if (!auth.accessToken && !auth.refreshToken) {
    redirect("/login");
  }
  return <>{children}</>;
}
