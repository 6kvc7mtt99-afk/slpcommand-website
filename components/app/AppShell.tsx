"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const NAV = [
  { href: "/dashboard", label: "Home" },
  { href: "/reading", label: "Reading" },
  { href: "/listening", label: "Listening" },
  { href: "/writing", label: "Writing" },
  { href: "/speaking", label: "Speaking" },
  { href: "/progress", label: "Progress" },
  { href: "/profile", label: "Profile" },
];

export function AppShell({
  children,
  planLabel,
}: {
  children: React.ReactNode;
  planLabel: string;
}) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [path]);

  async function logout() {
    const me = await fetch("/api/auth/me", { credentials: "same-origin" }).then((r) => r.json()).catch(() => ({})) as { userId?: string };
    if (me.userId) {
      localStorage.removeItem(`onboarding_completed:${me.userId}`);
      localStorage.removeItem(`weekly_goal_days:${me.userId}`);
      localStorage.removeItem(`target_exam_date:${me.userId}`);
      localStorage.removeItem(`writing_exam_autosave:${me.userId}`);
      localStorage.removeItem(`speaking_ai_consent_given:${me.userId}`);
      try {
        const today = new Date();
        const ymd = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}-${String(today.getUTCDate()).padStart(2, "0")}`;
        sessionStorage.removeItem(`exam-idemp:${me.userId}:reading:${ymd}`);
        sessionStorage.removeItem(`exam-idemp:${me.userId}:listening:${ymd}`);
      } catch {
        /* ignore */
      }
    }
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    router.replace("/login");
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <button className="app-menu-btn" type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        Menu
      </button>
      <aside className={`app-sidebar ${open ? "open" : ""}`}>
        <Link href="/dashboard" className="brand" style={{ padding: "8px 4px 20px" }}>
          <div className="logo-mark">SLP</div>
          <span className="brand-name">
            SLP <span>Command</span>
          </span>
        </Link>
        <nav>
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className={path === item.href || path.startsWith(item.href + "/") ? "active" : ""}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="app-plan">{planLabel}</div>
        <button type="button" className="btn btn-outline" onClick={logout} style={{ marginTop: 12 }}>
          Log out
        </button>
      </aside>
      <div className="app-main" id="main">
        {children}
      </div>
    </div>
  );
}
