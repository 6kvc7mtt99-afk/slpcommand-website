import { NextRequest, NextResponse } from "next/server";
import { BACKEND_URL } from "@/lib/server/backend";
import { setSessionCookies } from "@/lib/server/authCookies";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const payload = await req.json().catch(() => null);
  if (!payload) return NextResponse.json({ error: "invalid_json" }, { status: 400 });

  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return NextResponse.json({ error: "network" }, { status: 502 });
  }

  const data = (await res.json().catch(() => ({}))) as {
    userId?: string;
    email?: string;
    accessToken?: string | null;
    refreshToken?: string | null;
    error?: string;
  };

  if (!res.ok) {
    return NextResponse.json({ error: data.error ?? "register_failed" }, { status: res.status });
  }

  if (data.accessToken && data.refreshToken && data.userId) {
    await setSessionCookies({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      userId: data.userId,
      email: data.email ?? "",
    });
  }

  return NextResponse.json({
    userId: data.userId,
    email: data.email,
    needsEmailConfirmation: !data.accessToken,
  });
}
