import { currentTenant } from "@/lib/server/tenantContext";
import { TenantMark, TenantLoginHeading } from "@/components/platform/TenantBrand";
import { LoginForm } from "@/components/auth/LoginForm";

// FASE PLATFORM-WHITELABEL-001 — the login page resolves its tenant.
//
// Server Component on purpose: the brand comes from the hostname THIS server
// received, so nothing a client sends can change it, and the page paints
// branded on the first frame instead of flashing SLP Command and correcting
// itself. The form is unchanged and still a client component
// (components/auth/LoginForm.tsx) — only where the brand is decided moved.
//
// On slpcommand.com currentTenant() returns null, both slots render nothing,
// and this is byte-for-byte the page that was here before.

export default async function LoginPage() {
  const tenant = await currentTenant();
  return (
    <LoginForm
      brandMark={<TenantMark tenant={tenant} />}
      brandHeading={<TenantLoginHeading tenant={tenant} />}
    />
  );
}
