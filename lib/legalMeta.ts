export const PUBLIC_PAGES = [
  { slug: "", title: "SLP Command — Military English Training Platform", path: "/" },
  { slug: "privacy", title: "Privacy Policy", path: "/privacy" },
  { slug: "terms", title: "Terms of Service", path: "/terms" },
  { slug: "ai-usage", title: "Responsible AI Policy", path: "/ai-usage" },
  { slug: "security", title: "Security Policy", path: "/security" },
  { slug: "cookies", title: "Cookie Policy", path: "/cookies" },
  { slug: "data-retention", title: "Data Retention Policy", path: "/data-retention" },
  { slug: "delete-account", title: "Account Deletion Policy", path: "/delete-account" },
  { slug: "disclaimer", title: "Institutional Disclaimer", path: "/disclaimer" },
  { slug: "intellectual-property", title: "Intellectual Property Policy", path: "/intellectual-property" },
  { slug: "legal-notice", title: "Legal Notice", path: "/legal-notice" },
  { slug: "subprocessors", title: "Subprocessors and Third Parties", path: "/subprocessors" },
  { slug: "support", title: "Support", path: "/support" },
  { slug: "contact", title: "Contact", path: "/contact" },
  { slug: "trust-center", title: "Trust Center", path: "/trust-center" },
] as const;

export function pageMetadata(title: string, path: string, description?: string) {
  const url = `https://slpcommand.com${path}`;
  return {
    title,
    description:
      description ??
      "Independent educational preparation for STANAG 6001 / SLP-style English exams.",
    alternates: { canonical: url },
    openGraph: {
      title,
      url,
      siteName: "SLP Command",
      type: "website",
    },
  };
}
