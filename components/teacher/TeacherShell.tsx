"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Permission } from "@/lib/platform/permissions";

// FASE PLATFORM-ENTERPRISE-001 — the shell grew an administration section.
//
// ONE PORTAL, NOT TWO. There is no separate "Enterprise admin" app: the
// Teacher portal gained the sections an administrator needs, and each is shown
// only to a role that can use it. That is the mandate's central rule applied
// to the UI — building a second portal would have meant a second shell, a
// second auth gate and a second navigation, all resolving the same membership.
//
// `permissions` is computed server-side in the layout from the caller's real
// membership. Hiding a link is UX, never the boundary: every page behind these
// links re-checks, and the backend re-checks again on every fetch. A teacher
// who types /settings gets a 404 page from the route, not a broken screen.

type NavItem = { seg: string; label: string; permission?: Permission };

const NAV: NavItem[] = [
  { seg: "", label: "Overview" },
  { seg: "students", label: "Students" },
  { seg: "groups", label: "Groups" },
  { seg: "alerts", label: "Alerts" },
  { seg: "reports", label: "Reports", permission: "reporting.read" },
];

const ADMIN_NAV: NavItem[] = [
  { seg: "members", label: "People", permission: "members.read" },
  { seg: "invites", label: "Invite", permission: "members.invite" },
  { seg: "settings", label: "Organization", permission: "organization.read" },
  { seg: "audit", label: "Security", permission: "audit.read" },
];

export function TeacherShell({
  organizationId,
  organizationName,
  roleLabel,
  permissions,
  children,
}: {
  organizationId: string;
  organizationName: string | null;
  roleLabel: string;
  permissions: readonly Permission[];
  children: React.ReactNode;
}) {
  const path = usePathname() ?? "";
  const base = `/teacher/${organizationId}`;

  const allowed = (item: NavItem) => !item.permission || permissions.includes(item.permission);
  const visibleAdmin = ADMIN_NAV.filter(allowed);

  const renderLink = (item: NavItem) => {
    const href = item.seg ? `${base}/${item.seg}` : base;
    const active = item.seg ? path.startsWith(href) : path === base;
    return (
      <Link key={item.label} href={href} data-active={active}>
        {item.label}
      </Link>
    );
  };

  return (
    <div className="teacher-shell">
      <aside className="teacher-sidebar">
        <div className="teacher-brand">
          SLP Command
          <small>Teacher</small>
        </div>
        <div className="teacher-org-name">
          {organizationName ?? "Untitled organization"}
          <br />
          {roleLabel}
        </div>
        <nav className="teacher-nav" aria-label="Teaching">
          {NAV.filter(allowed).map(renderLink)}
        </nav>
        {visibleAdmin.length > 0 ? (
          <nav className="teacher-nav teacher-nav-admin" aria-label="Administration">
            <span className="teacher-nav-heading">Administration</span>
            {visibleAdmin.map(renderLink)}
          </nav>
        ) : null}
      </aside>
      {children}
    </div>
  );
}
