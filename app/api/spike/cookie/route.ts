import { NextResponse } from "next/server";

/**
 * PR-00: prove a route handler can Set-Cookie with HttpOnly / Secure / SameSite=Lax.
 * This cookie is a probe only — not an auth token. Cleared after the spike is green.
 */
export async function GET() {
  const res = NextResponse.json({ ok: true, cookie: "slp_spike" });
  res.cookies.set({
    name: "slp_spike",
    value: "1",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60,
  });
  return res;
}
