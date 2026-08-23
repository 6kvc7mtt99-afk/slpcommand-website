/**
 * FASE WEB-HEADERS-001 — the security headers, pinned.
 *
 * THE FINDING THIS DEFENDS. Measured against the live site on 2026-08-23,
 * production sent NO security headers at all: no HSTS, no X-Frame-Options, no
 * nosniff, no Referrer-Policy, no Permissions-Policy. For a site that holds an
 * authenticated session in an httpOnly cookie and offers a checkout, an
 * authenticated page that can be framed is a clickjacking target and a
 * permissive referrer policy leaks authenticated URLs into third-party logs.
 *
 * WHY A TEST AND NOT JUST THE CONFIG. A header block in next.config.ts is
 * exactly the kind of thing that is silently dropped by a future refactor —
 * nothing in the app fails, no page breaks, and the loss is invisible until
 * someone measures the live site again. This asserts the contract.
 *
 * It reads the config directly rather than booting a server: the point is that
 * the values are declared and correct, and the live-serving half was verified
 * by hand against `next start` when the header block was written.
 */

import { describe, expect, it } from "vitest";
import config from "../../next.config";

async function headerMap(): Promise<Map<string, string>> {
  expect(typeof config.headers).toBe("function");
  const rules = await config.headers!();
  expect(rules).toHaveLength(1);
  expect(rules[0].source).toBe("/:path*"); // every route, not just the homepage
  return new Map(rules[0].headers.map((h) => [h.key.toLowerCase(), h.value]));
}

describe("WEB-HEADERS-001 — security headers are declared for every route", () => {
  it("sets HSTS for two years, including subdomains", async () => {
    const v = (await headerMap()).get("strict-transport-security");
    expect(v).toBeDefined();
    const maxAge = Number(/max-age=(\d+)/.exec(v!)?.[1] ?? 0);
    expect(maxAge).toBeGreaterThanOrEqual(31536000);
    expect(v).toContain("includeSubDomains");
  });

  it("blocks MIME sniffing", async () => {
    expect((await headerMap()).get("x-content-type-options")).toBe("nosniff");
  });

  it("refuses framing two ways, for old and current browsers", async () => {
    const h = await headerMap();
    expect(h.get("x-frame-options")).toBe("DENY");
    expect(h.get("content-security-policy")).toContain("frame-ancestors 'none'");
  });

  it("does not leak authenticated URLs cross-site in the referer", async () => {
    expect((await headerMap()).get("referrer-policy")).toBe("strict-origin-when-cross-origin");
  });

  it("isolates the browsing context from openers", async () => {
    expect((await headerMap()).get("cross-origin-opener-policy")).toBe("same-origin");
  });
});

describe("WEB-HEADERS-001 — Permissions-Policy does not break the product", () => {
  it("ALLOWS the microphone on self — Speaking and the Coach both need it", async () => {
    // The regression that matters most here. `microphone=()` would be the
    // "more secure" value and would silently kill the one feature the product
    // is differentiated by: SpeakingRecorder and lib/coach/preflight both call
    // navigator.mediaDevices.getUserMedia.
    const v = (await headerMap()).get("permissions-policy");
    expect(v).toBeDefined();
    expect(v).toContain("microphone=(self)");
    expect(v).not.toContain("microphone=()");
  });

  it("denies the capabilities the product never uses", async () => {
    const v = (await headerMap()).get("permissions-policy")!;
    for (const denied of ["camera=()", "geolocation=()", "payment=()", "usb=()", "midi=()"]) {
      expect(v).toContain(denied);
    }
  });
});

describe("WEB-HEADERS-001 — the CSP that is deliberately absent", () => {
  it("declares only frame-ancestors, not an enforcing full policy", async () => {
    // Recorded as a decision, not an oversight. A real CSP on Next.js needs a
    // nonce threaded through middleware for its inline bootstrap scripts, and
    // the Coach opens WebSockets to ElevenLabs/LiveKit hosts that would have to
    // be enumerated exactly in connect-src. Getting either wrong is an outage
    // on the paywall or the Coach, not a warning. If someone later adds
    // script-src here, this test fails and makes them prove it was deliberate.
    const v = (await headerMap()).get("content-security-policy")!;
    expect(v).toBe("frame-ancestors 'none'");
  });
});
