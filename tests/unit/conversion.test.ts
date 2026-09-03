import { describe, expect, it } from "vitest";
import { AUTHORITY_PAGES } from "@/content/authority/pages";
import { CONVERSION_CTA, FREE_PLAN_QUOTAS, SIGNUP_PATH } from "@/lib/conversion";
import { softwareJsonLd } from "@/lib/authority";
import { PLAN_CARDS, PLAN_ROWS, PRO_PLAN } from "@/content/site/pricing";
import { MARKETING_RENDERS, visibleText } from "./renderPublic";

/**
 * The funnel, held open and held honest.
 *
 * Phase 1 shipped twelve indexable pages with no way to convert. These tests
 * make sure every marketing page offers the free signup, that the pricing
 * shown matches the allowances the product enforces, and that the structured
 * data agrees with the page.
 */

const home = MARKETING_RENDERS.find((r) => r.path === "/")!;
const pricing = MARKETING_RENDERS.find((r) => r.path === "/pricing")!;
const q = FREE_PLAN_QUOTAS;

describe("conversion path", () => {
  it("offers the free account on every marketing page", () => {
    for (const page of MARKETING_RENDERS) {
      expect(page.html, page.path).toContain(`href="${SIGNUP_PATH}"`);
    }
  });

  it("never sends a plan action to the support desk or to a purchase the web cannot complete", () => {
    const ctas = [...pricing.html.matchAll(/<a[^>]*data-plan-cta="[^"]+"[^>]*href="([^"]+)"/g), ...pricing.html.matchAll(/<a[^>]*href="([^"]+)"[^>]*data-plan-cta="[^"]+"/g)];
    expect(ctas.length).toBeGreaterThanOrEqual(2);
    for (const [, href] of ctas) expect(href).toBe(SIGNUP_PATH);
    expect(pricing.html).not.toContain("Get Professional in the app");
  });

  it("states free-plan allowances that the product actually enforces", () => {
    const text = visibleText(pricing.html);
    const claims: [number, RegExp][] = [
      [q.readingPerWeek, /Reading practice (\d+) \/ week/],
      [q.listeningPerWeek, /Listening practice (\d+) \/ week/],
      [q.writingPerMonth, /Writing, AI-evaluated (\d+) \/ month/],
      [q.speakingPerMonth, /Speaking, AI-evaluated (\d+) \/ month/],
      [q.writingMicroPerMonth, /Quick Writing tools (\d+) \/ month/],
      [q.examPerMonthPerSkill, /Exam simulation (\d+) \/ month per skill/],
    ];
    for (const [expected, pattern] of claims) {
      const found = text.match(pattern);
      expect(found, `pricing page no longer states: ${pattern}`).toBeTruthy();
      expect(Number(found![1])).toBe(expected);
    }
  });

  it("builds the comparison table from the same quota constants", () => {
    const flat = PLAN_ROWS.flatMap((g) => g.rows);
    expect(flat.find((r) => r.label === "Reading practice")?.free).toBe(`${q.readingPerWeek} / week`);
    expect(flat.find((r) => r.label === "Listening practice")?.free).toBe(`${q.listeningPerWeek} / week`);
    expect(flat.find((r) => r.label.startsWith("Writing evaluation"))?.free).toBe(`${q.writingPerMonth} / month`);
    expect(flat.find((r) => r.label.startsWith("Speaking evaluation"))?.free).toBe(`${q.speakingPerMonth} / month`);
    expect(PLAN_CARDS.pro.price).toBe(PRO_PLAN.price);
  });

  it("quotes the Professional price once as the product sells it", () => {
    expect(PRO_PLAN.price).toBe("€9.99");
    expect(visibleText(pricing.html)).toContain("€9.99");
    expect(visibleText(home.html)).toContain("€9.99");
  });

  it("repeats those same numbers in the CTA copy shown on every authority page", () => {
    const en = CONVERSION_CTA.en.body;
    expect(en).toContain(`${q.readingPerWeek} Reading`);
    expect(en).toContain(`${q.listeningPerWeek} Listening`);
    expect(en).toContain(`${q.writingPerMonth} AI-scored Writing`);
    expect(en).toContain(`${q.speakingPerMonth} Speaking`);
    const es = CONVERSION_CTA.es.body;
    expect(es).toContain(`${q.readingPerWeek} sesiones de Reading`);
    expect(es).toContain(`${q.writingPerMonth} redacciones`);
  });

  it("routes both languages to the signup and keeps the independence caveat", () => {
    for (const lang of ["en", "es"] as const) {
      const cta = CONVERSION_CTA[lang];
      expect(cta.href).toBe(SIGNUP_PATH);
      expect(cta.label.length).toBeGreaterThan(0);
      expect(cta.note.toLowerCase()).toMatch(/not an official|no es una evaluación oficial/);
    }
  });

  it("keeps a contextual secondary action on every authority page", () => {
    for (const [id, page] of Object.entries(AUTHORITY_PAGES)) {
      expect(page.cta.href, id).toMatch(/^\/|^#/);
      expect(page.cta.label.length, id).toBeGreaterThan(0);
    }
  });
});

describe("product availability markup", () => {
  it("marks up what a visitor can actually obtain today", () => {
    // Claim C08: the App Store listing is not live, so the application is Web.
    expect(softwareJsonLd.operatingSystem).not.toMatch(/iOS/);
    const offers = softwareJsonLd.offers;
    const free = offers.find((o) => o.name === "Free");
    const pro = offers.find((o) => o.name === "Professional");
    expect(free?.availability).toBe("https://schema.org/InStock");
    expect(free?.price).toBe("0");
    // Web billing is live, so Professional is purchasable and says where.
    expect(pro?.availability).toBe("https://schema.org/InStock");
    expect(pro?.price).toBe("9.99");
    expect(pro?.url).toContain("/pricing");
    expect(pro?.description).not.toMatch(/App Store/);
  });
});
