"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { seg: "", label: "Overview" },
  { seg: "students", label: "Students" },
  { seg: "alerts", label: "Alerts" },
];

export function TeacherShell({
  organizationId,
  organizationName,
  roleLabel,
  children,
}: {
  organizationId: string;
  organizationName: string | null;
  roleLabel: string;
  children: React.ReactNode;
}) {
  const path = usePathname() ?? "";
  const base = `/teacher/${organizationId}`;

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
        <nav className="teacher-nav">
          {NAV.map((item) => {
            const href = item.seg ? `${base}/${item.seg}` : base;
            const active = item.seg ? path.startsWith(href) : path === base;
            return (
              <Link key={item.label} href={href} data-active={active}>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      {children}
    </div>
  );
}
