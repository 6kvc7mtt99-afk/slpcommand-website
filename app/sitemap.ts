import type { MetadataRoute } from "next";
import { allAuthorityPages } from "@/lib/authority";
import { PUBLIC_PAGES, publicPageUpdated } from "@/lib/legalMeta";

/**
 * Fallback for the home page and anything that does not declare its own date.
 * Never `new Date()` per-entry: a lastmod that moves on every deploy is a
 * signal Google learns to ignore.
 */
const SITE_RELEASED = "2026-08-18";

export default function sitemap(): MetadataRoute.Sitemap {
  const legal: MetadataRoute.Sitemap = PUBLIC_PAGES.map((page) => ({
    url: `https://slpcommand.com${page.path}`,
    lastModified: new Date(publicPageUpdated(page.slug) ?? SITE_RELEASED),
    changeFrequency: page.path === "/" ? "weekly" : "yearly",
    priority: page.path === "/" ? 1 : 0.3,
  }));

  const authority: MetadataRoute.Sitemap = allAuthorityPages().map((page) => ({
    url: `https://slpcommand.com${page.path}`,
    lastModified: new Date(page.updated),
    changeFrequency: "monthly",
    priority: page.path === "/stanag-6001" || page.path === "/es/examen-slp" ? 0.9 : 0.8,
  }));

  return [...legal, ...authority];
}
