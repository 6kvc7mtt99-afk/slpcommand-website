import type { ResolvedTenant } from "@/lib/platform/types";
import { brandingStyle, tenantDisplayName } from "@/lib/server/tenantContext";

// FASE PLATFORM-WHITELABEL-001 — the tenant's identity, rendered.
//
// A Server Component with no client JavaScript: the brand is decided by the
// hostname the server received, so there is nothing for a client to decide and
// nothing to hydrate. It also means a branded page paints branded on the first
// frame rather than flashing SLP Command's colours and then correcting itself.

/**
 * Wraps children in the tenant's colour scope. Renders a plain fragment when
 * there is no tenant, so the standard product costs exactly one extra element
 * fewer, not a wrapper that does nothing.
 */
export function TenantBrandScope({
  tenant,
  children,
}: {
  tenant: ResolvedTenant | null;
  children: React.ReactNode;
}) {
  const style = brandingStyle(tenant);
  if (Object.keys(style).length === 0) return <>{children}</>;
  return <div style={style} className="tenant-brand-scope">{children}</div>;
}

/**
 * The tenant's logo and name, for the top of a branded auth page.
 *
 * The logo is a plain <img>, not next/image: the URL is customer-supplied and
 * arbitrary, and routing it through the image optimizer would make an
 * outbound fetch to a host a customer chose, from our infrastructure, on every
 * cache miss. `referrerPolicy="no-referrer"` keeps the visitor's page out of
 * that host's logs. https is enforced at write time (lib/platform/
 * organization.js), so this cannot be a mixed-content request.
 */
export function TenantMark({ tenant }: { tenant: ResolvedTenant | null }) {
  if (!tenant) return null;
  const name = tenantDisplayName(tenant);
  const logo = tenant.branding?.logoUrl;
  return (
    <div className="tenant-mark">
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt={name} className="tenant-mark-logo" referrerPolicy="no-referrer" />
      ) : (
        <span className="tenant-mark-name">{name}</span>
      )}
    </div>
  );
}

/**
 * The branded headline block on a login page — the tenant's own words when it
 * has set them, and nothing at all when it has not. Deliberately renders
 * nothing rather than a generic "Welcome": an unbranded tenant should get the
 * page SLP Command already wrote, not a blander version of it.
 */
export function TenantLoginHeading({ tenant }: { tenant: ResolvedTenant | null }) {
  const headline = tenant?.branding?.loginHeadline?.trim();
  const sub = tenant?.branding?.loginSubheadline?.trim();
  if (!headline && !sub) return null;
  return (
    <div className="tenant-login-heading">
      {headline ? <p className="tenant-login-headline">{headline}</p> : null}
      {sub ? <p className="tenant-login-sub">{sub}</p> : null}
    </div>
  );
}
