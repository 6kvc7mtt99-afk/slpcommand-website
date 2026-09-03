"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { LOGIN_LINK, PRIMARY_CTA, PRIMARY_NAV } from "@/lib/site";

export type HeaderLink = { href: string; label: string };

export function LogoMark({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="sh-brand" aria-label="SLP Command home">
      <span className="sh-mark" aria-hidden="true">
        SLP
      </span>
      <span className="sh-name">
        SLP <span>Command</span>
      </span>
    </Link>
  );
}

/**
 * The public header.
 *
 * One row on a wide screen: brand, five destinations, log in, one action. On a
 * phone the destinations fold into a disclosure panel under the bar; the brand
 * and the action never leave the first row, because they are the two things a
 * visitor arriving from search must always be able to reach.
 *
 * `links` exists for the auth ceremonies (login, signup) that mount this header
 * with a reduced link set; they pass it in and are otherwise untouched.
 */
export function SiteHeader({
  links,
  primary = PRIMARY_CTA,
}: {
  links?: HeaderLink[];
  primary?: HeaderLink | null;
}) {
  // `usePathname` is null outside the App Router (unit tests render these
  // pages to static markup), so it is normalised once here.
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const nav = links ?? PRIMARY_NAV;
  const showLogin = !links && pathname !== LOGIN_LINK.href;
  // The auth ceremonies pass their own link to the signup; one action is enough.
  const primaryDuplicated = Boolean(primary && links?.some((item) => item.href === primary.href));
  const showPrimary = primary && pathname !== primary.href && !primaryDuplicated;

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const current = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(`${href}/`)) ? "page" : undefined;

  return (
    <header className="sh">
      <div className="sh-inner">
        <LogoMark />
        <nav className="sh-nav" aria-label="Primary">
          {nav.map((item) => (
            <Link key={item.href + item.label} href={item.href} aria-current={current(item.href)}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="sh-actions">
          {showLogin ? (
            <Link className="sh-login" href={LOGIN_LINK.href}>
              {LOGIN_LINK.label}
            </Link>
          ) : null}
          {showPrimary ? (
            <Link className="s-btn s-btn--primary s-btn--sm" href={primary.href}>
              {primary.label}
            </Link>
          ) : null}
          <button
            type="button"
            className="sh-toggle"
            aria-expanded={open}
            aria-controls={panelId}
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((value) => !value)}
          >
            <svg className="is-open" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path d="M3 6h14M3 10h14M3 14h14" strokeLinecap="round" />
            </svg>
            <svg className="is-close" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
      <div id={panelId} className="sh-panel" data-open={open} hidden={!open}>
        <nav className="sh-panel-inner" aria-label="Primary, mobile">
          {nav.map((item) => (
            <Link key={item.href + item.label} href={item.href} aria-current={current(item.href)}>
              {item.label}
              <span aria-hidden="true">→</span>
            </Link>
          ))}
          {showLogin ? (
            <Link className="sh-panel-login" href={LOGIN_LINK.href}>
              {LOGIN_LINK.label}
              <span aria-hidden="true">→</span>
            </Link>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
