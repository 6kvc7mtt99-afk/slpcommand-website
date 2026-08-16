import { NextRequest, NextResponse } from "next/server";
import { BACKEND_URL } from "@/lib/server/backend";
import { setSessionCookies } from "@/lib/server/authCookies";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let payload: { email?: string; password?: string };
  try {
    payload = (await req.json()) as { email?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email: payload.email, password: payload.password }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return NextResponse.json({ error: "network" }, { status: 502 });
  }

  const data = (await res.json().catch(() => ({}))) as {
    userId?: string;
    email?: string;
    accessToken?: string;
    refreshToken?: string;
    error?: string;
  };

  if (!res.ok || !data.accessToken || !data.refreshToken || !data.userId) {
    return NextResponse.json({ error: data.error ?? "login_failed" }, { status: res.status || 400 });
  }

  await setSessionCookies({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    userId: data.userId,
    email: data.email ?? payload.email ?? "",
  });

  return NextResponse.json({ userId: data.userId, email: data.email ?? payload.email });
}
