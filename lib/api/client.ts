import { FrontendError, normalizeBackendError, userMessageFor } from "./errors";

export type ApiRequestInit = {
  method?: string;
  body?: unknown;
  idempotencyKey?: string;
  signal?: AbortSignal;
};

let refreshInFlight: Promise<boolean> | null = null;

async function refreshOnce(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
    })
      .then((res) => res.ok)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

export async function apiRequest<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers: Record<string, string> = { Accept: "application/json", "X-SLP-Client": "web" };
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  if (init.idempotencyKey) headers["X-Idempotency-Key"] = init.idempotencyKey;

  const exec = () =>
    fetch(`/api/backend${path.startsWith("/") ? path : `/${path}`}`, {
      method,
      credentials: "same-origin",
      headers,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: init.signal,
    });

  let res = await exec();
  if (res.status === 401) {
    const refreshed = await refreshOnce();
    if (refreshed) res = await exec();
  }

  const correlationId = res.headers.get("x-correlation-id") ?? undefined;
  const raw = await res.text();
  let parsed: unknown = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = { error: raw };
  }

  if (!res.ok) {
    const err = normalizeBackendError({
      status: res.status,
      body: parsed,
      correlationId,
      path,
    });
    err.message = userMessageFor(err);
    throw err;
  }
  return parsed as T;
}

// TEACHER-UX-POLISH-001 — `rawMessage` is the backend's own Supabase error
// string. Without checking it, "email not confirmed" was indistinguishable
// from a wrong password — the actual, real cause of a real signup-then-login
// failure found during the Teacher certification smoke test.
export function loginErrorMessage(status: number, network: boolean, rawMessage?: string): string {
  if (network || status >= 500) return "Unable to connect. Check your connection and try again.";
  if (rawMessage && /email.*not.*confirmed/i.test(rawMessage)) {
    return "Confirm your email before logging in — check your inbox for the confirmation link.";
  }
  return "Incorrect email or password.";
}

/**
 * Signup failures, which are NOT login failures.
 *
 * THE BUG THIS FIXES. app/signup/page.tsx called `loginErrorMessage`, so every
 * rejected registration — an address already in use, a password under the
 * minimum length, a malformed email — was reported as "Incorrect email or
 * password." on a form where the learner was CHOOSING a password. There is no
 * incorrect password to speak of during signup, and the one message they got
 * named neither the field at fault nor anything they could act on.
 *
 * The backend returns Supabase's own wording (server.js /api/auth/register
 * responds 400 with `error.message`). That string is a library's, not a
 * product's, so it is matched and replaced here rather than shown; nothing new
 * is disclosed, because that response body already reaches the browser.
 */
export function signupErrorMessage(status: number, network: boolean, rawMessage?: string): string {
  if (network || status >= 500) return "Unable to connect. Check your connection and try again.";
  if (status === 429) return "Too many attempts. Wait a moment and try again.";
  const raw = rawMessage ?? "";
  if (/already\s*registered|already\s*exists|user\s*already/i.test(raw)) {
    return "That email already has an account. Sign in instead, or use a different address.";
  }
  if (/password/i.test(raw) && /at least|too short|characters|weak|strength/i.test(raw)) {
    return "Choose a longer password — at least 6 characters.";
  }
  if (/validate email|invalid format|invalid email|email address/i.test(raw)) {
    return "That email address doesn’t look valid. Check it and try again.";
  }
  if (/rate limit|too many/i.test(raw)) return "Too many attempts. Wait a moment and try again.";
  return "We couldn’t create the account. Check your details and try again.";
}

export { FrontendError };
