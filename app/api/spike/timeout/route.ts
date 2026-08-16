import { NextResponse } from "next/server";

/** PR-00: prove AbortSignal.timeout exists and fires in this runtime. */
export async function GET() {
  const started = Date.now();
  try {
    await fetch("https://example.com/slow-pr00-probe", {
      signal: AbortSignal.timeout(40),
    });
    return NextResponse.json({
      ok: false,
      reason: "request completed before timeout",
      elapsedMs: Date.now() - started,
    });
  } catch (err) {
    const name = err instanceof Error ? err.name : "unknown";
    const timedOut = name === "TimeoutError" || name === "AbortError";
    return NextResponse.json({
      ok: timedOut,
      name,
      elapsedMs: Date.now() - started,
    });
  }
}
