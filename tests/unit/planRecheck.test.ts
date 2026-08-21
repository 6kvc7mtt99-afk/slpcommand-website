import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { recheckEntitlements, RECHECK_DELAYS_MS } from "../../lib/plan/refresh";

const PRO = { status: 200, body: { plan: { key: "pro", name: "Pro" }, features: [] } };
const FREE = { status: 200, body: { plan: { key: "free", name: "Free" }, features: [] } };
const noSleep = async () => undefined;

/**
 * "Never grant locally", as a mechanism rather than a promise.
 *
 * This is the master plan's own billing-launch gate — "Never-grant-locally
 * proven (`refreshUntilPro` analogue)" — and it is provider-independent: it
 * re-reads GET /api/entitlements, which is already the only thing the product
 * treats as authority, whether the purchase happened in the iOS app (true
 * today) or through a future web rail (Q4).
 */
describe("bounded entitlements re-read", () => {
  it("keeps the shipped iOS cadence: five reads, front-loaded", () => {
    expect(RECHECK_DELAYS_MS).toHaveLength(5);
    expect(RECHECK_DELAYS_MS[0]).toBe(300);
    // Non-decreasing: the webhook usually lands fast, so the first recheck is
    // the cheap one and the budget backs off from there.
    for (let i = 1; i < RECHECK_DELAYS_MS.length; i += 1) {
      expect(RECHECK_DELAYS_MS[i]!).toBeGreaterThanOrEqual(RECHECK_DELAYS_MS[i - 1]!);
    }
    const slept = RECHECK_DELAYS_MS.slice(0, -1).reduce((a, b) => a + b, 0);
    expect(slept).toBeGreaterThan(1_500);
    expect(slept).toBeLessThan(4_000);
  });

  it("stops the moment the backend itself says Pro", async () => {
    const read = vi.fn().mockResolvedValueOnce(FREE).mockResolvedValueOnce(FREE).mockResolvedValue(PRO);
    const outcome = await recheckEntitlements({ read, sleep: noSleep });
    expect(outcome.isPro).toBe(true);
    expect(outcome.attempts).toBe(3);
    expect(read).toHaveBeenCalledTimes(3);
  });

  it("gives up after the budget and reports the backend's answer, not hope", async () => {
    const read = vi.fn().mockResolvedValue(FREE);
    const outcome = await recheckEntitlements({ read, sleep: noSleep });
    expect(outcome.isPro).toBe(false);
    expect(outcome.attempts).toBe(5);
    expect(read).toHaveBeenCalledTimes(5);
  });

  it("does not sleep after the final read", async () => {
    const sleep = vi.fn(async () => undefined);
    await recheckEntitlements({ read: async () => FREE, sleep });
    expect(sleep).toHaveBeenCalledTimes(RECHECK_DELAYS_MS.length - 1);
  });

  it("treats every failure mode as not-Pro", async () => {
    for (const failing of [
      async () => ({ status: 500, body: null }),
      async () => ({ status: 404, body: null }),
      async () => ({ status: 401, body: null }),
      async () => {
        throw new Error("network down");
      },
    ]) {
      const outcome = await recheckEntitlements({ read: failing, sleep: noSleep });
      expect(outcome.isPro).toBe(false);
    }
  });

  it("does not let a thrown read erase a Pro answer already given", async () => {
    // Confirms on the first read, so a later transport failure cannot matter.
    const read = vi.fn().mockResolvedValueOnce(PRO);
    const outcome = await recheckEntitlements({ read, sleep: noSleep });
    expect(outcome.isPro).toBe(true);
    expect(read).toHaveBeenCalledTimes(1);
  });

  it("ignores a 2xx body that claims Pro without the backend's plan key", async () => {
    const outcome = await recheckEntitlements({
      read: async () => ({ status: 200, body: { isPro: true, premium: true, plan: { key: "free" } } }),
      sleep: noSleep,
    });
    expect(outcome.isPro).toBe(false);
  });

  it("has no way to grant — there is no local write in the module at all", () => {
    const source = readFileSync("lib/plan/refresh.ts", "utf8");
    expect(source).not.toMatch(/(local|session)Storage/);
    expect(source).not.toMatch(/document\.cookie/);
    expect(source).not.toMatch(/isPro\s*=\s*true/);
    expect(source).not.toMatch(/searchParams|URLSearchParams/);
    // The only authority it consults is the same-origin proxy to the backend.
    expect(source).toContain("/api/backend/entitlements");
  });
});
