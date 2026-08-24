import { NextRequest, NextResponse } from "next/server";
import { setSessionCookies } from "@/lib/server/authCookies";

export const dynamic = "force-dynamic";

// TEACHER-UX-POLISH-001 — the ONLY caller of this route is
// app/auth/confirmed's client component, right after Supabase's own
// confirmation redirect hands the browser a real access/refresh token pair
// in the URL fragment (never sent to any server, including this one, until
// the client explicitly POSTs it here). This does not verify or authorize
// anything new: it just moves a token pair the browser already legitimately
// holds into the same httpOnly cookies every other login path uses. The
// backend still independently verifies the access token's signature on
// every subsequent request, exactly as it does for a normal login.
export async function POST(req: NextRequest) {
  const payload = await req.json().catch(() => null) as {
    accessToken?: string; refreshToken?: string; userId?: string; email?: string;
  } | null;
  if (!payload?.accessToken || !payload.refreshToken || !payload.userId) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  await setSessionCookies({
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
    userId: payload.userId,
    email: payload.email ?? "",
  });
  return NextResponse.json({ ok: true });
}
