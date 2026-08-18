import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";
import {
  allAuthorityPages,
  authorityMetadata,
  authorityOgImage,
  breadcrumbJsonLd,
  breadcrumbTrail,
  articleJsonLd,
  type AuthorityId,
} from "@/lib/authority";
import { AUTHORITY_PAGES } from "@/content/authority/pages";
import { PUBLIC_PAGES, pageMetadata, publicPageUpdated } from "@/lib/legalMeta";

const ids = Object.keys(AUTHORITY_PAGES) as AuthorityId[];

describe("indexable metadata", () => {
  it("gives every authority page a social card sized for X and LinkedIn", () => {
    for (const id of ids) {
      const meta = authorityMetadata(id);
      const images = meta.openGraph?.images as { url: string; width: number; height: number }[];
      expect(images?.length, `${id} og:image`).toBe(1);
      expect(images[0].width).toBe(1200);
      expect(images[0].height).toBe(630);
      expect(meta.twitter?.images, `${id} twitter:image`).toBeTruthy();
    }
  });

  it("points every card at a file that ships in public/", async () => {
    const { existsSync } = await import("node:fs");
    const path = await import("node:path");
    for (const page of allAuthorityPages()) {
      const file = path.join(process.cwd(), "public", authorityOgImage(page).url);
      expect(existsSync(file), `missing card ${file}`).toBe(true);
    }
  });

  it("keeps titles and descriptions unique across every indexable URL", () => {
    const titles = new Map<string, string>();
    const descriptions = new Map<string, string>();

    for (const page of allAuthorityPages()) {
      expect(titles.has(page.title), `duplicate title: ${page.title}`).toBe(false);
      titles.set(page.title, page.path);
      expect(
        descriptions.has(page.description),
        `duplicate description on ${page.path} and ${descriptions.get(page.description)}`,
      ).toBe(false);
      descriptions.set(page.description, page.path);
    }

    for (const page of PUBLIC_PAGES) {
      const meta = pageMetadata(page.title, page.path);
      expect(
        descriptions.has(meta.description),
        `duplicate description on ${page.path} and ${descriptions.get(meta.description)}`,
      ).toBe(false);
      descriptions.set(meta.description, page.path);
    }
  });

  it("declares reciprocal hreflang with an x-default", () => {
    for (const page of allAuthorityPages()) {
      if (!page.hreflang) continue;
      const { en, es } = page.hreflang;
      expect(en, `${page.path} declares hreflang without an en target`).toBeTruthy();

      // The page must name itself among its own alternates.
      expect([en, es], `${page.path} omits itself from hreflang`).toContain(page.path);

      // And the page it points at must point back.
      for (const target of [en, es]) {
        if (!target || target === page.path) continue;
        const counterpart = allAuthorityPages().find((p) => p.path === target);
        expect(counterpart, `${page.path} -> ${target} does not exist`).toBeTruthy();
        expect(counterpart?.hreflang?.en, `${target} must point back`).toBe(en);
        expect(counterpart?.hreflang?.es, `${target} must point back`).toBe(es);
      }

      const languages = authorityMetadata(
        ids.find((id) => AUTHORITY_PAGES[id].path === page.path)!,
      ).alternates?.languages as Record<string, string>;
      expect(languages["x-default"], `${page.path} x-default`).toBe(
        `https://slpcommand.com${en}`,
      );
    }
  });
});

describe("structured data", () => {
  it("matches the breadcrumb schema to the rendered trail", () => {
    for (const id of ids) {
      const page = AUTHORITY_PAGES[id];
      const trail = breadcrumbTrail(page);
      const schema = breadcrumbJsonLd(id);
      expect(schema.itemListElement.length, `${page.path} crumb count`).toBe(trail.length);
      schema.itemListElement.forEach((item, index) => {
        expect(item.name).toBe(trail[index].name);
        expect(item.position).toBe(index + 1);
      });
      // /guides/* must show the hub, not jump from home to leaf.
      if (page.path.startsWith("/guides/")) {
        expect(trail.map((c) => c.path)).toContain("/guides");
      }
    }
  });

  it("dates every Article with both published and modified", () => {
    for (const id of ids) {
      const article = articleJsonLd(id);
      expect(article.datePublished, `${id} datePublished`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(article.dateModified, `${id} dateModified`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(article.image, `${id} image`).toContain("https://slpcommand.com/assets/og/");
    }
  });
});

describe("crawl surface", () => {
  const entries = sitemap();
  const rules = robots();
  const disallowed = (
    Array.isArray(rules.rules) ? rules.rules : [rules.rules]
  ).flatMap((rule) => (Array.isArray(rule?.disallow) ? rule.disallow : []));

  it("lists every authority page exactly once", () => {
    for (const page of allAuthorityPages()) {
      const matches = entries.filter((e) => e.url === `https://slpcommand.com${page.path}`);
      expect(matches.length, `sitemap entries for ${page.path}`).toBe(1);
    }
  });

  it("never advertises a URL that robots.txt blocks", () => {
    for (const entry of entries) {
      const path = new URL(entry.url).pathname;
      for (const blocked of disallowed) {
        const collides = path === blocked || path.startsWith(`${blocked}/`);
        expect(collides, `${path} is in the sitemap but blocked by "${blocked}"`).toBe(false);
      }
    }
  });

  it("reports a lastmod that does not move on every deploy", () => {
    for (const entry of entries) {
      const stamp = new Date(entry.lastModified as Date).toISOString();
      // A build-time `new Date()` lands within seconds of now; a declared date does not.
      expect(
        Date.now() - new Date(stamp).getTime(),
        `${entry.url} lastmod looks like build time`,
      ).toBeGreaterThan(60_000);
    }
  });

  it("reads legal lastmod from the document's own declared date", () => {
    expect(publicPageUpdated("privacy")).toBe("2026-07-31");
    expect(publicPageUpdated("cookies")).toBe("2026-08-16");
  });
});
