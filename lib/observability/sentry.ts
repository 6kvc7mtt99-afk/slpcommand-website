type SentryLike = {
  init: (opts: Record<string, unknown>) => void;
  captureException: (error: unknown) => void;
};

let client: SentryLike | null = null;

function scrub(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const clone = { ...(value as Record<string, unknown>) };
  for (const key of Object.keys(clone)) {
    if (/authorization|cookie|token|password|usertext|transcript|refresh/i.test(key)) {
      clone[key] = "[redacted]";
    }
  }
  return clone;
}

export async function initSentry(runtime: "client" | "server"): Promise<void> {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;
  if (!dsn || client) return;
  try {
    const Sentry = (await import("@sentry/nextjs")) as unknown as SentryLike;
    Sentry.init({
      dsn,
      tracesSampleRate: 0.1,
      environment: process.env.NODE_ENV,
      beforeSend(event: Record<string, unknown>) {
        const request = event.request as { headers?: Record<string, unknown> } | undefined;
        if (request?.headers) request.headers = scrub(request.headers) as Record<string, unknown>;
        return event;
      },
    });
    client = Sentry;
  } catch {
    client = null;
  }
  void runtime;
}

export function captureException(error: unknown): void {
  client?.captureException(error);
}
