/**
 * Integration test for the checkout route's own handler — not the pieces in
 * isolation (those are covered in checkoutIdentity.test.ts and
 * webOffer.test.ts), the actual `POST` export, exercised the way Next.js
 * would call it.
 *
 * P0 gap this closes: nothing previously proved that flipping
 * `web_billing_enabled` to `true` with the OFFER left unconfigured
 * (WEB_BILLING_PRODUCT_ID / WEB_BILLING_PURCHASE_URL unset — the real state
 * of every environment today, since no RevenueCat account exists) still
 * yields no checkout. "Provider missing" is exactly the environment-safety
 * property FASE 5 asks to prove, not just inspect.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const readAuthCookies = vi.fn();
const backendJson = vi.fn();
const loadFeatureFlags = vi.fn();

vi.mock("@/lib/server/authCookies", () => ({ readAuthCookies: () => readAuthCookies() }));
vi.mock("@/lib/server/backend", () => ({ backendJson: (init: unknown) => backendJson(init) }));
vi.mock("@/lib/server/home", () => ({ loadFeatureFlags: () => loadFeatureFlags() }));

const VALID_UID = "11111111-2222-3333-4444-555555555555";

function jwt(sub: string): string {
  const seg = (o: unknown) =>
    Buffer.from(JSON.stringify(o)).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${seg({ alg: "HS256" })}.${seg({ sub })}.sig`;
}

const originalEnv = { ...process.env };

beforeEach(() => {
  readAuthCookies.mockReset();
  backendJson.mockReset();
  loadFeatureFlags.mockReset();
  // The real posture of every environment today: flag row absent, offer
  // unconfigured. Each test overrides only what it means to test.
  readAuthCookies.mockResolvedValue({ accessToken: jwt(VALID_UID), userId: VALID_UID });
  backendJson.mockResolvedValue({ status: 200, data: {}, raw: "{}", correlationId: "c1" });
  loadFeatureFlags.mockResolvedValue({ web_billing_enabled: false });
  delete process.env.WEB_BILLING_PRODUCT_ID;
  delete process.env.WEB_BILLING_PURCHASE_URL;
});

afterEach(() => {
  vi.resetModules();
  process.env = { ...originalEnv };
});

async function callRoute() {
  const { POST } = await import("../../app/api/billing/checkout/route");
  return POST();
}

describe("POST /api/billing/checkout — the route handler itself", () => {
  it("P0: no token at all → 401, no product/URL leaked", async () => {
    readAuthCookies.mockResolvedValue({ accessToken: undefined, userId: undefined });
    const res = await callRoute();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthenticated" });
  });

  it("P0: a malformed / non-JWT token → 401", async () => {
    readAuthCookies.mockResolvedValue({ accessToken: "not-a-real-token", userId: VALID_UID });
    const res = await callRoute();
    expect(res.status).toBe(401);
  });

  it("P0: the backend rejects the token (expired/revoked session) → 401, distinct reason", async () => {
    backendJson.mockResolvedValue({ status: 401, data: null, raw: "", correlationId: "c1" });
    const res = await callRoute();
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("session_stale");
    // The probe must never be allowed to refresh mid-request — a rotated
    // token would leave the route reasoning about a stale `sub`.
    expect(backendJson).toHaveBeenCalledWith(expect.objectContaining({ allowRefresh: false }));
  });

  it("P0: slp_uid disagrees with the token's own subject → 401, the attack this route exists to stop", async () => {
    const victim = "99999999-8888-7777-6666-555555555555";
    readAuthCookies.mockResolvedValue({ accessToken: jwt(VALID_UID), userId: victim });
    process.env.WEB_BILLING_PRODUCT_ID = "p";
    process.env.WEB_BILLING_PURCHASE_URL = "https://pay.rev.cat/x";
    loadFeatureFlags.mockResolvedValue({ web_billing_enabled: true });
    const res = await callRoute();
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("identity_mismatch");
    const body = await (await callRoute()).text();
    expect(body).not.toContain(victim);
  });

  it("P0: flag is false (the real default) → 404, whatever else is true", async () => {
    process.env.WEB_BILLING_PRODUCT_ID = "p";
    process.env.WEB_BILLING_PURCHASE_URL = "https://pay.rev.cat/x";
    loadFeatureFlags.mockResolvedValue({ web_billing_enabled: false });
    const res = await callRoute();
    expect(res.status).toBe(404);
  });

  it("P0: flag missing from the payload entirely behaves exactly like false", async () => {
    // decodeFeatureFlags already guarantees this at the decode layer
    // (webOffer.test.ts); this proves the ROUTE also fails closed on it,
    // not just the decoder.
    loadFeatureFlags.mockResolvedValue({} as { web_billing_enabled: boolean });
    const res = await callRoute();
    expect(res.status).toBe(404);
  });

  it("P0 — THE GAP THIS TEST CLOSES: flag true but the offer is NOT configured (today's actual state of every environment) → still 404, never a checkout", async () => {
    loadFeatureFlags.mockResolvedValue({ web_billing_enabled: true });
    // WEB_BILLING_PRODUCT_ID / WEB_BILLING_PURCHASE_URL deliberately absent.
    const res = await callRoute();
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "not_found" });
  });

  it("P0: flag true, only ONE of the two required offer variables set → still 404", async () => {
    loadFeatureFlags.mockResolvedValue({ web_billing_enabled: true });
    process.env.WEB_BILLING_PRODUCT_ID = "p";
    // WEB_BILLING_PURCHASE_URL still absent.
    const res = await callRoute();
    expect(res.status).toBe(404);
  });

  it("everything present and correct → 200, a URL bound to the token's own subject, nothing else", async () => {
    loadFeatureFlags.mockResolvedValue({ web_billing_enabled: true });
    process.env.WEB_BILLING_PRODUCT_ID = "p";
    process.env.WEB_BILLING_PURCHASE_URL = "https://pay.rev.cat/x";
    const res = await callRoute();
    expect(res.status).toBe(200);
    const { url } = (await res.json()) as { url: string };
    expect(new URL(url).searchParams.get("app_user_id")).toBe(VALID_UID);
  });

  it("never reads a request body — there is nothing for a client to submit", async () => {
    const source = await import("node:fs/promises").then((fs) => fs.readFile("app/api/billing/checkout/route.ts", "utf8"));
    expect(source).not.toMatch(/req\.(json|body|text)|request\.(json|body|text)/);
    expect(source).toMatch(/export async function POST\(\)/);
  });
});
