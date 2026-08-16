"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { interpretEntitlements, planLabel, type EntitlementsSnapshot, type EntitlementsState } from "@/lib/entitlements";
import { apiRequest } from "@/lib/api/client";

export function AppGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [ready, setReady] = useState(false);
  const [entitlements, setEntitlements] = useState<EntitlementsState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const me = await fetch("/api/auth/me", { credentials: "same-origin" });
      if (!me.ok) {
        router.replace("/login");
        return;
      }
      const session = (await me.json()) as { userId?: string };
      if (session.userId && localStorage.getItem(`onboarding_completed:${session.userId}`) !== "1") {
        router.replace("/onboarding");
        return;
      }
      try {
        const snap = await apiRequest<EntitlementsSnapshot>("/entitlements");
        if (!cancelled) setEntitlements(interpretEntitlements(200, snap));
      } catch (err) {
        const status = err && typeof err === "object" && "status" in err ? Number(err.status) : 500;
        const code = err && typeof err === "object" && "code" in err ? String(err.code) : "";
        if (status === 401) {
          router.replace("/login");
          return;
        }
        if (!cancelled) setEntitlements(interpretEntitlements(code === "noPlan" ? 404 : status, null));
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [router, path]);

  if (!ready) {
    return (
      <main className="wrap">
        <p>Loading your workspace…</p>
      </main>
    );
  }

  return <AppShell planLabel={planLabel(entitlements)}>{children}</AppShell>;
}
