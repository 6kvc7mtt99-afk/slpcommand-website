import { NextResponse } from "next/server";
import { readAuthCookies } from "@/lib/server/authCookies";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await readAuthCookies();
  if (!auth.refreshToken && !auth.accessToken) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    userId: auth.userId ?? null,
    email: auth.email ?? null,
    authenticated: true,
  });
}
