import type { Metadata } from "next";
import { SIGNUP_PATH } from "@/lib/conversion";

/**
 * The public site's information architecture, in one place.
 *
 * Navigation, the sitemap, the crawl tests and every marketing page's
 * metadata read from here, so a page cannot exist in the header and be
 * missing from the sitemap, or carry a title that drifts from its card.
 */

export const SITE_ORIGIN = "https://slpcommand.com";

/** Date the redesigned marketing pages went live. Sitemap lastmod — never `new Date()`. */
export const MARKETING_UPDATED = "2026-09-02";

export type MarketingPage = {
  path: string;
  /** Browser-tab title. Rendered through the root "%s — SLP Command" template unless it already names the brand. */
  title: string;
  /** Meta description, 120–170 characters, unique across the site. */
  description: string;
  /** Static 1200×630 card under public/assets/og/. */
  ogImage: string;
  ogAlt: string;
  /** Primary search intent this URL owns. One per URL, never shared. */
  primaryKeyword: string;
};

export const MARKETING_PAGES = {
  home: {
    path: "/",
    title: "SLP Command — SLP / STANAG 6001 English exam preparation",
    description:
      "Independent training platform for STANAG 6001 / SLP Levels 2 and 3: Reading, Listening, Writing and Speaking, practised and assessed against what the exam rates.",
    ogImage: "/assets/og/og-default.png",
    ogAlt: "SLP Command — SLP preparation, measured skill by skill.",
    primaryKeyword: "SLP exam preparation",
  },
  product: {
    path: "/product",
    title: "Product — how SLP Command trains the four SLP skills",
    description:
      "How SLP Command trains and assesses Reading, Listening, Writing and Speaking for STANAG 6001 / SLP Levels 2 and 3: practice, timed exam simulation, AI-rated Writing and Speaking, and performance intelligence.",
    ogImage: "/assets/og/og-product.png",
    ogAlt: "SLP Command — the four skills, trained against what the rater applies.",
    primaryKeyword: "SLP English practice platform",
  },
  pricing: {
    path: "/pricing",
    title: "Pricing — Free and Professional plans",
    description:
      "SLP Command pricing: a free plan with real practice allowances in all four skills, and Professional at €9.99 a month with unlimited AI feedback, unlimited exam simulations and the live Speaking Coach.",
    ogImage: "/assets/og/og-pricing.png",
    ogAlt: "SLP Command pricing — Free measures all four skills; Professional removes the caps.",
    primaryKeyword: "SLP Command pricing",
  },
  academies: {
    path: "/academies",
    title: "For academies — SLP Command for training organisations",
    description:
      "SLP Command for language academies and training units preparing STANAG 6001 / SLP candidates: cohort measurement, per-student progress and weakness profiles, and Writing oversight. Early access.",
    ogImage: "/assets/og/og-academies.png",
    ogAlt: "SLP Command for academies — train a cohort the way the exam measures it.",
    primaryKeyword: "SLP preparation for academies",
  },
} as const satisfies Record<string, MarketingPage>;

export type MarketingPageId = keyof typeof MARKETING_PAGES;

export function allMarketingPages(): MarketingPage[] {
  return Object.values(MARKETING_PAGES);
}

export function marketingMetadata(id: MarketingPageId): Metadata {
  const page = MARKETING_PAGES[id];
  const url = `${SITE_ORIGIN}${page.path}`;
  const image = { url: page.ogImage, width: 1200, height: 630, alt: page.ogAlt };
  return {
    title: page.title.includes("SLP Command") ? { absolute: page.title } : page.title,
    description: page.description,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    openGraph: {
      title: page.title,
      description: page.description,
      url,
      siteName: "SLP Command",
      type: "website",
      locale: "en_GB",
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: page.title,
      description: page.description,
      images: [page.ogImage],
    },
  };
}

/** Header navigation. Five destinations; everything else lives in the footer. */
export const PRIMARY_NAV: { href: string; label: string }[] = [
  { href: "/product", label: "Product" },
  { href: "/method", label: "Method" },
  { href: "/pricing", label: "Pricing" },
  { href: "/academies", label: "Academies" },
  { href: "/guides", label: "Guides" },
];

export const LOGIN_LINK = { href: "/login", label: "Log in" };
export const PRIMARY_CTA = { href: SIGNUP_PATH, label: "Start free" };

export const FOOTER_GROUPS: { heading: string; links: { href: string; label: string }[] }[] = [
  {
    heading: "Product",
    links: [
      { href: "/product", label: "How it works" },
      { href: "/pricing", label: "Pricing" },
      { href: "/academies", label: "For academies" },
      { href: "/method", label: "How we measure" },
      { href: "/about", label: "About" },
      { href: SIGNUP_PATH, label: "Start free" },
      { href: "/login", label: "Log in" },
    ],
  },
  {
    heading: "Learn",
    links: [
      { href: "/guides", label: "All guides" },
      { href: "/stanag-6001", label: "STANAG 6001" },
      { href: "/slp", label: "What SLP means" },
      { href: "/slp-2", label: "SLP 2" },
      { href: "/slp-3", label: "SLP 3" },
      { href: "/guides/reading", label: "Reading" },
      { href: "/guides/listening", label: "Listening" },
      { href: "/guides/writing", label: "Writing" },
      { href: "/guides/speaking", label: "Speaking" },
      { href: "/exam", label: "Exam simulation" },
      { href: "/glossary", label: "Glossary" },
    ],
  },
  {
    heading: "España",
    links: [
      { href: "/es/examen-slp", label: "Examen SLP" },
      { href: "/es/slp-2", label: "Perfil SLP 2222" },
      { href: "/es/slp-3", label: "Perfil SLP 3333" },
      { href: "/support", label: "Soporte / Support" },
      { href: "/contact", label: "Contacto / Contact" },
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
