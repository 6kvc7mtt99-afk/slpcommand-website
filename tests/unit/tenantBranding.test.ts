// FASE PLATFORM-WHITELABEL-001 — how a resolved tenant becomes a rendered brand.
//
// The property that matters here is NEGATIVE: an unbranded tenant, or a tenant
// that set only some fields, must never produce a half-branded page — one
// customer's colour sitting next to SLP Command's because a variable was
// filled in by accident. brandingStyle returns only the variables that have
// real values behind them, so the stylesheet's own defaults win by simply not
// being overridden.

import { describe, expect, it } from "vitest";
import { brandingStyle, tenantDisplayName, isPlatformHost } from "@/lib/server/tenantContext";
import type { Branding, ResolvedTenant } from "@/lib/platform/types";

function branding(overrides: Partial<Branding> = {}): Branding {
  return {
    displayName: null, logoUrl: null, faviconUrl: null,
    primaryColor: null, secondaryColor: null, accentColor: null,
    loginHeadline: null, loginSubheadline: null, supportEmail: null,
    metadata: {}, updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function tenant(overrides: Partial<ResolvedTenant> = {}): ResolvedTenant {
  return {
    organizationId: "org-a",
    name: "Escuela Militar de Idiomas",
    slug: "emi",
    type: "white_label",
    resolvedBy: "slug",
    branding: null,
    ...overrides,
  };
}

describe("brandingStyle", () => {
  it("no tenant produces no overrides at all", () => {
    // The B2C path. Every visitor to slpcommand.com takes it, so it must cost
    // nothing and change nothing.
    expect(brandingStyle(null)).toEqual({});
  });

  it("a tenant with no branding row produces no overrides", () => {
    expect(brandingStyle(tenant({ branding: null }))).toEqual({});
  });

  it("a tenant with branding but no colours produces no colour overrides", () => {
    expect(brandingStyle(tenant({ branding: branding({ displayName: "EMI" }) }))).toEqual({});
  });

  it("sets only the variables the tenant actually chose", () => {
    const style = brandingStyle(tenant({ branding: branding({ primaryColor: "#1b4d3e" }) })) as Record<string, string>;
    expect(style["--accent"]).toBe("#1b4d3e");
    expect(style["--p-accent"]).toBe("#1b4d3e");
    // The two it did NOT set must be absent, not empty strings — an empty
    // custom property is a real override that resolves to nothing.
    expect("--accent-dark" in style).toBe(false);
    expect("--accent-light" in style).toBe(false);
  });

  it("maps all three colours when all three are set", () => {
    const style = brandingStyle(tenant({
      branding: branding({ primaryColor: "#111111", secondaryColor: "#222222", accentColor: "#333333" }),
    })) as Record<string, string>;
    expect(style["--accent"]).toBe("#111111");
    expect(style["--accent-dark"]).toBe("#222222");
    expect(style["--accent-light"]).toBe("#333333");
  });

  it("never emits a value that is not a colour", () => {
    // Validation happens at the write path (lib/platform/organization.js),
    // which is the right place for it. This asserts the read path does not
    // undo that by inventing a value: every emitted variable traces back to a
    // stored one.
    const style = brandingStyle(tenant({ branding: branding({ primaryColor: "#abcdef" }) })) as Record<string, string>;
    for (const value of Object.values(style)) {
      expect(value).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});

describe("tenantDisplayName", () => {
  it("falls back to the product name with no tenant", () => {
    expect(tenantDisplayName(null)).toBe("SLP Command");
  });

  it("prefers the tenant's chosen display name", () => {
    expect(tenantDisplayName(tenant({ branding: branding({ displayName: "EMI" }) }))).toBe("EMI");
  });

  it("falls back to the organization's own name when no display name is set", () => {
    // teacher_organizations.name is the operator-facing name; display_name is
    // what the customer wants learners to see. Using the former when the
    // latter is unset is better than showing nothing.
    expect(tenantDisplayName(tenant({ branding: branding() }))).toBe("Escuela Militar de Idiomas");
  });

  it("treats a whitespace-only display name as unset", () => {
    expect(tenantDisplayName(tenant({ branding: branding({ displayName: "   " }) })))
      .toBe("Escuela Militar de Idiomas");
  });
});

describe("isPlatformHost — the fast path that keeps B2C free", () => {
  it("recognises the platform's own hosts", () => {
    for (const host of [
      "slpcommand.com", "www.slpcommand.com", "SLPCommand.com",
      "slpcommand.com:443", "slpcommand.com.", "localhost", "localhost:3000", "127.0.0.1",
    ]) {
      expect(isPlatformHost(host), host).toBe(true);
    }
  });

  it("recognises preview and CI hosts as the platform", () => {
    expect(isPlatformHost("slpcommand-preview.workers.dev")).toBe(true);
    expect(isPlatformHost("abc123.pages.dev")).toBe(true);
  });

  it("does NOT match a lookalike suffix", () => {
    // The reason this is an exact set plus a suffix rule rather than a
    // substring check. A wrong answer here is only a wasted request (the
    // backend classifies independently), but it would be a wasted request on
    // an attacker-chosen host.
    expect(isPlatformHost("slpcommand.com.attacker.tld")).toBe(false);
    expect(isPlatformHost("notslpcommand.com")).toBe(false);
    expect(isPlatformHost("workers.dev.attacker.tld")).toBe(false);
  });

  it("does not swallow a real tenant subdomain", () => {
    // These MUST reach the resolver — treating them as the platform would
    // break white-label entirely.
    expect(isPlatformHost("academy-a.slpcommand.com")).toBe(false);
    expect(isPlatformHost("learn.example.com")).toBe(false);
  });
});
