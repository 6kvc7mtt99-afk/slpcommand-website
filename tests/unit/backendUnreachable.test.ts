import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// backendFetch reads the auth cookies before it calls out; outside a request
// context Next's cookies() throws. The transport is what is under test here.
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, set: () => {} }),
  headers: async () => new Headers(),
}));

/**
 * An unreachable backend must degrade, not crash the render.
 *
 * `fetch` REJECTS on an aborted timeout, a DNS failure or a refused
 * connection. `callExpress` had no try/catch, so that rejection escaped
 * `backendFetch` → `loadEntitlements()` → the server component in
 * app/(app)/layout.tsx that awaits it. With no error.tsx under app/, Next
 * rendered its own error page and the entire authenticated product was down.
 *
 * Render's free tier spins the dyno down and a cold start was measured at 32s
 * against a 20s default timeout here, so this is the ordinary first visit after
 * an idle period — not an edge case.
 */
describe("backend transport failures", () => {
  const realFetch = globalThis.fetch;

  beforeEach(() => {
    vi.resetModules();
    process.env.BACKEND_URL = "http://127.0.0.1:9";
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
    vi.restoreAllMocks();
  });

  it("turns a rejected fetch into a 504 instead of throwing", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(
      Object.assign(new Error("The operation was aborted due to timeout"), { name: "TimeoutError" }),
    ) as unknown as typeof fetch;

    const { backendFetch } = await import("../../lib/server/backend");
    const result = await backendFetch({ path: "/api/entitlements" });

    expect(result.status).toBe(504);
    expect(JSON.parse(result.bodyText)).toMatchObject({ error: "upstream_unreachable" });
  });

  it("turns an unreadable body into a 502 instead of throwing", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200,
      headers: new Headers(),
      text: () => Promise.reject(new Error("socket hang up")),
    }) as unknown as typeof fetch;

    const { backendFetch } = await import("../../lib/server/backend");
    const result = await backendFetch({ path: "/api/entitlements" });

    expect(result.status).toBe(502);
    expect(JSON.parse(result.bodyText)).toMatchObject({ error: "upstream_body_unreadable" });
  });

  it("a 504 reads as 'could not ask', never as a fact about the account", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED")) as unknown as typeof fetch;

    const { interpretEntitlements } = await import("../../lib/entitlements");
    const { backendFetch } = await import("../../lib/server/backend");
    const result = await backendFetch({ path: "/api/entitlements" });
    const state = interpretEntitlements(result.status, null);

    // NOT "noPlan" — an outage must never render a subscriber as Free.
    expect(state.status).toBe("error");
  });
});
