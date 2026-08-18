import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/marketing/SiteChrome";

/**
 * A branded 404.
 *
 * The site previously fell through to the stock Next.js page, so any decayed or
 * mistyped authority URL — the ones most likely to be reached from an old link,
 * a social post, or an AI answer citing a path that moved — ended on an unbranded
 * dead end with no route back into the guides cluster.
 */
export const metadata: Metadata = {
  title: "Page not found",
  description:
    "That page is not on slpcommand.com. Start from the STANAG 6001 and SLP guides instead.",
  robots: { index: false, follow: true },
};

const ROUTES = [
  { href: "/stanag-6001", label: "What STANAG 6001 is", hint: "The standard, and why there is no single NATO exam" },
  { href: "/slp", label: "What SLP means", hint: "The four-digit profile, in order" },
  { href: "/slp-2", label: "SLP 2", hint: "The functional profile" },
  { href: "/slp-3", label: "SLP 3", hint: "The professional profile" },
  { href: "/guides", label: "All guides", hint: "Writing, listening and exam preparation" },
  { href: "/es/examen-slp", label: "Examen SLP (español)", hint: "Qué es y cómo prepararlo" },
];

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="wrap authority">
        <p className="authority-kicker">404</p>
        <h1>That page is not here</h1>
        <p>
          The address may have changed, or it was never a page on this site. Nothing
          below is a guess — these are the reference pages that do exist.
        </p>
        <nav className="authority-related" aria-label="Main sections">
          <ul>
            {ROUTES.map((route) => (
              <li key={route.href}>
                <Link href={route.href}>{route.label}</Link>
                <span className="muted"> — {route.hint}</span>
              </li>
            ))}
          </ul>
        </nav>
        <p>
          If you followed a link from somewhere on this site, please{" "}
          <Link href="/support">tell us</Link> so it can be fixed.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
