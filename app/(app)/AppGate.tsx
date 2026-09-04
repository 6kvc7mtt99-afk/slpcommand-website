"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { PlanProvider } from "@/components/app/PlanProvider";
import { type EntitlementsState } from "@/lib/entitlements";

export function AppGate({
  children,
  initialEntitlements,
  userId,
  showTeacherNav,
}: {
  children: React.ReactNode;
  initialEntitlements: EntitlementsState;
  userId: string | null;
  showTeacherNav: boolean;
}) {
  const router = useRouter();
  const path = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      /**
       * THE BUG THIS FIXES. This effect had no catch, no timeout and no
       * failure branch. A rejected fetch — offline, a dropped connection, a
       * 5xx that fails at the network layer, an extension or service worker
       * intercepting the request — meant `setReady(true)` was never reached
       * and the learner sat on "Loading your workspace…" forever, with no
       * error, no retry and nothing to click. A promise rejected inside
       * useEffect is not caught by a React error boundary either, and there
       * is no error.tsx under app/, so nothing else could recover it. The
       * whole authenticated product was one flaky request from a dead screen.
       *
       * Failing open here is correct, not a weakening. This gate is a
       * convenience that routes to /login or /onboarding; it is NOT the
       * security boundary. `app/(app)/layout.tsx` has already run the real
       * server-side check on the auth cookies before any of this renders, and
       * every page's data comes from server components behind that same
       * cookie. Showing the content the server already sent is strictly safer
       * than showing a skeleton that never resolves.
       */
      try {
        const me = await fetch("/api/auth/me", {
          credentials: "same-origin",
          signal: AbortSignal.timeout(8000),
        });
        if (cancelled) return;
        if (!me.ok) {
          router.replace("/login");
          return;
        }
        const session = (await me.json()) as { userId?: string };
        if (cancelled) return;
        const uid = session.userId ?? userId;
        if (uid && localStorage.getItem(`onboarding_completed:${uid}`) !== "1") {
          router.replace("/onboarding");
          return;
        }
        setReady(true);
      } catch {
        // Could not reach the session endpoint. The server already authorised
        // this render; show it rather than stranding the learner.
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, path, userId]);

  if (!ready) {
    /**
     * The first paint of every authenticated session, in the product's own
     * material.
     *
     * This used to render `<main className="wrap gate-skel">` OUTSIDE
     * `.app-shell`, so none of the product tokens reached it: it inherited the
     * legacy `:root` palette and `.wrap`, a class belonging to the old
     * marketing stylesheet. The learner got a 780px centred column of grey
     * bars on beige, which was then replaced in one frame by a 208px sidebar
     * and a 1240px column on paper — both the ground tone and the entire
     * layout changing at once, on every cold load. That is the opposite of the
     * continuity the rest of the product's motion work is buying, and the
     * token convergence made the mismatch more obvious, not less.
     *
     * Wrapping it in `.app-shell` costs nothing — the skeleton needs no data —
     * and means the ground, the type and the hairlines are already correct
     * before anything resolves.
     */
    return (
      <div className="app-shell">
        <main className="app-main gate-skel" aria-busy="true">
          <p className="section-eyebrow">SLP Command</p>
          <p className="muted">Loading your workspace…</p>
          <div className="skel lg" />
          <div className="skel" />
          <div className="skel" />
        </main>
      </div>
    );
  }

  // Seeded from the layout's server read, then owned by the provider — so the
  // sidebar, Settings and every commercial surface answer the same question the
  // same way, and a re-read after a purchase updates all of them at once.
  return (
    <PlanProvider initial={initialEntitlements}>
      <AppShell showTeacherNav={showTeacherNav}>{children}</AppShell>
    </PlanProvider>
  );
}
