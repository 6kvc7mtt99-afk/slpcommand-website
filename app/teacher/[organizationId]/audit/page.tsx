import { notFound } from "next/navigation";
import { loadTeacherMemberships } from "@/lib/server/teacher";
import { loadOrganizationAudit } from "@/lib/server/platform";
import { hasPermission, PERMISSIONS } from "@/lib/platform/permissions";

// FASE PLATFORM-ENTERPRISE-001 — the organization's own audit trail.
//
// Only administrative actions taken INSIDE this organization appear. Learner
// activity is not here (that is Reports), and platform-wide events are not
// here either — an organization's trail is about who changed what in it.

export const dynamic = "force-dynamic";

const EVENT_COPY: Record<string, string> = {
  "org.member_invited": "invited someone",
  "org.member_joined": "joined",
  "org.member_role_changed": "changed a member's role",
  "org.member_removed": "removed a member",
  "org.member_group_changed": "moved a member between groups",
  "org.invite_revoked": "revoked an invitation",
  "org.group_created": "created a group",
  "org.branding_updated": "updated branding",
  "org.branding_cleared": "reset branding to the default",
  "org.settings_updated": "changed organization settings",
  "org.flag_changed": "changed a feature",
  "org.entitlement_changed": "changed the organization's plan",
};

function describeMetadata(event: string, metadata: Record<string, string | number | boolean>): string | null {
  if (event === "org.member_role_changed" && metadata.from && metadata.to) {
    return `${metadata.from} → ${metadata.to}`;
  }
  if (event === "org.flag_changed") {
    return typeof metadata.enabled === "boolean" ? (metadata.enabled ? "turned on" : "turned off") : null;
  }
  if (event === "org.branding_updated" && typeof metadata.fields === "string") {
    return metadata.fields.split(",").join(", ");
  }
  if (event === "org.entitlement_changed" && metadata.planKey) {
    return String(metadata.planKey);
  }
  return null;
}

export default async function AuditPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  const memberships = await loadTeacherMemberships();
  if (!memberships.some((m) => m.organizationId === organizationId)) notFound();
  if (!hasPermission(memberships, organizationId, PERMISSIONS.AUDIT_READ)) notFound();

  const page = await loadOrganizationAudit(organizationId, 100);
  if (!page) {
    return <div className="teacher-empty">Could not load the audit trail right now.</div>;
  }

  return (
    <>
      <h1 className="teacher-h1">Security</h1>
      <p className="teacher-sub">
        Every administrative change made in this organization. Learner activity is not recorded
        here — see Reports for that.
      </p>

      {page.entries.length === 0 ? (
        <div className="teacher-empty">
          <strong>Nothing recorded yet.</strong>
          <p>
            Changes to members, roles, groups, branding and features appear here as they happen.
          </p>
        </div>
      ) : (
        <>
          <div className="teacher-table-scroll">
            <table className="teacher-table">
              <caption className="teacher-caption">
                Most recent first. Showing {page.entries.length} of {page.total}.
              </caption>
              <thead>
                <tr>
                  <th scope="col">When</th>
                  <th scope="col">Who</th>
                  <th scope="col">What</th>
                  <th scope="col">Detail</th>
                </tr>
              </thead>
              <tbody>
                {page.entries.map((entry) => {
                  const detail = describeMetadata(entry.event, entry.metadata);
                  return (
                    <tr key={entry.id}>
                      <td>{entry.at.replace("T", " ").slice(0, 16)}</td>
                      <td>
                        {entry.actorName ?? entry.actorEmail ?? (
                          // The row survives even when the person's profile no
                          // longer does — losing the record because an account
                          // was deleted would defeat the point of having it.
                          <span className="teacher-muted">Account no longer available</span>
                        )}
                      </td>
                      <td>{EVENT_COPY[entry.event] ?? entry.event}</td>
                      <td>{detail ?? <span className="teacher-muted">—</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {page.total > page.entries.length ? (
            <p className="teacher-note">
              Older entries are kept but not shown here. Contact SLP Command if you need a full
              export.
            </p>
          ) : null}
        </>
      )}
    </>
  );
}
