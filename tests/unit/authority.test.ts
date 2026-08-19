import { describe, expect, it } from "vitest";
import { allAuthorityPages, authorityMetadata, getAuthorityPage } from "@/lib/authority";
import { AUTHORITY_PAGES } from "@/content/authority/pages";

const APP_ROUTE_PREFIXES = [
  "/reading",
  "/listening",
  "/writing",
  "/speaking",
  "/dashboard",
  "/login",
  "/signup",
  "/admin",
  "/onboarding",
  "/profile",
  "/progress",
];

describe("authority pages", () => {
  it("registers every page with a unique public path", () => {
    const paths = allAuthorityPages().map((page) => page.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("does not collide with learner-app routes", () => {
    for (const page of allAuthorityPages()) {
      const clash = APP_ROUTE_PREFIXES.some(
        (prefix) => page.path === prefix || page.path.startsWith(`${prefix}/`),
      );
      expect(clash, page.path).toBe(false);
    }
  });

  it("keeps every public claim independent of NATO", () => {
    for (const [id, page] of Object.entries(AUTHORITY_PAGES)) {
      const blob = `${page.h1} ${page.description} ${page.sections.map((s) => s.html).join(" ")}`;
      expect(blob, id).not.toMatch(/official NATO (app|exam|assessment)/i);
      expect(page.title.length).toBeGreaterThan(10);
      expect(page.description.length).toBeGreaterThan(40);
      expect(page.description.length).toBeLessThanOrEqual(180);
    }
  });

  it("cites at least one verified external source on every page", () => {
    // The cluster's whole claim is that it states the standard accurately.
    // Eleven of twelve pages originally linked out to nothing, which gives a
    // reader — or a model deciding whether to cite us — no way to check.
    for (const [id, page] of Object.entries(AUTHORITY_PAGES)) {
      expect(page.sources?.length, `${id} has no sources`).toBeGreaterThan(0);
      for (const source of page.sources ?? []) {
        expect(source.url, id).toMatch(/^https:\/\//);
        expect(source.label.length, id).toBeGreaterThan(10);
      }
    }
  });

  it("only cites hosts that have actually been read and recorded", () => {
    // Adding a URL nobody checked is how a citation ends up not saying what the
    // page claims it says. Widen this list only after fetching the source.
    const VERIFIED_HOSTS = ["nato-bilc.org", "www.japcc.org"];
    for (const [id, page] of Object.entries(AUTHORITY_PAGES)) {
      for (const source of page.sources ?? []) {
        const host = new URL(source.url).host;
        expect(VERIFIED_HOSTS, `${id} cites unverified host ${host}`).toContain(host);
      }
    }
  });

  it("emits indexable metadata for the STANAG pillar", () => {
    const meta = authorityMetadata("stanag-6001");
    expect(meta.alternates?.canonical).toBe("https://slpcommand.com/stanag-6001");
    expect(getAuthorityPage("stanag-6001").faq.length).toBeGreaterThan(0);
  });
});
