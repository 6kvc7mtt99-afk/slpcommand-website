import {
  buildUpstreamHeaders,
  decidePolicy,
  isValidIdempotencyKey,
  normalizeBackendPath,
  requiresIdempotency,
} from "./proxyPolicy";
import { hashToken, readAuthCookies, setSessionCookies } from "./authCookies";

export const BACKEND_URL =
  process.env.BACKEND_URL ?? "https://english-learning-backend-b5uw.onrender.com";

export type BackendFetchInit = {
  method?: string;
  path: string;
  search?: string;
  body?: string | ArrayBuffer | Uint8Array | null;
  contentType?: string;
  idempotencyKey?: string;
  correlationId?: string;
  clientIp?: string;
  timeoutMs?: number;
  allowRefresh?: boolean;
  cache?: RequestCache;
  revalidate?: number;
};

export type BackendFetchResult = {
  status: number;
  headers: Headers;
  bodyText: string;
  correlationId: string;
  refreshed: boolean;
};

const DEFAULT_TIMEOUT = 30_000;
const AI_TIMEOUT = 180_000;

export function shouldRetryTransientGet(method: string, status: number): boolean {
  return method === "GET" && (status === 429 || status === 502 || status === 503 || status === 504);
}

function timeoutFor(path: string): number {
  if (
    path.includes("/writing/submit") ||
    path.includes("/writing/sentence-feedback") ||
    path.includes("/writing/intelligence/transform")
  ) {
    return AI_TIMEOUT;
  }
  if (path.includes("/speaking/evaluate") || path.includes("/speaking/attempts/")) return 90_000;
  if (path.includes("/support/conversations") && path.includes("/messages")) return 90_000;
  return DEFAULT_TIMEOUT;
}

async function refreshPair(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
} | null> {
  const res = await fetch(`${BACKEND_URL}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ refreshToken }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { accessToken?: string; refreshToken?: string };
  if (!data.accessToken || !data.refreshToken) return null;
  return { accessToken: data.accessToken, refreshToken: data.refreshToken };
}

async function callExpress(opts: {
  method: string;
  url: string;
  headers: Headers;
  body?: string | ArrayBuffer | Uint8Array | null;
  timeoutMs: number;
  cache?: RequestCache;
  revalidate?: number;
}): Promise<{ status: number; headers: Headers; bodyText: string }> {
  const init: RequestInit & { next?: { revalidate: number } } = {
    method: opts.method,
    headers: opts.headers,
    body:
      opts.method === "GET" || opts.method === "DELETE"
        ? undefined
        : opts.body instanceof Uint8Array
          ? Buffer.from(opts.body)
          : opts.body,
    signal: AbortSignal.timeout(opts.timeoutMs),
  };
  if (opts.cache) init.cache = opts.cache;
  if (opts.revalidate != null) init.next = { revalidate: opts.revalidate };
  const res = await fetch(opts.url, init);
  const bodyText = await res.text();
  return { status: res.status, headers: res.headers, bodyText };
}

export async function backendFetch(init: BackendFetchInit): Promise<BackendFetchResult> {
  const method = (init.method ?? "GET").toUpperCase();
  const path = normalizeBackendPath(init.path);
  const decision = decidePolicy(method, path);
  const correlationId = init.correlationId ?? crypto.randomUUID();

  if (decision.action === "deny") {
    return {
      status: decision.status,
      headers: new Headers({ "content-type": "application/json" }),
      bodyText: JSON.stringify({ error: decision.error, reason: decision.reason }),
      correlationId,
      refreshed: false,
    };
  }

  if (requiresIdempotency(method, path) && !isValidIdempotencyKey(init.idempotencyKey ?? null)) {
    return {
      status: 400,
      headers: new Headers({ "content-type": "application/json" }),
      bodyText: JSON.stringify({ error: "missing_idempotency_key" }),
      correlationId,
      refreshed: false,
    };
  }

  const auth = await readAuthCookies();
  let accessToken = auth.accessToken;
  let refreshed = false;

  if (!accessToken && auth.refreshToken && init.allowRefresh !== false) {
    const pair = await refreshPair(auth.refreshToken);
    if (pair && auth.userId && auth.email) {
      await setSessionCookies({
        accessToken: pair.accessToken,
        refreshToken: pair.refreshToken,
        userId: auth.userId,
        email: auth.email,
      });
      accessToken = pair.accessToken;
      refreshed = true;
    }
  }

  const url = `${BACKEND_URL}${path}${init.search ?? ""}`;
  const timeoutMs = init.timeoutMs ?? timeoutFor(path);
  const headers = buildUpstreamHeaders({
    accessToken,
    idempotencyKey: init.idempotencyKey,
    correlationId,
    clientIp: init.clientIp,
    contentType: init.contentType ?? (init.body ? "application/json" : undefined),
  });

  let result = await callExpress({
    method,
    url,
    headers,
    body: init.body,
    timeoutMs,
    cache: init.cache,
    revalidate: init.revalidate,
  });

  if (shouldRetryTransientGet(method, result.status)) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    result = await callExpress({
      method,
      url,
      headers,
      body: init.body,
      timeoutMs,
      cache: init.cache,
      revalidate: init.revalidate,
    });
  }

  if (result.status === 401 && auth.refreshToken && init.allowRefresh !== false && !refreshed) {
    const inboundHash = hashToken(auth.refreshToken);
    const pair = await refreshPair(auth.refreshToken);
    if (pair) {
      if (auth.userId && auth.email) {
        await setSessionCookies({
          accessToken: pair.accessToken,
          refreshToken: pair.refreshToken,
          userId: auth.userId,
          email: auth.email,
        });
      }
      const replayHeaders = buildUpstreamHeaders({
        accessToken: pair.accessToken,
        idempotencyKey: init.idempotencyKey,
        correlationId,
        clientIp: init.clientIp,
        contentType: init.contentType ?? (init.body ? "application/json" : undefined),
      });
      result = await callExpress({
        method,
        url,
        headers: replayHeaders,
        body: init.body,
        timeoutMs,
        cache: init.cache,
        revalidate: init.revalidate,
      });
      refreshed = true;
    } else {
      const current = await readAuthCookies();
      const stillSame = current.refreshToken && hashToken(current.refreshToken) === inboundHash;
      if (stillSame) {
        // Losing isolate must not clear a rotated pair. Only clear if this
        // request still owns the inbound refresh token.
        // Caller (logout) is the only place that Max-Age=0s cookies.
      }
    }
  }

  const outHeaders = new Headers({
    "content-type": result.headers.get("content-type") ?? "application/json",
    "x-correlation-id": correlationId,
  });

  return {
    status: result.status,
    headers: outHeaders,
    bodyText: result.bodyText,
    correlationId,
    refreshed,
  };
}

export async function backendJson<T>(init: BackendFetchInit): Promise<{ status: number; data: T | null; raw: string; correlationId: string }> {
  const result = await backendFetch(init);
  let data: T | null = null;
  try {
    data = result.bodyText ? (JSON.parse(result.bodyText) as T) : null;
  } catch {
    data = null;
  }
  return { status: result.status, data, raw: result.bodyText, correlationId: result.correlationId };
}
