import Link from "next/link";

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
    { href: "/#features", label: "Features" },
    { href: "/#method", label: "Method" },
    { href: "/#pricing", label: "Pricing" },
    { href: "/#how", label: "How it works" },
    { href: "/#roadmap", label: "Roadmap" },
    { href: "/#faq", label: "FAQ" },
    { href: "/trust-center", label: "Trust Center" },
    { href: "/support", label: "Support" },
    { href: "/login", label: "Log in" },
  ];
  return (
    <header className="site-header">
      <LogoMark />
      <nav>
        {nav.map((item) => (
          <Link key={item.href + item.label} href={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-brand">SLP Command</div>
      <div className="footer-links">
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
