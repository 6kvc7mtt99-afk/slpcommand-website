import Link from "next/link";
import { SIGNUP_PATH } from "@/lib/conversion";

export function LogoMark() {
  return (
    <Link href="/" className="brand">
      <div className="logo-mark">SLP</div>
      <span className="brand-name">
        SLP <span>Command</span>
      </span>
    </Link>
  );
}

export function SiteHeader({ links }: { links?: { href: string; label: string }[] }) {
  const nav = links ?? [
    { href: "/guides", label: "Learn" },
    { href: "/#features", label: "Features" },
    { href: "/#pricing", label: "Pricing" },
    { href: "/trust-center", label: "Trust" },
    { href: "/support", label: "Support" },
    { href: "/login", label: "Log in" },
  ];
  // The public site had no registration entry point outside the login link, so
  // every organic reader who wanted to act had to work out that "Log in" also
  // leads to an account. The free plan is the honest first step while the iOS
  // app is unreleased, so it gets its own action.
  const primary = { href: SIGNUP_PATH, label: "Start free" };
  return (
    <header className="site-header">
      <LogoMark />
      <nav>
        {nav.map((item) => (
          <Link key={item.href + item.label} href={item.href}>
            {item.label}
          </Link>
        ))}
        <Link className="nav-cta" href={primary.href}>
          {primary.label}
        </Link>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-brand">SLP Command</div>
      <p>Independent STANAG 6001 / SLP preparation. Not NATO. Not an official exam.</p>
      <div className="footer-links">
        <Link href="/guides">Guides</Link>
        <Link href="/stanag-6001">STANAG 6001</Link>
        <Link href="/slp">What is SLP</Link>
        <Link href="/slp-2">SLP 2</Link>
        <Link href="/slp-3">SLP 3</Link>
        <Link href="/es/examen-slp">Examen SLP</Link>
        <Link href="/guides/writing">Writing</Link>
        <Link href="/guides/listening">Listening</Link>
        <Link href="/exam">Exam</Link>
        <Link href="/about">About</Link>
        <Link href="/trust-center">Trust Center</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/ai-usage">Responsible AI</Link>
        <Link href="/security">Security</Link>
        <Link href="/cookies">Cookies</Link>
        <Link href="/data-retention">Data Retention</Link>
        <Link href="/intellectual-property">IP</Link>
        <Link href="/subprocessors">Subprocessors</Link>
        <Link href="/legal-notice">Legal Notice</Link>
        <Link href="/disclaimer">Disclaimer</Link>
        <Link href="/support">Support</Link>
        <Link href="/contact">Contact</Link>
        <Link href="/delete-account">Delete account</Link>
      </div>
      <p>© 2026 SLP Command. Not affiliated with NATO or any official body.</p>
    </footer>
  );
}

export function LegalChrome({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader
        links={[
          { href: "/trust-center", label: "Trust Center" },
          { href: "/support", label: "Support" },
          { href: "/contact", label: "Contact" },
        ]}
      />
      {children}
    </>
  );
}
