import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/server/backend";

export const dynamic = "force-dynamic";

function clientIp(req: NextRequest): string | undefined {
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    undefined
  );
}

async function handle(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const joined = `/${path.join("/")}`;
  const search = req.nextUrl.search;
  const contentType = req.headers.get("content-type") ?? undefined;
  const idempotencyKey = req.headers.get("x-idempotency-key") ?? undefined;
  const body = ["GET", "HEAD"].includes(req.method) ? null : await req.text();

  const result = await backendFetch({
    method: req.method,
    path: joined,
    search,
    body,
    contentType,
    idempotencyKey,
    correlationId: req.headers.get("x-correlation-id") ?? undefined,
    clientIp: clientIp(req),
  });

  return new NextResponse(result.bodyText, {
    status: result.status,
    headers: result.headers,
  });
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
