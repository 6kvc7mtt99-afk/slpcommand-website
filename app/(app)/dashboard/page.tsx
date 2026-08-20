import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { HomeDashboard } from "@/components/home/HomeDashboard";
import { loadHomeV2 } from "@/lib/server/home";
import { readAuthCookies } from "@/lib/server/authCookies";
import { greetingNameFromEmail } from "@/lib/displayName";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const hdrs = await headers();
  const timezone =
    hdrs.get("x-vercel-ip-timezone") ||
    hdrs.get("cf-timezone") ||
    hdrs.get("x-timezone") ||
    "UTC";
  const auth = await readAuthCookies();
  if (!auth.accessToken && !auth.refreshToken) {
    redirect("/login");
  }
  const initial = await loadHomeV2({
    timezone,
    greetingName: greetingNameFromEmail(auth.email),
  });

  return <HomeDashboard initial={initial} userId={auth.userId ?? null} />;
}
