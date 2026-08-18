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

  it("emits indexable metadata for the STANAG pillar", () => {
    const meta = authorityMetadata("stanag-6001");
    expect(meta.alternates?.canonical).toBe("https://slpcommand.com/stanag-6001");
    expect(getAuthorityPage("stanag-6001").faq.length).toBeGreaterThan(0);
  });
});
