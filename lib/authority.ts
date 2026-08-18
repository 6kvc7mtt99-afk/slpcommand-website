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
    title: page.title,
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
    "@type": "Article",
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
  trail.push({ name: page.kicker, path: page.path });
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
  name: "SLP Command",
  url: `${SITE_ORIGIN}/`,
  logo: `${SITE_ORIGIN}/assets/og/og-default.png`,
  description:
    "Independent educational platform for STANAG 6001 / SLP-style English exam preparation at Levels 2 and 3.",
  knowsAbout: [
    "STANAG 6001",
    "Standardized Language Profile",
    "NATO language proficiency",
    "Military English",
    "Language proficiency testing",
  ],
  // Populate only with profiles that exist and that we control. An empty
  // sameAs is not a signal; a wrong one is a liability.
  sameAs: [] as string[],
};

export const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "SLP Command",
  url: `${SITE_ORIGIN}/`,
  inLanguage: ["en", "es"],
  publisher: { "@type": "Organization", name: "SLP Command", url: `${SITE_ORIGIN}/` },
};

export const softwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "SLP Command",
  applicationCategory: "EducationalApplication",
  operatingSystem: "iOS",
  offers: {
    "@type": "Offer",
    price: "9.99",
    priceCurrency: "EUR",
    description: "Professional plan. A free plan with real practice quotas is also available.",
  },
  description:
    "Independent trainer for STANAG 6001 / SLP-style exams, Levels 2 and 3, covering Reading, Listening, Writing and Speaking.",
};
