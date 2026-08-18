"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SupportAssistant } from "./SupportAssistant";

const NAV = [
  { href: "/dashboard", label: "Home", skill: null },
  { href: "/reading", label: "Reading", skill: "reading" },
  { href: "/listening", label: "Listening", skill: "listening" },
  { href: "/writing", label: "Writing", skill: "writing" },
  { href: "/speaking", label: "Speaking", skill: "speaking" },
  { href: "/progress", label: "Progress", skill: null },
  { href: "/profile", label: "Profile", skill: null },
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

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

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

  const nav = (
    <>
      <Link href="/dashboard" className="brand">
        <div className="logo-mark">SLP</div>
        <span className="brand-name">
          SLP <span>Command</span>
        </span>
      </Link>
      <nav aria-label="Workspace">
        {NAV.map((item) => {
          const active = path === item.href || path.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={active ? "active" : ""}
              data-skill={item.skill ?? undefined}
              aria-current={active ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="app-plan">{planLabel}</div>
      <SupportAssistant />
      <button type="button" className="btn btn-outline" onClick={logout}>
        Log out
      </button>
    </>
  );

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="app-topbar">
        <button className="app-menu-btn" type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls="app-nav">
          Menu
        </button>
        <Link href="/dashboard" className="brand">
          <div className="logo-mark">SLP</div>
          <span className="brand-name">
            SLP <span>Command</span>
          </span>
        </Link>
      </header>
      <div className={`app-backdrop ${open ? "open" : ""}`} onClick={() => setOpen(false)} hidden={!open} />
      <aside id="app-nav" className={`app-sidebar ${open ? "open" : ""}`}>
        {nav}
      </aside>
      <div className="app-main" id="main">
        {children}
      </div>
    </div>
  );
}
