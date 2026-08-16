import type { MetadataRoute } from "next";
import { PUBLIC_PAGES } from "@/lib/legalMeta";

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PAGES.map((page) => ({
    url: `https://slpcommand.com${page.path}`,
    changeFrequency: page.path === "/" ? "weekly" : "monthly",
    priority: page.path === "/" ? 1 : 0.5,
  }));
}
