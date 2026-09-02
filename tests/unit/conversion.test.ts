import { describe, expect, it } from "vitest";
import { landingHtml } from "@/content/landing";
import { AUTHORITY_PAGES } from "@/content/authority/pages";
import { CONVERSION_CTA, FREE_PLAN_QUOTAS, SIGNUP_PATH } from "@/lib/conversion";
import { softwareJsonLd } from "@/lib/authority";

/**
 * Phase 1 shipped twelve indexable pages with no way to convert: every call to
 * action pointed at an in-page anchor or another article, and the homepage's
 * only transactional button pointed at /support. A working free signup existed
 * and nothing linked to it.
 *
 * These tests hold the funnel open and — more importantly — hold it honest. The
 * CTA states specific free-plan allowances; if pricing changes and the copy does
 * not, the claim becomes false on twelve pages at once. That fails here first.
 */

const text = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
const pricing = text(landingHtml);

describe("conversion path", () => {
  it("offers the free account on the homepage rather than a support page", () => {
    expect(landingHtml).toContain(`href="${SIGNUP_PATH}"`);
    // The old money CTA promised a purchase that cannot complete while the iOS
    // app is unreleased, and sent the user to /support to attempt it.
    expect(landingHtml).not.toContain("Get Professional in the app");
  });

  it("never sends a pricing action to the support desk", () => {
    const ctas = [...landingHtml.matchAll(/<a href="([^"]+)"[^>]*class="[^"]*price-cta[^"]*"/g)];
    expect(ctas.length).toBeGreaterThan(0);
    for (const [, href] of ctas) expect(href).toBe(SIGNUP_PATH);
  });

  it("states free-plan quotas that the live pricing section actually offers", () => {
    const claims: [number, RegExp][] = [
      [FREE_PLAN_QUOTAS.readingPerWeek, /Reading Practice — (\d+) sessions \/ week/],
      [FREE_PLAN_QUOTAS.listeningPerWeek, /Listening Practice — (\d+) sessions \/ week/],
      [FREE_PLAN_QUOTAS.writingPerMonth, /Writing, AI-scored — (\d+) submissions \/ month/],
      [FREE_PLAN_QUOTAS.speakingPerMonth, /Speaking, AI-scored — (\d+) evaluations \/ month/],
      // One exam PER SKILL. The previous claim ("1 full exam / month", full
      // stop) was true of no plan that has ever shipped: the credits are
      // separate features with separate counters, so Free has always had one
      // of each. Undersold, on the pricing card, by two thirds.
      [FREE_PLAN_QUOTAS.examPerMonthPerSkill, /Exam Simulation — (\d+) full exam \/ month/],
    ];
    for (const [expected, pattern] of claims) {
      const found = pricing.match(pattern);
      expect(found, `pricing section no longer states: ${pattern}`).toBeTruthy();
      expect(Number(found![1])).toBe(expected);
    }
  });

  it("repeats those same numbers in the CTA copy shown on every authority page", () => {
    const en = CONVERSION_CTA.en.body;
    expect(en).toContain(`${FREE_PLAN_QUOTAS.readingPerWeek} Reading`);
    expect(en).toContain(`${FREE_PLAN_QUOTAS.listeningPerWeek} Listening`);
    expect(en).toContain(`${FREE_PLAN_QUOTAS.writingPerMonth} AI-scored Writing`);
    expect(en).toContain(`${FREE_PLAN_QUOTAS.speakingPerMonth} Speaking`);
    const es = CONVERSION_CTA.es.body;
    expect(es).toContain(`${FREE_PLAN_QUOTAS.readingPerWeek} sesiones de Reading`);
    expect(es).toContain(`${FREE_PLAN_QUOTAS.writingPerMonth} redacciones`);
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
    // The signup is primary; the page's own link stays as the secondary action
    // so a reader who is not ready to register still has somewhere to go.
    for (const [id, page] of Object.entries(AUTHORITY_PAGES)) {
      expect(page.cta.href, id).toMatch(/^\/|^#/);
      expect(page.cta.label.length, id).toBeGreaterThan(0);
    }
  });
});

describe("product availability markup", () => {
  it("does not advertise an iOS purchase that cannot be completed", () => {
    // Claim C08: the App Store listing is not live. Marking the app up as an
    // iOS product for sale would be structured data the site cannot honour.
    expect(softwareJsonLd.operatingSystem).not.toMatch(/iOS/);
    const offers = softwareJsonLd.offers;
    const free = offers.find((o) => o.name === "Free");
    const pro = offers.find((o) => o.name === "Professional");
    expect(free?.availability).toBe("https://schema.org/InStock");
    expect(free?.price).toBe("0");
    expect(pro?.availability).toBe("https://schema.org/PreOrder");
  });
});
