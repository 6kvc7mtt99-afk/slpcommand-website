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
  // EXAM-REAL-003, Checkpoint 3 — /warmup/respond and /respond each do a Whisper
  // transcription plus (usually) one more OpenAI call (the next examiner turn, or the
  // rubric rating on the turn that completes a task) — same AI-call cost shape as
  // /speaking/evaluate above, same timeout.
  if (path.includes("/speaking/exam/")) return 90_000;
  if (path.includes("/support/conversations") && path.includes("/messages")) return 90_000;
  return DEFAULT_TIMEOUT;
}

async function refreshPair(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
} | null> {
  // A refresh that cannot reach the backend is "no new pair", not a crash.
  // Both call sites already treat null as "could not refresh".
  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ refreshToken }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return null;
  }
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
  /**
   * An unreachable backend is a 504, not an exception.
   *
   * THE BUG THIS FIXES. `fetch` REJECTS — it does not resolve — when the
   * request aborts on `AbortSignal.timeout`, when DNS fails, when the
   * connection is refused, or when the socket dies mid-flight. This call had
   * no try/catch, so that rejection propagated out of `backendFetch`, out of
   * `loadEntitlements()`, and out of the server component in
   * `app/(app)/layout.tsx` that awaits it. There is no error.tsx anywhere under
   * app/, so Next had nothing to catch it with and rendered its own error page:
   * the ENTIRE authenticated product, down.
   *
   * That is not a hypothetical. Render's free tier spins the dyno down and a
   * cold start was measured at 32s against a 20s default timeout here — so the
   * first visit after an idle period is exactly the case that took the app out.
   *
   * Returning a synthetic 504 puts the failure back on the path every caller
   * already handles: loadProgress/loadEntitlements/loadFeatureFlags all branch
   * on `status >= 400`, SkillStatus renders "Standing unavailable", the plan
   * chip renders "Plan unavailable", and the learner sees the shell with honest
   * empty instruments instead of a stack trace. 504 (not 503) because the web
   * tier reached its own limit waiting for an upstream it proxies.
   */
  let res: Response;
  try {
    res = await fetch(opts.url, init);
  } catch {
    return {
      status: 504,
      headers: new Headers({ "content-type": "application/json" }),
      bodyText: JSON.stringify({ error: "upstream_unreachable" }),
    };
  }
  let bodyText: string;
  try {
    bodyText = await res.text();
  } catch {
    // Headers arrived, the body did not — a truncated upstream response.
    return {
      status: 502,
      headers: new Headers({ "content-type": "application/json" }),
      bodyText: JSON.stringify({ error: "upstream_body_unreadable" }),
    };
  }
  return { status: res.status, headers: res.headers, bodyText };
}


/**
 * Persist a refreshed pair when the runtime allows it, and never fail the render.
 *
 * THE BUG THIS FIXES, which Phase 4 created. `backendFetch` runs in BOTH
 * contexts: inside Route Handlers (where `cookies().set()` is legal) and inside
 * server components such as `loadEntitlements()` in app/(app)/layout.tsx (where
 * Next throws "Cookies can only be modified in a Server Action or Route
 * Handler"). Before Phase 4 the refresh branch was unreachable during a render,
 * because `slp_rt` was scoped to /api and page requests never carried it — so
 * the illegal write never happened. Widening the cookie path to fix the hourly
 * logout made that branch live, and the throw propagated out of the layout into
 * the error boundary: the returning learner got "This screen didn't load"
 * instead of their dashboard.
 *
 * The refresh itself is still fully effective for the request in flight — the
 * new access token is used for the upstream call either way. Only the
 * PERSISTENCE is best-effort here, and losing it is harmless: the client's own
 * 401→refresh path (lib/api/client.ts → /api/auth/refresh, a Route Handler)
 * writes the pair properly on the next API call, and until then each render
 * simply refreshes again.
 *
 * This deliberately swallows only the write. A failed refresh is a different
 * thing and is still handled by the caller.
 */
async function persistSessionCookies(pair: {
  accessToken: string;
  refreshToken: string;
  userId: string;
  email: string;
}): Promise<void> {
  try {
    await setSessionCookies(pair);
  } catch {
    // Read-only context (a server component render). See above.
  }
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
      await persistSessionCookies({
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
        await persistSessionCookies({
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
