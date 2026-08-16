import { NextResponse } from "next/server";
import { clearSessionCookies } from "@/lib/server/authCookies";

export const dynamic = "force-dynamic";

export async function POST() {
  await clearSessionCookies();
  return NextResponse.json({ ok: true });
}
