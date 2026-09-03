import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/site/SiteShell";

/**
 * A branded 404 inside the public shell, so a decayed link from a social post
 * or an AI answer still lands on a page with the whole site reachable.
 */
export const metadata: Metadata = {
  title: "Page not found",
  description: "That page is not on slpcommand.com. Start from the product, the guides or the pricing instead.",
  // The root layout declares index,follow; a 404 must not inherit it.
  robots: { index: false, follow: true },
};

const ROUTES = [
  { href: "/product", label: "How SLP Command works", hint: "The four skills, intelligence and exam simulation" },
  { href: "/pricing", label: "Pricing", hint: "Free and Professional, every allowance" },
  { href: "/stanag-6001", label: "What STANAG 6001 is", hint: "The standard, and why there is no single NATO exam" },
  { href: "/slp-3", label: "SLP 3", hint: "The professional profile" },
  { href: "/guides", label: "All guides", hint: "What the raters judge in each skill" },
  { href: "/es/examen-slp", label: "Examen SLP (español)", hint: "Qué es y cómo prepararlo" },
];

export default function NotFound() {
  return (
    <SiteShell>
      <div className="s-wrap lost">
        <p className="s-eyebrow">404</p>
        <h1>That page is not here</h1>
        <p>The address may have changed, or it was never a page on this site. These are the pages that do exist.</p>
        <ul>
          {ROUTES.map((route) => (
            <li key={route.href}>
              <Link href={route.href}>
                <b>{route.label}</b>
                <span>{route.hint}</span>
              </Link>
            </li>
          ))}
        </ul>
        <p>
          If you followed a link from somewhere on this site, please <Link href="/support">tell us</Link> so it can be fixed.
        </p>
      </div>
    </SiteShell>
  );
}
