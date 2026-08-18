import type { Metadata } from "next";
import "./globals.css";
import "../style.css";
import "./design-system.css";
import "./experience.css";
import { SentryInit } from "./sentry-init";

export const metadata: Metadata = {
  metadataBase: new URL("https://slpcommand.com"),
  title: {
    default: "SLP Command — STANAG 6001 / SLP 2 & 3 Trainer",
    template: "%s — SLP Command",
  },
  description:
    "Independent military English training for STANAG 6001 / SLP Levels 2 and 3. Reading, Listening, Writing and Speaking — measured against the constructs the exam rates. Not an official assessment.",
  robots: { index: true, follow: true },
  alternates: { canonical: "https://slpcommand.com/" },
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
        alt: "SLP Command — independent STANAG 6001 / SLP 2 and 3 trainer.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SLP Command — STANAG 6001 / SLP 2 & 3 Trainer",
    description:
      "Independent trainer for STANAG 6001 / SLP-style exams. Four skills. Two levels. Measured.",
    images: ["/assets/og/og-default.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SentryInit />
        {children}
      </body>
    </html>
  );
}
