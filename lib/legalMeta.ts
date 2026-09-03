import * as legalContent from "@/content/legal";

/** The legal and support documents. The homepage and marketing pages are registered in lib/site.ts. */
export const PUBLIC_PAGES = [
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

const MONTHS: Record<string, string> = {
  january: "01", february: "02", march: "03", april: "04",
  may: "05", june: "06", july: "07", august: "08",
  september: "09", october: "10", november: "11", december: "12",
};

/**
 * Pull the date each legal document declares in its own "Last updated:" line.
 *
 * The sitemap used to stamp `new Date()` on these URLs, so every deploy told
 * Google that all fifteen legal pages had just changed. Google discounts a
 * <lastmod> it can see is untrue, which devalues the signal for the pages where
 * it is true. Reading the document's own date keeps it honest with no upkeep.
 */
function declaredUpdated(html: string): string | undefined {
  const match = html.match(/Last updated:\s*(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/i);
  if (!match) return undefined;
  const [, day, monthName, year] = match;
  const month = MONTHS[monthName.toLowerCase()];
  if (!month) return undefined;
  return `${year}-${month}-${day.padStart(2, "0")}`;
}

const LEGAL_SOURCE: Record<string, string | undefined> = {
  privacy: legalContent.privacy,
  terms: legalContent.terms,
  "ai-usage": legalContent.ai_usage,
  security: legalContent.security,
  cookies: legalContent.cookies,
  "data-retention": legalContent.data_retention,
  "delete-account": legalContent.delete_account,
  disclaimer: legalContent.disclaimer,
  "intellectual-property": legalContent.intellectual_property,
  "legal-notice": legalContent.legal_notice,
  subprocessors: legalContent.subprocessors,
  support: legalContent.support,
  contact: legalContent.contact,
  "trust-center": legalContent.trust_center,
};

/** Real last-modified date for a public page, or undefined if it declares none. */
export function publicPageUpdated(slug: string): string | undefined {
  const html = LEGAL_SOURCE[slug];
  return html ? declaredUpdated(html) : undefined;
}


/**
 * Every legal page previously fell through to one shared fallback sentence, so
 * fifteen indexable URLs shipped byte-identical meta descriptions. Each line
 * below states what that specific document actually governs.
 */
const DESCRIPTIONS: Record<string, string> = {
  "/privacy": "What personal data SLP Command processes, the legal basis, retention periods, subprocessors, and your GDPR rights. Controller contact included.",
  "/terms": "The contract for using SLP Command: accounts, subscriptions and renewal, acceptable use, AI-generated feedback limits, liability and governing law.",
  "/ai-usage": "How SLP Command uses AI to score Writing and Speaking, what the models can and cannot judge, and why we publish no pass probability.",
  "/security": "How SLP Command protects accounts, learner responses and audio: encryption, access control, retention, and how to report a vulnerability.",
  "/cookies": "Which cookies and local storage SLP Command sets, what each one does, how long it lasts, and which are strictly necessary.",
  "/data-retention": "How long SLP Command keeps accounts, written responses, Speaking audio, transcripts and performance history — and when each is deleted.",
  "/delete-account": "How to delete your SLP Command account, what is erased, what is retained for legal reasons, and how long the process takes.",
  "/disclaimer": "SLP Command is not affiliated with NATO, BILC, any Ministry of Defence, or any official examining body. AI feedback is indicative, not an official rating.",
  "/intellectual-property": "Ownership of SLP Command content and software, what learners may do with practice material, and how to report infringement.",
  "/legal-notice": "Statutory identification details for SLP Command, the publisher of slpcommand.com, including contact and regulatory information.",
  "/subprocessors": "The third-party providers that process data for SLP Command, what each handles, and where processing takes place.",
  "/support": "How to get help with SLP Command: reporting a problem, account and subscription questions, and expected response times.",
  "/contact": "How to reach SLP Command for support, privacy requests, press, partnerships and security disclosure.",
  "/trust-center": "One page for how SLP Command handles privacy, security, AI, retention and institutional independence, with links to every governing policy.",
};

const FALLBACK_DESCRIPTION =
  "Independent educational preparation for STANAG 6001 / SLP-style English exams.";

export function pageMetadata(title: string, path: string, description?: string) {
  const url = `https://slpcommand.com${path}`;
  const resolved = description ?? DESCRIPTIONS[path] ?? FALLBACK_DESCRIPTION;
  return {
    title,
    description: resolved,
    alternates: { canonical: url },
    openGraph: {
      title,
      description: resolved,
      url,
      siteName: "SLP Command",
      type: "website",
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
      title,
      description: resolved,
      images: ["/assets/og/og-default.png"],
    },
  };
}
