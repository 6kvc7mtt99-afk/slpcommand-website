import type { Metadata } from "next";
import { currentTenant, tenantDisplayName } from "@/lib/server/tenantContext";
import { TenantBrandScope } from "@/components/platform/TenantBrand";

// FASE PLATFORM-WHITELABEL-001 — the login page wears the tenant's brand.
//
// This is the screen white-label actually has to get right: it is the first
// thing a customer's learners see, and the only one they see before they have
// an account context. Resolution happens HERE, in a Server Component, from the
// request's own hostname — so the page paints branded on the first frame
// instead of flashing SLP Command and correcting itself, and there is no
// client-side switch anyone could drive from the outside.

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await currentTenant();
  return {
    robots: { index: false, follow: false },
    // The browser tab is part of the brand. An unbranded host keeps the exact
    // title it had before this existed.
    title: tenant ? `Log in · ${tenantDisplayName(tenant)}` : "Log in",
    icons: tenant?.branding?.faviconUrl ? { icon: tenant.branding.faviconUrl } : undefined,
  };
}

export default async function Layout({ children }: { children: React.ReactNode }) {
  const tenant = await currentTenant();
  return <TenantBrandScope tenant={tenant}>{children}</TenantBrandScope>;
}
