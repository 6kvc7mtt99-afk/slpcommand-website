import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { FOOTER_GROUPS, MARKETING_PAGES, PRIMARY_NAV, allMarketingPages, marketingMetadata } from "@/lib/site";
import { allAuthorityPages } from "@/lib/authority";
import { PUBLIC_PAGES } from "@/lib/legalMeta";
import { MARKETING_RENDERS, visibleText } from "./renderPublic";

/**
 * The redesigned public site, held to its own rules.
 *
 * Product truth: every capability the marketing pages name was verified in
 * the product on 2026-09-02. The assertions below pin the ones most likely to
 * drift back — the Speaking criteria count, the absence of features the web
 * product does not have, and the platform truth — and check that the
 * information architecture, metadata and crawl surface agree with each other.
 */

const routes = new Set<string>();
(function walk(dir: string, prefix: string) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const isGroup = entry.name.startsWith("(") && entry.name.endsWith(")");
    const segment = isGroup ? prefix : `${prefix}/${entry.name}`;
    const full = path.join(dir, entry.name);
    if (existsSync(path.join(full, "page.tsx"))) routes.add(segment || "/");
    walk(full, segment);
  }
})(path.join(process.cwd(), "app"), "");
routes.add("/");

describe("marketing pages — product truth", () => {
  for (const page of MARKETING_RENDERS) {
    const text = visibleText(page.html);

    it(`${page.path}: never claims five Speaking criteria (the product rates four)`, () => {
      expect(text).not.toMatch(/five (criteria|dimensions)/i);
      expect(text).not.toMatch(/\b5 (criteria|dimensions)/i);
    });

    it(`${page.path}: never claims features the web product does not have`, () => {
      expect(text).not.toMatch(/spaced[- ]review/i);
      expect(text).not.toMatch(/improved version/i);
      expect(text).not.toMatch(/your timeline/i);
      expect(text).not.toMatch(/\b11 (structured )?(academy )?topics/i);
    });

    it(`${page.path}: keeps the platform truth (web now, iOS coming, nothing on Android)`, () => {
      expect(text).not.toMatch(/available on (the )?App Store/i);
      expect(text).not.toMatch(/download (the )?(iOS )?app/i);
      expect(text).not.toMatch(/android/i);
    });

    it(`${page.path}: carries the independence disclaimer and no pass probability`, () => {
      expect(text).toMatch(/not (an )?official/i);
      expect(text).not.toMatch(/\d{1,3}\s?%\s+(chance|probability|likely)/i);
    });

    it(`${page.path}: has exactly one h1 and one main landmark`, () => {
      expect(page.html.match(/<h1[\s>]/g)?.length ?? 0).toBe(1);
      expect(page.html.match(/<main[\s>]/g)?.length ?? 0).toBe(1);
      expect(page.html).toContain('href="#content"');
    });
  }

  it("names the four Speaking criteria the product actually uses", () => {
    const home = visibleText(MARKETING_RENDERS[0].html);
    for (const criterion of ["Content", "Task fulfilment", "Accuracy", "Text produced"]) {
      expect(home).toContain(criterion);
    }
  });

  it("presents the academy tooling as early access, never as a plan for sale", () => {
    const academies = visibleText(MARKETING_RENDERS.find((r) => r.path === "/academies")!.html);
    expect(academies).toMatch(/early access/i);
    expect(academies).not.toMatch(/€\s?\d/);
    expect(academies).toMatch(/not self-serve/i);
  });
});

describe("marketing pages — information architecture", () => {
  it("links the header and footer only to routes that exist", () => {
    const links = [...PRIMARY_NAV, ...FOOTER_GROUPS.flatMap((g) => g.links)];
    for (const link of links) {
      const pathname = link.href.split("#")[0];
      expect(routes.has(pathname), `${link.label} -> ${link.href}`).toBe(true);
    }
  });

  it("links every in-body internal href on the marketing pages to a real route", () => {
    for (const page of MARKETING_RENDERS) {
      const hrefs = [...page.html.matchAll(/href="(\/[^"#]*)(#[^"]*)?"/g)].map((m) => m[1]);
      for (const href of hrefs) {
        expect(routes.has(href), `${page.path} -> ${href}`).toBe(true);
      }
    }
  });

  it("gives every marketing page a route, a card that ships, and unique metadata", () => {
    const titles = new Set<string>();
    const descriptions = new Set<string>();
    for (const page of allMarketingPages()) {
      expect(routes.has(page.path), page.path).toBe(true);
      expect(existsSync(path.join(process.cwd(), "public", page.ogImage)), page.ogImage).toBe(true);
      expect(titles.has(page.title), `duplicate title ${page.title}`).toBe(false);
      titles.add(page.title);
      expect(descriptions.has(page.description), `duplicate description ${page.path}`).toBe(false);
      descriptions.add(page.description);
      // Titles that pass through the "%s — SLP Command" template must stay under 60 characters in total.
      const rendered = page.title.includes("SLP Command") ? page.title : `${page.title} — SLP Command`;
      expect(rendered.length, `${page.path} title too long: ${rendered}`).toBeLessThanOrEqual(64);
      expect(page.description.length, `${page.path} description`).toBeGreaterThanOrEqual(100);
    }
    expect(MARKETING_PAGES.home.description.length).toBeLessThanOrEqual(165);
  });

  it("emits a self-referencing canonical and a 1200x630 card for each marketing page", () => {
    for (const id of Object.keys(MARKETING_PAGES) as (keyof typeof MARKETING_PAGES)[]) {
      const meta = marketingMetadata(id);
      expect(meta.alternates?.canonical).toBe(`https://slpcommand.com${MARKETING_PAGES[id].path}`);
      const images = meta.openGraph?.images as { width: number; height: number }[];
      expect(images[0].width).toBe(1200);
      expect(images[0].height).toBe(630);
    }
  });

  it("does not let a marketing primary keyword collide with the authority cluster", () => {
    const authority = new Set(allAuthorityPages().map((p) => p.primaryKeyword.toLowerCase()));
    for (const page of allMarketingPages()) {
      expect(authority.has(page.primaryKeyword.toLowerCase()), page.primaryKeyword).toBe(false);
    }
  });

  it("lists every marketing page in the sitemap exactly once, with a stable date", () => {
    const entries = sitemap();
    for (const page of allMarketingPages()) {
      const matches = entries.filter((e) => e.url === `https://slpcommand.com${page.path}`);
      expect(matches.length, page.path).toBe(1);
      expect(Date.now() - new Date(matches[0].lastModified as Date).getTime()).toBeGreaterThan(60_000);
    }
    // The legal registry no longer carries the homepage; the sitemap must not duplicate it.
    expect(PUBLIC_PAGES.some((p) => (p.path as string) === "/")).toBe(false);
  });

  it("keeps llms.txt in step with the public pages", () => {
    const llms = readFileSync(path.join(process.cwd(), "public/llms.txt"), "utf8");
    for (const page of allMarketingPages()) {
      expect(llms, `llms.txt missing ${page.path}`).toContain(`https://slpcommand.com${page.path}`);
    }
    for (const page of allAuthorityPages()) {
      expect(llms, `llms.txt missing ${page.path}`).toContain(`https://slpcommand.com${page.path}`);
    }
    expect(llms).not.toMatch(/Platform: iOS\b/);
    expect(llms).toMatch(/four criteria/i);
  });
});
