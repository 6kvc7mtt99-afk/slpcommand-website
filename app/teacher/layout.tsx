import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { readAuthCookies } from "@/lib/server/authCookies";
import { loadTeacherMemberships } from "@/lib/server/teacher";
// Scoped to /teacher/* only, deliberately NOT imported from the root
// layout. Next.js's global CSS ordering is chunk-based and not guaranteed
// stable across unrelated routes — importing this from app/layout.tsx
// caused a real, deterministic axe regression on an unrelated marketing
// page (/es/slp-3: link-in-text-block) despite every selector here being
// scoped under .teacher-*. Importing it only where it is actually used
// removes the shared chunk entirely, which is also simply correct: a
// marketing page has no reason to ship Teacher's CSS at all.
/**
 * CSS-OWNERSHIP-001 — this root is part of the PRODUCT, so it loads the
 * product's style layer explicitly.
 *
 * app/product.css no longer ships from the root layout (it reached every public
 * URL and matched nothing there). It still owns the token remap that gives this
 * root its palette — see the `.teacher-shell, .academy-main` block in that file
 * — so without this import the tokens resolve to the pre-convergence defaults
 * and the surface silently paints the old colours.
 */
import "../product.css";
import "../teacher.css";

// FASE TEACHER-WEB-001 — SLP Command Teacher is exclusively Web. This layout
// is the ONE gate every /teacher/* URL passes through before anything else
// runs: (1) a real session at all, (2) at least one real staff membership.
//
// This is UX routing, not the security boundary — a student who edits the
// DOM or hits a /teacher URL directly still gets nothing, because every
// server-side data loader below calls the SAME backend routes, gated by the
// SAME requireTeacherRole + requireOrgMembership that decided access here.
// Removing this layout would degrade the experience (a flash of an empty
// shell before every fetch 404s), not create a hole.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const auth = await readAuthCookies();
  if (!auth.accessToken && !auth.refreshToken) {
    redirect("/login");
  }

  const memberships = await loadTeacherMemberships();
  if (memberships.length === 0) {
    // A real, authenticated learner who is not staff anywhere. Sent to their
    // own Home, not to a Teacher-flavoured "forbidden" page — this is not an
    // error state for them, it is simply not their product.
    redirect("/dashboard");
  }

  return <>{children}</>;
}
