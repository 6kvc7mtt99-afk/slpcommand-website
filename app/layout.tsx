import type { Metadata } from "next";
import "./globals.css";
import "../style.css";
import "./design-system.css";
import "./experience.css";
import "./product.css";
import "./task.css";
import "./intel.css";
import "./lesson.css";
import "./settings.css";
import "./records.css";
import "./instrument.css";
// The public site's design system. Imported last so it wins every tie with
// the product stylesheets; everything in it is scoped to `.site`, `.sh`, `.sf`.
import "./site.css";
import { SentryInit } from "./sentry-init";
import { MARKETING_PAGES } from "@/lib/site";

/**
 * The product had no typeface of its own — public site and app both ran on
 * the OS default, which is the loudest possible "generic web app" signal.
 * Archivo gives the display and UI real authority at size; IBM Plex Mono is
 * the instrument face used for every measured value (levels, clocks,
 * evidence counts) so data reads as data. Scoped to .app-shell in
 * product.css, so the marketing stylesheet owned by another session is
 * untouched.
 */
const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap";

export const metadata: Metadata = {
  metadataBase: new URL("https://slpcommand.com"),
  title: {
    default: MARKETING_PAGES.home.title,
    template: "%s — SLP Command",
  },
  description: MARKETING_PAGES.home.description,
  robots: { index: true, follow: true },
  /**
   * Search Console site verification.
   *
   * A verification meta tag sets no cookie, loads no script and collects
   * nothing, so it does not touch the Art. 22.2 LSSI-CE exemption the Cookie
   * Policy relies on. It is read from the environment and simply absent until
   * GOOGLE_SITE_VERIFICATION is set, so the property can be verified at deploy
   * time without another code change — and without shipping a token to the repo.
   *
   * Analytics is a separate decision and deliberately NOT implemented here:
   * GA4 would set non-essential cookies, which contradicts the Cookie Policy's
   * enumerated table and would require a consent banner, a Privacy Policy
   * update and a new subprocessor entry. See docs/growth/19_ANALYTICS_SPEC.md.
   */
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined,
  // No root canonical: it would be inherited by noindex routes and the 404,
  // where a canonical pointing at the homepage is a contradictory signal.
  // Every indexable page declares its own.
  openGraph: {
    type: "website",
    siteName: "SLP Command",
    locale: "en_GB",
    // 1200x630 card built by scripts/build-og.sh. The old value pointed at a
    // 294x640 phone screenshot, which is below X's 300px minimum for
    // summary_large_image and renders as a broken or tiny preview everywhere.
    images: [
      {
        url: "/assets/og/og-default.png",
        width: 1200,
        height: 630,
        alt: MARKETING_PAGES.home.ogAlt,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: MARKETING_PAGES.home.title,
    description: MARKETING_PAGES.home.description,
    images: ["/assets/og/og-default.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href={FONT_HREF} />
      </head>
      <body>
        <SentryInit />
        {children}
      </body>
    </html>
  );
}
