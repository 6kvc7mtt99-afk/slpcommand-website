import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const CANONICAL = "https://slpcommand.com";

function allowedOrigins(request: NextRequest): Set<string> {
  const origin = request.nextUrl.origin;
  return new Set([CANONICAL, "https://www.slpcommand.com", origin]);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method.toUpperCase();

  if (pathname.startsWith("/api/backend")) {
    const client = request.headers.get("x-slp-client");
    if (client !== "web") {
      return NextResponse.json({ error: "missing_client_header" }, { status: 400 });
    }
  }

  if (pathname.startsWith("/api/") && ["POST", "PATCH", "DELETE"].includes(method)) {
    const origin = request.headers.get("origin");
    if (!origin || !allowedOrigins(request).has(origin)) {
      return NextResponse.json({ error: "origin_rejected" }, { status: 403 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/backend/:path*", "/api/:path*"],
};
