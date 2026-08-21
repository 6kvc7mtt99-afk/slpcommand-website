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
}: {
  children: React.ReactNode;
  initialEntitlements: EntitlementsState;
  userId: string | null;
}) {
  const router = useRouter();
  const path = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const me = await fetch("/api/auth/me", { credentials: "same-origin" });
      if (!me.ok) {
        router.replace("/login");
        return;
      }
      const session = (await me.json()) as { userId?: string };
      const uid = session.userId ?? userId;
      if (uid && localStorage.getItem(`onboarding_completed:${uid}`) !== "1") {
        router.replace("/onboarding");
        return;
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [router, path, userId]);

  if (!ready) {
    return (
      <main className="wrap gate-skel">
        <p className="section-eyebrow">SLP Command</p>
        <p>Loading your workspace…</p>
        <div className="skel lg" />
        <div className="skel" />
        <div className="skel" />
      </main>
    );
  }

  // Seeded from the layout's server read, then owned by the provider — so the
  // sidebar, Settings and every commercial surface answer the same question the
  // same way, and a re-read after a purchase updates all of them at once.
  return (
    <PlanProvider initial={initialEntitlements}>
      <AppShell>{children}</AppShell>
    </PlanProvider>
  );
}
