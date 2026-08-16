import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/lib/server/backend";
import { readAuthCookies, setSessionCookies } from "@/lib/server/authCookies";

export const dynamic = "force-dynamic";

export async function POST() {
  const auth = await readAuthCookies();
  if (!auth.refreshToken) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ refreshToken: auth.refreshToken }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return NextResponse.json({ error: "network" }, { status: 502 });
  }

  const data = (await res.json().catch(() => ({}))) as {
    accessToken?: string;
    refreshToken?: string;
  };

  if (!res.ok || !data.accessToken || !data.refreshToken) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (auth.userId && auth.email) {
    await setSessionCookies({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      userId: auth.userId,
      email: auth.email,
    });
  }

  return NextResponse.json({ ok: true });
}
