import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/server/backend";
import { toAcceptedSpeakingAudio } from "@/lib/server/speakingAudio";

// EXAM-REAL-003, Checkpoint 3 — SLP3 Real Exam Speaking, task/examiner-follow-up turn
// upload. See warmup/respond/route.ts's header for why this needs its own route rather
// than the generic [...path] catch-all.

export const dynamic = "force-dynamic";
export const maxDuration = 90;

function clientIp(req: NextRequest): string | undefined {
  return req.headers.get("cf-connecting-ip") ?? req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
}

export async function POST(req: NextRequest) {
  const incoming = req.headers.get("content-type") ?? "";
  if (!incoming.includes("multipart/form-data")) {
    return NextResponse.json({ error: "expected_multipart" }, { status: 400 });
  }
  const form = await req.formData();
  const audio = form.get("audio");
  if (!(audio instanceof File)) {
    return NextResponse.json({ error: "audio file is required" }, { status: 400 });
  }
  const raw = new Uint8Array(await audio.arrayBuffer());
  const converted = await toAcceptedSpeakingAudio(raw, audio.type || "application/octet-stream");
  if ("error" in converted) {
    return NextResponse.json({ error: converted.error }, { status: converted.status });
  }

  const outbound = new FormData();
  outbound.set("audio", new Blob([Buffer.from(converted.bytes)], { type: converted.mime }), converted.filename);
  for (const [key, value] of form.entries()) {
    if (key === "audio") continue;
    if (typeof value === "string") outbound.set(key, value);
  }
  const packed = new Request("https://slpcommand.local", { method: "POST", body: outbound });

  const result = await backendFetch({
    method: "POST",
    path: "/api/speaking/exam/respond",
    body: await packed.arrayBuffer(),
    contentType: packed.headers.get("content-type") ?? "multipart/form-data",
    idempotencyKey: req.headers.get("x-idempotency-key") ?? undefined,
    correlationId: req.headers.get("x-correlation-id") ?? undefined,
    clientIp: clientIp(req),
    timeoutMs: 90_000,
  });

  return new NextResponse(result.bodyText, { status: result.status, headers: result.headers });
}
