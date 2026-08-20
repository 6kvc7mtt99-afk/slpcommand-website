import { readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { allAuthorityPages } from "@/lib/authority";
import { glossaryJsonLd, articleJsonLd, type AuthorityId } from "@/lib/authority";
import { AUTHORITY_PAGES } from "@/content/authority/pages";
import { GLOSSARY, GLOSSARY_STATUS_LABEL } from "@/content/glossary";

/**
 * Two things nothing else checked.
 *
 * 1. Internal links inside page prose. `related[]` is structured data and was
 *    already safe, but the body of every page is hand-written HTML — a typo in
 *    an <a href> there ships a 404 to a reader and a dead edge to a crawler,
 *    silently. The authority cluster's whole argument is that it is accurate.
 * 2. The glossary's anchors. Other pages deep-link to `/glossary#task-achievement`,
 *    which is a link that resolves with a 200 even when the anchor does not
 *    exist — the worst kind of broken link, because no status code reveals it.
 */

/** Routes that exist outside the authority model. */
function appRoutes(): Set<string> {
  const routes = new Set<string>(["/"]);
  const appDir = path.join(process.cwd(), "app");
  const walk = (dir: string, prefix: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      // Route groups like (app) do not appear in the URL.
      const isGroup = entry.name.startsWith("(") && entry.name.endsWith(")");
      const segment = isGroup ? prefix : `${prefix}/${entry.name}`;
      const full = path.join(dir, entry.name);
      if (existsSync(path.join(full, "page.tsx"))) routes.add(segment || "/");
      walk(full, segment);
    }
  };
  walk(appDir, "");
  return routes;
}

const ROUTES = appRoutes();
const ANCHORS = new Set(GLOSSARY.map((t) => `/glossary#${t.id}`));

/** Every internal href the site renders, with where it came from. */
function internalLinks(): { from: string; href: string }[] {
  const found: { from: string; href: string }[] = [];
  for (const page of allAuthorityPages()) {
    const push = (href: string) => {
      if (href.startsWith("/")) found.push({ from: page.path, href });
    };
    for (const section of page.sections) {
      for (const match of section.html.matchAll(/href="(\/[^"]*)"/g)) push(match[1]);
    }
    for (const item of page.related) push(item.href);
    push(page.cta.href);
    for (const term of page.glossary ?? []) {
      for (const link of term.see ?? []) push(link.href);
    }
  }
  return found;
}

function resolves(href: string): boolean {
  if (ANCHORS.has(href)) return true;
  // Same-page anchors and homepage fragments are not routes.
  const [pathname] = href.split("#");
  if (pathname === "" || pathname === "/") return true;
  return ROUTES.has(pathname);
}

describe("internal links", () => {
  const links = internalLinks();

  it("finds links to check", () => {
    expect(links.length).toBeGreaterThan(50);
  });

  it("never points at a route that does not exist", () => {
    const broken = links
      .filter((link) => !resolves(link.href))
      .map((link) => `${link.from} -> ${link.href}`);
    expect(broken, `broken internal links:\n${broken.join("\n")}`).toEqual([]);
  });

  it("never points at a glossary anchor that does not exist", () => {
    const bad = links
      .filter((link) => link.href.startsWith("/glossary#") && !ANCHORS.has(link.href))
      .map((link) => `${link.from} -> ${link.href}`);
    expect(bad, `dead glossary anchors:\n${bad.join("\n")}`).toEqual([]);
  });

  it("reaches all four skill guides from the guides hub", () => {
    const hub = AUTHORITY_PAGES.guides;
    const body = hub.sections.map((s) => s.html).join(" ") + JSON.stringify(hub.related);
    for (const skill of ["reading", "listening", "writing", "speaking"]) {
      expect(body, `guides hub does not link /guides/${skill}`).toContain(`/guides/${skill}`);
    }
  });
});

describe("glossary", () => {
  it("gives every term a unique, anchor-safe id", () => {
    const ids = GLOSSARY.map((t) => t.id);
    expect(new Set(ids).size, `duplicate id: ${ids.filter((v, i) => ids.indexOf(v) !== i)}`).toBe(
      ids.length,
    );
    for (const id of ids) expect(id, `unsafe anchor id: ${id}`).toMatch(/^[a-z0-9-]+$/);
  });

  it("labels every term as official, interpretation, or a product decision", () => {
    for (const term of GLOSSARY) {
      expect(Object.keys(GLOSSARY_STATUS_LABEL), term.term).toContain(term.status);
    }
  });

  it("keeps every definition self-contained enough to quote", () => {
    for (const term of GLOSSARY) {
      expect(term.short.length, `${term.term}: definition too short to be useful`).toBeGreaterThan(60);
      expect(term.short.trim().endsWith("."), `${term.term}: definition is not a sentence`).toBe(true);
    }
  });

  it("does not present a product decision as a requirement of the exam", () => {
    for (const term of GLOSSARY.filter((t) => t.status === "product")) {
      const blob = `${term.short} ${term.body ?? ""}`;
      expect(blob, `${term.term} states a requirement`).not.toMatch(
        /\b(the exam|STANAG|the standard) (requires|demands|mandates)\b/i,
      );
    }
  });

  it("emits a DefinedTermSet whose terms carry their own canonical anchor", () => {
    const schema = glossaryJsonLd("glossary" as AuthorityId);
    expect(schema).toBeTruthy();
    expect(schema!["@type"]).toBe("DefinedTermSet");
    expect(schema!.hasDefinedTerm.length).toBe(GLOSSARY.length);
    for (const term of schema!.hasDefinedTerm) {
      expect(term["@id"]).toMatch(/^https:\/\/slpcommand\.com\/glossary#[a-z0-9-]+$/);
      expect(term.description.length).toBeGreaterThan(0);
    }
  });

  it("emits DefinedTermSet only for the glossary", () => {
    for (const id of Object.keys(AUTHORITY_PAGES) as AuthorityId[]) {
      if (id === "glossary") continue;
      expect(glossaryJsonLd(id), `${id} should not emit a term set`).toBeNull();
    }
  });

  it("does not double-type the glossary page", () => {
    // The page is a CollectionPage; the term set is a separate entity. Emitting
    // DefinedTermSet from both would put two of the same @type on one URL.
    expect(articleJsonLd("glossary" as AuthorityId)["@type"]).toBe("CollectionPage");
  });
});
