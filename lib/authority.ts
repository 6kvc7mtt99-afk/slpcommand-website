import type { Metadata } from "next";
import { AUTHORITY_PAGES, type AuthorityPageDef } from "@/content/authority/pages";

export type AuthorityId = keyof typeof AUTHORITY_PAGES;

export const SITE_ORIGIN = "https://slpcommand.com";

/** Date the authority cluster first went public. Used for Article.datePublished. */
export const AUTHORITY_PUBLISHED = "2026-08-18";

export function getAuthorityPage(id: AuthorityId): AuthorityPageDef {
  return AUTHORITY_PAGES[id];
}

export function allAuthorityPages(): AuthorityPageDef[] {
  return Object.values(AUTHORITY_PAGES);
}

/**
 * Social card for a page. Cards are static 1200x630 PNGs built by
 * `scripts/build-og.sh` from `assets/og/_template.svg`.
 *
 * Without this, Next.js drops the root-layout `openGraph.images` on every page
 * that declares its own `openGraph` block — which is every authority page.
 */
export function authorityOgImage(page: AuthorityPageDef): { url: string; alt: string } {
  if (page.lang === "es") {
    return {
      url: "/assets/og/og-es.png",
      alt: "SLP Command — preparación independiente del examen SLP / STANAG 6001.",
    };
  }
  if (page.path === "/stanag-6001" || page.path === "/slp") {
    return {
      url: "/assets/og/og-stanag.png",
      alt: "SLP Command — what STANAG 6001 actually is.",
    };
  }
  if (page.path === "/guides" || page.path.startsWith("/guides/")) {
    return {
      url: "/assets/og/og-guides.png",
      alt: "SLP Command — guides to what SLP examiners actually rate.",
    };
  }
  if (page.path === "/glossary") {
    return {
      url: "/assets/og/og-stanag.png",
      alt: "SLP Command — STANAG 6001 and SLP terms, defined.",
    };
  }
  if (page.path === "/slp-2" || page.path === "/slp-3") {
    return {
      url: "/assets/og/og-levels.png",
      alt: "SLP Command — an SLP is four digits, not an average.",
    };
  }
  return {
    url: "/assets/og/og-default.png",
    alt: "SLP Command — independent STANAG 6001 / SLP 2 and 3 trainer.",
  };
}

export function authorityMetadata(id: AuthorityId): Metadata {
  const page = getAuthorityPage(id);
  const url = `${SITE_ORIGIN}${page.path}`;
  const languages: Record<string, string> = {};
  const hreflang = page.hreflang;
  if (hreflang?.en) languages.en = `${SITE_ORIGIN}${hreflang.en}`;
  if (hreflang?.es) languages.es = `${SITE_ORIGIN}${hreflang.es}`;
  // Tell Google which URL to serve when no declared language matches the user.
  if (hreflang?.en) languages["x-default"] = `${SITE_ORIGIN}${hreflang.en}`;

  const og = authorityOgImage(page);
  const images = [{ url: og.url, width: 1200, height: 630, alt: og.alt }];

  return {
    // The root layout templates titles as "%s — SLP Command". A page whose own
    // title already carries the brand ("About SLP Command") would render it
    // twice, so those opt out of the template instead.
    title: page.title.includes("SLP Command") ? { absolute: page.title } : page.title,
    description: page.description,
    alternates: {
      canonical: url,
      ...(Object.keys(languages).length ? { languages } : {}),
    },
    openGraph: {
      title: page.title,
      description: page.description,
      url,
      siteName: "SLP Command",
      type: "article",
      locale: page.lang === "es" ? "es_ES" : "en_GB",
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: page.title,
      description: page.description,
      images: [og.url],
    },
    robots: { index: true, follow: true },
  };
}

export function articleJsonLd(id: AuthorityId) {
  const page = getAuthorityPage(id);
  const url = `${SITE_ORIGIN}${page.path}`;
  return {
    "@context": "https://schema.org",
    "@type": page.schemaType ?? "Article",
    headline: page.h1,
    description: page.description,
    datePublished: AUTHORITY_PUBLISHED,
    dateModified: page.updated,
    inLanguage: page.lang === "es" ? "es" : "en",
    mainEntityOfPage: url,
    image: `${SITE_ORIGIN}${authorityOgImage(page).url}`,
    author: {
      "@type": "Organization",
      name: "SLP Command",
      url: `${SITE_ORIGIN}/`,
    },
    publisher: {
      "@type": "Organization",
      name: "SLP Command",
      url: `${SITE_ORIGIN}/`,
    },
    ...(page.sources?.length
      ? {
          citation: page.sources.map((source) => ({
            "@type": "CreativeWork",
            name: source.label,
            url: source.url,
          })),
        }
      : {}),
    ...(page.schemaType === "CollectionPage"
      ? {
          hasPart: page.related.map((item) => ({
            "@type": "WebPage",
            name: item.label,
            url: `${SITE_ORIGIN}${item.href}`,
          })),
        }
      : {}),
  };
}

