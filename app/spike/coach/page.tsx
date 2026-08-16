import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CoachSpike } from "@/components/spike/CoachSpike";
import { isCoachSpikeEnabled } from "@/lib/coach/flag";
import { readAuthCookies } from "@/lib/server/authCookies";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Coach spike",
  robots: { index: false, follow: false },
};

export default async function CoachSpikePage() {
  if (!isCoachSpikeEnabled()) notFound();
  const auth = await readAuthCookies();
  if (!auth.accessToken && !auth.refreshToken) redirect("/login");
  return <CoachSpike />;
}
