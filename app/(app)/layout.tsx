import type { Metadata } from "next";
/**
 * CSS-OWNERSHIP-001 — settings.css belongs to the authenticated product, not to
 * every page on the internet.
 *
 * app/layout.tsx imported twelve stylesheets from the ROOT, so ~190 KB of CSS
 * reached every public URL and roughly two thirds of it matched nothing in the
 * public DOM. This sheet is the cleanest case to move first: it ships as its own
 * build chunk (so the reduction is directly measurable) and every one of its
 * consumers — the profile/settings route, SubscriptionView, ExerciseShell's plan
 * lock, CommercialDialog and the listening skill page — renders inside
 * app/(app). Verified by grepping the classes it defines against every non-(app)
 * route and component.
 *
 * ORDERING IS THE RISK, not the move itself. app/teacher/layout.tsx:5-12 records
 * that adding a global import once reordered the CSS chunks and produced a
 * deterministic axe failure on an unrelated marketing page, because app/site.css
 * must remain LAST for the public design system to win its ties. Removing an
 * import from the root cannot promote anything above site.css, and the build
 * manifest is checked after this change to confirm site.css is still last.
 */
import "../product.css";
import "../experience.css";
import "../lesson.css";
import "../task.css";
import "../intel.css";
import "../records.css";
import "../instrument.css";
import "../settings.css";
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
