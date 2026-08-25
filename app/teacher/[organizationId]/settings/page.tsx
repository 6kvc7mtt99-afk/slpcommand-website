import { notFound } from "next/navigation";
import { loadTeacherMemberships } from "@/lib/server/teacher";
import { loadOrganizationSettings, loadOrganizationFlags, loadDomainClaim } from "@/lib/server/platform";
import { hasPermission, PERMISSIONS } from "@/lib/platform/permissions";
import { BrandingForm } from "@/components/teacher/BrandingForm";
import { OrganizationNameForm } from "@/components/teacher/OrganizationNameForm";
import { FlagToggles } from "@/components/teacher/FlagToggles";
import { DomainManager } from "@/components/teacher/DomainManager";

// FASE PLATFORM-TENANT-001 — Organization settings.
//
// WHAT IS EDITABLE HERE AND WHAT IS NOT, and why the difference is shown
// rather than hidden: branding and the organization's own name belong to the
// customer. Its ADDRESS — the slug that becomes a subdomain, and any custom
// domain — is assigned by SLP Command, because addresses are contended and a
// tenant that could assign its own could take a hostname or a name promised
// to someone else. Showing those as read-only, with who to ask, is more
// useful than omitting them and leaving an administrator wondering where
// their white-label URL is configured.

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  const memberships = await loadTeacherMemberships();
  if (!memberships.some((m) => m.organizationId === organizationId)) notFound();
  if (!hasPermission(memberships, organizationId, PERMISSIONS.ORGANIZATION_READ)) notFound();

  const canWrite = hasPermission(memberships, organizationId, PERMISSIONS.ORGANIZATION_WRITE);
  const canBrand = hasPermission(memberships, organizationId, PERMISSIONS.BRANDING_WRITE);

  const canManageDomain = hasPermission(memberships, organizationId, PERMISSIONS.DOMAIN_MANAGE);

  const [loaded, flags, domainClaim] = await Promise.all([
    loadOrganizationSettings(organizationId),
    loadOrganizationFlags(organizationId),
    loadDomainClaim(organizationId),
  ]);

  if (!loaded) {
    return <div className="teacher-empty">Could not load settings right now.</div>;
  }

  const { settings, branding } = loaded;

  return (
    <>
      <h1 className="teacher-h1">Organization</h1>
      <p className="teacher-sub">Settings, branding and features for {settings.name}.</p>

      <section className="teacher-section">
        <h2 className="teacher-h2">Details</h2>
        {canWrite ? (
          <OrganizationNameForm organizationId={organizationId} name={settings.name} />
        ) : (
          <p className="teacher-note"><strong>{settings.name}</strong></p>
        )}

        <div className="teacher-table-scroll">
          <table className="teacher-table">
            <caption className="teacher-caption">
              These identify your organization across SLP Command. To change any of them, or to
              set up a custom domain, contact SLP Command — addresses are assigned by us so that
              two customers can never claim the same one.
            </caption>
            <tbody>
              <tr>
                <th scope="row">Plan type</th>
                <td>{settings.type.replace("_", "-")}</td>
              </tr>
              <tr>
                <th scope="row">Address</th>
                <td>
                  {settings.slug
                    ? <code>{settings.slug}.slpcommand.com</code>
                    : <span className="teacher-muted">Not assigned</span>}
                </td>
              </tr>
              <tr>
                <th scope="row">Created</th>
                <td>{settings.createdAt.slice(0, 10)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="teacher-section">
        <h2 className="teacher-h2">Custom domain</h2>
        <p className="teacher-sub">
          Serve your academy on your own address. Ownership is verified with a DNS record, so a
          domain only goes live once you have proven you control it.
        </p>
        {domainClaim ? (
          <DomainManager
            organizationId={organizationId}
            claim={domainClaim}
            canManage={canManageDomain}
          />
        ) : (
          <div className="teacher-empty">Could not load the domain configuration right now.</div>
        )}
      </section>

      <section className="teacher-section">
        <h2 className="teacher-h2">Branding</h2>
        {canBrand ? (
          <>
            <p className="teacher-sub">
              How SLP Command looks for your learners. Leave a field blank to fall back to the
              SLP Command default — the app never shows a half-branded mix of the two.
            </p>
            <BrandingForm organizationId={organizationId} branding={branding} />
          </>
        ) : (
          <p className="teacher-note">
            {branding?.displayName
              ? `This organization appears to learners as "${branding.displayName}".`
              : "This organization uses the standard SLP Command appearance."}
            {" "}Only an owner or admin can change branding.
          </p>
        )}
      </section>

      {flags ? (
        <section className="teacher-section">
          <h2 className="teacher-h2">Features</h2>
          <FlagToggles organizationId={organizationId} flags={flags} canWrite={canWrite} />
        </section>
      ) : null}
    </>
  );
}
