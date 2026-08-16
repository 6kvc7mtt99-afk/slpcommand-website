import { NextResponse } from "next/server";

const BACKEND_URL =
  process.env.BACKEND_URL ?? "https://english-learning-backend-b5uw.onrender.com";

/** PR-00: prove the Next server can fetch the existing Render backend. */
export async function GET() {
  const started = Date.now();
  try {
    const res = await fetch(`${BACKEND_URL}/api/health`, {
      signal: AbortSignal.timeout(15_000),
      headers: { Accept: "application/json" },
    });
    const body = (await res.json().catch(() => null)) as unknown;
    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      elapsedMs: Date.now() - started,
      body,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        elapsedMs: Date.now() - started,
        error: err instanceof Error ? err.name : "unknown",
      },
      { status: 502 },
    );
  }
}
