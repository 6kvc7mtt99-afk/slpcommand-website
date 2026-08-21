import { redirect } from "next/navigation";
import { CoachPreSession } from "@/components/coach/CoachPreSession";
import { readAuthCookies } from "@/lib/server/authCookies";

/**
 * The AI Speaking Coach.
 *
 * Deliberately not server-rendered beyond the auth guard: the mission,
 * balances and eligibility are per-request facts that must be read at the
 * moment the learner is looking at them, and the conversation token must
 * never travel through an SSR payload.
 */
export const dynamic = "force-dynamic";

export default async function CoachPage() {
  const auth = await readAuthCookies();
  if (!auth.userId) redirect("/login");
  return <CoachPreSession />;
}
