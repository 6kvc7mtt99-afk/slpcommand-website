"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SupportAssistant } from "./SupportAssistant";
import { usePlan } from "./PlanProvider";
import { Reveal } from "@/components/ui/Reveal";
import { RouteTransition } from "./RouteTransition";

const NAV = [
  { href: "/dashboard", label: "Home", skill: null },
  { href: "/reading", label: "Reading", skill: "reading" },
  { href: "/listening", label: "Listening", skill: "listening" },
  { href: "/writing", label: "Writing", skill: "writing" },
  { href: "/speaking", label: "Speaking", skill: "speaking" },
  { href: "/progress", label: "Progress", skill: null },
  { href: "/profile", label: "Profile", skill: null },
];

export function AppShell({ children, showTeacherNav }: { children: React.ReactNode; showTeacherNav: boolean }) {
  const { display } = usePlan();
  // usePathname can be null during a transition; `path.startsWith` below would
  // throw and take the whole shell down with it.
  const path = usePathname() ?? "";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setOpen(false);
  }, [path]);

  /**
   * The mobile drawer, as a real dialog.
   *
   * Below 960px the sidebar slides over the page as a modal panel, but it
   * behaved like static markup: Tab walked straight out of it into the content
   * underneath, the page kept scrolling behind it, focus never entered it, and
   * nothing returned focus to the button that opened it. Escape was the only
   * part already handled.
   *
   * The dialog semantics are applied ONLY while open — above 960px the same
   * element is a permanent navigation rail, and announcing that as a modal
   * would be a lie. Everything here is keyed off `open`, which only the
   * mobile menu button can set.
   */
  useEffect(() => {
    if (!open) return;
    const panel = navRef.current;
    const opener = menuButtonRef.current;

    const focusable = () =>
      Array.from(
        panel?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );

    focusable()[0]?.focus();
    document.documentElement.classList.add("nav-open");

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !panel?.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.documentElement.classList.remove("nav-open");
      // Only pull focus back if it is still inside the panel we are closing —
      // a click on a nav link should let the destination take focus.
      if (panel?.contains(document.activeElement)) opener?.focus();
    };
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
      {/* TEACHER-UX-POLISH-001 — visible only to a real staff membership
          (resolved server-side, see app/(app)/layout.tsx); hiding it from
          everyone else is UX, not the security boundary — /teacher/* stays
          independently gated regardless of whether this renders. */}
      {showTeacherNav ? (
        <nav aria-label="Staff">
          <Link href="/teacher" className="app-teacher-link">
            SLP Command Teacher
          </Link>
        </nav>
      ) : null}
      {/* The plan, as a link rather than a label: it was the one piece of
          commercial state in the chrome with nowhere to go. `known` is false
          while the read is in flight or after it failed — the chip then says so
          instead of asserting a plan the app has not been told. */}
      <Link className={`app-plan${display.known ? "" : " is-unknown"}`} href="/subscription">
        {display.label}
      </Link>
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
        <button
          ref={menuButtonRef}
          className="app-menu-btn"
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="app-nav"
          aria-label={open ? "Close navigation" : "Open navigation"}
        >
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
      {/* Dialog semantics only while it is a drawer. Above 960px this same
          element is a static rail and must not claim to be modal. */}
      <aside
        id="app-nav"
        ref={navRef}
        className={`app-sidebar ${open ? "open" : ""}`}
        {...(open ? { role: "dialog" as const, "aria-modal": true, "aria-label": "Workspace navigation" } : {})}
      >
        {nav}
      </aside>
      {/* Keyed on the route so both the entrance animation and the reveal
          observer re-run on every client-side navigation, instead of only
          on the first hard load. */}
      <RouteTransition />
      {/* A real landmark. The skip link targets #main, and a screen-reader
          user navigating by landmark had nothing to land on — the
          authenticated product had no <main> at all. */}
      <main className="app-main" id="main" key={path}>
        <Reveal />
        {children}
      </main>
    </div>
  );
}
