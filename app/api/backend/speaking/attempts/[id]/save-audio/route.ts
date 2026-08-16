import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/server/backend";
import { toAcceptedSpeakingAudio } from "@/lib/server/speakingAudio";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const form = await req.formData();
  const audio = form.get("audio");
  if (!(audio instanceof File)) {
    return NextResponse.json({ error: "audio file is required" }, { status: 400 });
  }
  const converted = await toAcceptedSpeakingAudio(new Uint8Array(await audio.arrayBuffer()), audio.type || "application/octet-stream");
  if ("error" in converted) {
    return NextResponse.json({ error: converted.error }, { status: converted.status });
  }
  const outbound = new FormData();
  outbound.set("audio", new Blob([Buffer.from(converted.bytes)], { type: converted.mime }), converted.filename);
  const packed = new Request("https://slpcommand.local", { method: "POST", body: outbound });
  const result = await backendFetch({
    method: "POST",
    path: `/api/speaking/attempts/${id}/save-audio`,
    body: await packed.arrayBuffer(),
    contentType: packed.headers.get("content-type") ?? "multipart/form-data",
    timeoutMs: 90_000,
  });
  return new NextResponse(result.bodyText, { status: result.status, headers: result.headers });
}
