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

/**
 * The footer previously listed twenty-four links at identical weight in one
 * flat row: the STANAG guides that are the site's reason to exist sat between
 * "Subprocessors" and "Delete account". Grouping them states what this company
 * does first and what it is obliged to publish second, and gives the legal
 * column somewhere to live without competing.
 */
const FOOTER_GROUPS: { heading: string; links: { href: string; label: string }[] }[] = [
  {
    heading: "Learn",
    links: [
      { href: "/guides", label: "All guides" },
      { href: "/stanag-6001", label: "STANAG 6001" },
      { href: "/slp", label: "What SLP means" },
      { href: "/slp-2", label: "SLP 2" },
      { href: "/slp-3", label: "SLP 3" },
      { href: "/guides/writing", label: "Writing" },
      { href: "/guides/listening", label: "Listening" },
      { href: "/exam", label: "Exam simulation" },
    ],
  },
  {
    heading: "España",
    links: [
      { href: "/es/examen-slp", label: "Examen SLP" },
      { href: "/es/slp-2", label: "SLP 2222" },
      { href: "/es/slp-3", label: "SLP 3333" },
    ],
  },
  {
    heading: "Product",
    links: [
      { href: "/about", label: "About" },
      { href: "/#pricing", label: "Pricing" },
      { href: "/signup", label: "Start free" },
      { href: "/support", label: "Support" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    heading: "Trust",
    links: [
      { href: "/trust-center", label: "Trust Center" },
      { href: "/disclaimer", label: "Disclaimer" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
      { href: "/ai-usage", label: "Responsible AI" },
      { href: "/security", label: "Security" },
      { href: "/cookies", label: "Cookies" },
      { href: "/data-retention", label: "Data retention" },
      { href: "/subprocessors", label: "Subprocessors" },
      { href: "/intellectual-property", label: "Intellectual property" },
      { href: "/legal-notice", label: "Legal notice" },
      { href: "/delete-account", label: "Delete account" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-identity">
          <div className="footer-brand">SLP Command</div>
          <p className="footer-line">
            Independent training for STANAG 6001 / SLP Levels 2 and 3. Reading,
            Listening, Writing and Speaking, measured against the constructs the
            exam rates.
          </p>
          <p className="footer-disclaimer">
            Not NATO. Not a Ministry of Defence. Not an official examining body.
            AI feedback is indicative guidance, not an official assessment.
          </p>
        </div>
        <div className="footer-columns">
          {FOOTER_GROUPS.map((group) => (
            <nav key={group.heading} aria-label={group.heading}>
              <h2>{group.heading}</h2>
              <ul>
                {group.links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link href={link.href}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>
      <p className="footer-legal">
        © 2026 SLP Command. Not affiliated with NATO or any official body.
      </p>
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
