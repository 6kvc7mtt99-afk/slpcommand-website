import { FrontendError, normalizeBackendError } from "./errors";

export class AdminRequestError extends Error {
  readonly status: number;
  readonly backendMessage: string;

  constructor(status: number, backendMessage: string) {
    super(backendMessage);
    this.name = "AdminRequestError";
    this.status = status;
    this.backendMessage = backendMessage;
  }
}

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

function backendErrorMessage(parsed: unknown, fallback: string): string {
  if (parsed && typeof parsed === "object" && "error" in parsed && typeof (parsed as { error: unknown }).error === "string") {
    return (parsed as { error: string }).error;
  }
  return fallback;
}

async function execAdmin(
  path: string,
  init: { method?: string; body?: unknown; accept?: string },
): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers: Record<string, string> = {
    Accept: init.accept ?? "application/json",
    "X-SLP-Client": "web",
  };
  if (init.body !== undefined) headers["Content-Type"] = "application/json";

  const run = () =>
    fetch(`/api/backend${path.startsWith("/") ? path : `/${path}`}`, {
      method,
      credentials: "same-origin",
      headers,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });

  let res = await run();
  if (res.status === 401) {
    const refreshed = await refreshOnce();
    if (refreshed) res = await run();
  }
  return res;
}

export async function adminRequest<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await execAdmin(path, init);
  const raw = await res.text();
  let parsed: unknown = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = { error: raw };
  }

  if (!res.ok) {
    throw new AdminRequestError(res.status, backendErrorMessage(parsed, `HTTP ${res.status}`));
  }
  return parsed as T;
}

export async function adminDownload(path: string): Promise<Blob> {
  const res = await execAdmin(path, { accept: "text/csv" });
  if (!res.ok) {
    const raw = await res.text();
    let parsed: unknown = null;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      parsed = { error: raw };
    }
    throw new AdminRequestError(res.status, backendErrorMessage(parsed, `HTTP ${res.status}`));
  }
  return res.blob();
}

export function isAdminDenied(error: unknown): boolean {
  if (error instanceof AdminRequestError) {
    return error.status === 403 && /admin/i.test(error.backendMessage);
  }
  if (error instanceof FrontendError) {
    return error.status === 403 && /admin/i.test(error.message);
  }
  return error instanceof Error && /admin/i.test(error.message);
}

export function adminDeniedCopy(error: unknown): string {
  if (isAdminDenied(error)) return "This account is not an administrator.";
  if (error instanceof AdminRequestError) return error.backendMessage;
  if (error instanceof Error) return error.message;
  return "Unable to load the operations console.";
}

export { normalizeBackendError };
