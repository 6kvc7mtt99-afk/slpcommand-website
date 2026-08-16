import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppGate } from "./AppGate";
import { loadEntitlements } from "@/lib/server/home";
import { readAuthCookies } from "@/lib/server/authCookies";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const auth = await readAuthCookies();
  if (!auth.accessToken && !auth.refreshToken) {
    redirect("/login");
  }
  const entitlements = await loadEntitlements();

  return (
    <AppGate initialEntitlements={entitlements} userId={auth.userId ?? null}>{children}</AppGate>
  );
}
