import type { Metadata } from "next";
import "./globals.css";
import "../style.css";
import "./design-system.css";
import { SentryInit } from "./sentry-init";

export const metadata: Metadata = {
  metadataBase: new URL("https://slpcommand.com"),
  title: {
    default: "SLP Command — Military English Training Platform",
    template: "%s — SLP Command",
  },
  description:
    "SLP Command — military English training for STANAG 6001 / SLP Levels 2 and 3. A measurement-first platform: every recommendation names the evidence behind it, across Reading, Listening, Writing and Speaking.",
  robots: { index: true, follow: true },
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
