import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppGate } from "./AppGate";
import { loadEntitlements } from "@/lib/server/home";
import { readAuthCookies } from "@/lib/server/authCookies";
import { hasTeacherAccess } from "@/lib/server/teacher";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const auth = await readAuthCookies();
  if (!auth.accessToken && !auth.refreshToken) {
    redirect("/login");
  }
  const entitlements = await loadEntitlements();
  // TEACHER-UX-POLISH-001 — same backend-authoritative check TeacherLayout
  // itself uses (GET /api/teacher/me via loadTeacherMemberships). This is a
  // UX convenience — showing or hiding a nav link — never a security
  // decision; /teacher/* is, and remains, independently gated server-side
  // regardless of what this renders.
  const showTeacherNav = await hasTeacherAccess();

  return (
    <AppGate initialEntitlements={entitlements} userId={auth.userId ?? null} showTeacherNav={showTeacherNav}>
      {children}
    </AppGate>
  );
}
