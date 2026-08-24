// FASE PLATFORM-WHITELABEL-001 — resolving the tenant for the CURRENT request.
//
// WHERE THE HOSTNAME COMES FROM, and why it matters. Not from a query
// parameter, not from a cookie, not from anything the page received as props:
// from the request headers this Next server itself was handed. A branded page
// is branded because of WHERE the visitor is, never because of what their
// browser claimed — that is the whole difference between white-label and a
// theme switcher anyone can drive.
//
// `x-forwarded-host` is preferred over `host` because Cloudflare terminates
// the connection: on a custom domain, `host` is what reached the worker and
// `x-forwarded-host` is what the visitor typed. Getting this backwards would
// make every custom domain resolve to nothing.

import { headers } from "next/headers";
import { cache } from "react";
import { resolveTenant } from "./platform";
import type { ResolvedTenant } from "@/lib/platform/types";

/**
 * Hosts that are the platform itself. Checked HERE, before any network call,
 * so a B2C visitor to slpcommand.com pays nothing at all for white-label
 * existing: no backend round trip, no cache entry, no latency.
 *
 * That matters more than it looks. Resolving the tenant made /login a
 * server-rendered route (it cannot be static and also know the hostname), so
 * without this short-circuit every single login page view — overwhelmingly
 * B2C — would make a request whose answer is always null.
 *
 * An exact set plus one suffix rule, never a substring match: "contains
 * slpcommand.com" would happily match `slpcommand.com.attacker.tld`. The
 * backend's classifyHost() applies the same rule independently, so this is a
 * fast path and not the only guard — if this list ever falls behind, the
 * result is a wasted request, never a wrong tenant.
 */
const PLATFORM_HOSTS = new Set([
  "slpcommand.com",
  "www.slpcommand.com",
  "localhost",
  "127.0.0.1",
]);

export function isPlatformHost(rawHost: string): boolean {
  const host = rawHost.trim().toLowerCase().split(":")[0].replace(/\.$/, "");
  if (PLATFORM_HOSTS.has(host)) return true;
  // Preview and CI hostnames are the platform too — a Cloudflare preview
  // deployment must render the standard product, not hunt for a tenant.
  return host.endsWith(".workers.dev") || host.endsWith(".pages.dev");
}

/**
 * The tenant for this request, or null for the standard SLP Command product.
 *
 * null is the normal, overwhelmingly common answer — every B2C visitor on
 * slpcommand.com gets it — so callers must treat it as "render the default",
 * not as a failure.
 *
 * `cache()`-wrapped: a layout and a page on the same request resolve once.
 */
export const currentTenant = cache(async (): Promise<ResolvedTenant | null> => {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host || isPlatformHost(host)) return null;
  try {
    return await resolveTenant(host);
  } catch {
    // A resolver failure must degrade to the standard product, never to a
    // broken page. Someone visiting a branded host during a backend blip sees
    // SLP Command rather than an error — the wrong logo is a smaller failure
    // than no login page at all.
    return null;
  }
});

/**
 * Branding as CSS custom properties, ready to put on a wrapper element.
 *
 * Returns an EMPTY object when the tenant has no branding, or has not set a
 * given colour — so the stylesheet's own values win by simply not being
 * overridden. There is deliberately no half-branded state where one custom
 * property is a customer's colour and the rest are SLP Command's by accident:
 * each variable is either set from real data or absent.
 */
export function brandingStyle(tenant: ResolvedTenant | null): React.CSSProperties {
  const branding = tenant?.branding;
  if (!branding) return {};
  const style: Record<string, string> = {};
  if (branding.primaryColor) {
    style["--accent"] = branding.primaryColor;
    style["--p-accent"] = branding.primaryColor;
  }
  if (branding.secondaryColor) style["--accent-dark"] = branding.secondaryColor;
  if (branding.accentColor) style["--accent-light"] = branding.accentColor;
  return style as React.CSSProperties;
}

/** What this tenant calls itself, falling back through to the product name. */
export function tenantDisplayName(tenant: ResolvedTenant | null): string {
  return tenant?.branding?.displayName?.trim() || tenant?.name?.trim() || "SLP Command";
}