/**
 * DefinedTermSet for the glossary.
 *
 * An Article describing sixteen definitions is not the same object as a set of
 * sixteen defined terms, and only the second is machine-answerable. Each term
 * carries its own canonical anchor so an answer engine can cite the definition
 * rather than the page.
 */
export function glossaryJsonLd(id: AuthorityId) {
  const page = getAuthorityPage(id);
  if (!page.glossary?.length) return null;
  const url = `${SITE_ORIGIN}${page.path}`;
  return {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    // Its own fragment: the page entity already owns the bare URL.
    "@id": `${url}#terms`,
    name: page.h1,
    description: page.description,
    inLanguage: "en",
    url,
    hasDefinedTerm: page.glossary.map((term) => ({
      "@type": "DefinedTerm",
      "@id": `${url}#${term.id}`,
      name: term.term,
      description: term.short,
      inDefinedTermSet: `${url}#terms`,
      ...(term.aka?.length ? { alternateName: term.aka } : {}),
    })),
  };
}

export function faqJsonLd(id: AuthorityId) {
  const page = getAuthorityPage(id);
  if (!page.faq.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

/**
 * The trail rendered by `AuthorityPage`. Schema and the visible breadcrumb have
 * to agree, so both read from here.
 */
export function breadcrumbTrail(page: AuthorityPageDef): { name: string; path: string }[] {
  const trail = [{ name: "SLP Command", path: "/" }];
  if (page.path.startsWith("/guides/")) {
    trail.push({ name: "Guides", path: "/guides" });
  } else if (page.path.startsWith("/es/") && page.path !== "/es/examen-slp") {
    trail.push({ name: "España", path: "/es/examen-slp" });
  }
  trail.push({ name: page.crumb ?? page.kicker, path: page.path });
  return trail;
}

export function breadcrumbJsonLd(id: AuthorityId) {
  const page = getAuthorityPage(id);
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbTrail(page).map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: `${SITE_ORIGIN}${crumb.path}`,
    })),
  };
}

export const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE_ORIGIN}/#organization`,
  name: "SLP Command",
  url: `${SITE_ORIGIN}/`,
  // A square mark, not the 1200x630 social card: search engines render this
  // as the entity's logo, and a landscape card crops badly.
  logo: `${SITE_ORIGIN}/assets/brand/logo-512.png`,
  description:
    "Independent training platform for STANAG 6001 / SLP English exam preparation at Levels 2 and 3, covering Reading, Listening, Writing and Speaking.",
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    email: "support@slpcommand.com",
    availableLanguage: ["en", "es"],
  },
  knowsAbout: [
    "STANAG 6001",
    "Standardized Language Profile",
    "NATO language proficiency",
    "Military English",
    "Language proficiency testing",
  ],
  // Populate only with profiles that exist and that we control, then add
  // `sameAs: OFFICIAL_PROFILES` below. An empty array is not a weaker signal —
  // it is emitted into the page as `"sameAs":[]`, which is noise. A wrong one is
  // a liability. So it ships only when there is something true to put in it.
};

/** Profiles we control and have verified. Empty until each one exists. */
export const OFFICIAL_PROFILES: string[] = [];

export const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "SLP Command",
  url: `${SITE_ORIGIN}/`,
  inLanguage: ["en", "es"],
  publisher: { "@type": "Organization", name: "SLP Command", url: `${SITE_ORIGIN}/` },
};

/**
 * What a reader can actually obtain today.
 *
 * The web application is the shipped product; the iOS build is still "coming
 * to the App Store" (claim C08), so the operating system is Web. Both plans
 * are marked up as purchasable because both are: the free plan at signup, and
 * Professional through the web checkout (RevenueCat Web Billing, live since
 * the `web_billing_enabled` flag was turned on), reached from /pricing.
 */
export const softwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "SLP Command",
  applicationCategory: "EducationalApplication",
  operatingSystem: "Web",
  url: `${SITE_ORIGIN}/`,
  image: `${SITE_ORIGIN}/assets/og/og-default.png`,
  offers: [
    {
      "@type": "Offer",
      name: "Free",
      price: "0",
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
      url: `${SITE_ORIGIN}/signup`,
      description:
        "Free plan: 10 Reading and 10 Listening practice sessions a week, 3 AI-evaluated Writing submissions and 3 Speaking evaluations a month, 30 quick Writing tools a month, and one timed exam simulation a month in each of the four skills.",
    },
    {
      "@type": "Offer",
      name: "Professional",
      price: "9.99",
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
      url: `${SITE_ORIGIN}/pricing`,
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: "9.99",
        priceCurrency: "EUR",
        billingDuration: "P1M",
      },
      description:
        "Billed monthly, cancel anytime. Unlimited practice, AI evaluation and exam simulation, the Adaptive Coach and mastery trends, and 30 minutes a month of the live AI Speaking Coach. Purchased on the web from inside the app.",
    },
  ],
  author: { "@id": `${SITE_ORIGIN}/#organization` },
  description:
    "Independent training platform for STANAG 6001 / SLP exams at Levels 2 and 3, covering Reading, Listening, Writing and Speaking.",
};
