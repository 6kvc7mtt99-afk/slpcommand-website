import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { AUTHORITY_PAGES } from "@/content/authority/pages";
import * as legalContent from "@/content/legal";
import { MARKETING_RENDERS, visibleText } from "./renderPublic";

/**
 * Executable form of docs/growth/03_CLAIMS_REGISTRY.md.
 *
 * The registry lists claims that must never ship (C14 "best/only", C15 official
 * or NATO endorsement, C16 guaranteed pass, plus the Android and pass-probability
 * bans). A markdown table cannot stop a future copy edit from reintroducing one.
 * This test can, and it is the cheapest insurance the brand has: a single
 * "official NATO app" line in production is a trust and legal problem that no
 * amount of SEO recovers from.
 *
 * Patterns are deliberately assertive rather than keyword-based. The site
 * legitimately and frequently says things like "there is no official NATO exam"
 * and "not an official assessment"; those must keep passing. Only a positive
 * claim should fail.
 */

const FORBIDDEN: { id: string; label: string; pattern: RegExp }[] = [
  // C15 — manufactured authority
  { id: "C15", label: "claims official status", pattern: /\b(is|are)\s+(the\s+)?official\b/i },
  { id: "C15", label: "claims approval by an authority", pattern: /\b(approved|endorsed|certified|accredited|authorised|authorized)\s+by\s+(NATO|BILC|the\s+)?(Ministry|MoD|NATO)/i },
  { id: "C15", label: "claims NATO endorsement", pattern: /\bNATO[- ]?(approved|endorsed|certified|official)\b/i },
  { id: "C15", label: "claims official app status", pattern: /\bofficial\s+(NATO\s+)?(app|application)\b/i },
  { id: "C15", label: "claims military adoption", pattern: /\bused\s+by\s+(NATO|the\s+(military|armed\s+forces)|[A-Z]\w*\s+(HQ|Command))/i },
  { id: "C15", label: "claims official status (ES)", pattern: /\b(es|somos)\s+(la|el)\s+(app|plataforma|examen)\s+oficial\b/i },
  { id: "C15", label: "claims OTAN endorsement (ES)", pattern: /\b(avalado|homologado|certificado|aprobado)\s+por\s+(la\s+)?OTAN\b/i },

  // C14 — superlatives we cannot substantiate
  { id: "C14", label: "superlative claim", pattern: /\bthe\s+(best|only)\s+(\w+\s+){0,2}(SLP|STANAG)\b/i },
  { id: "C14", label: "sole-provider claim", pattern: /\bthe\s+only\s+dedicated\b/i },
  { id: "C14", label: "superlative claim (ES)", pattern: /\bla\s+(mejor|única)\s+(app|plataforma)\b/i },

  // C16 / C09 — guaranteed outcomes and invented pass probability
  { id: "C16", label: "guarantees a pass", pattern: /\b(guaranteed|guarantee[sd]?)\s+(a\s+)?(pass|result|apto)\b/i },
  { id: "C16", label: "guarantees a pass", pattern: /\bpass\s+guaranteed\b/i },
  { id: "C16", label: "guarantees a pass (ES)", pattern: /\b(apto|aprobado)\s+(garantizado|asegurado)\b/i },
  { id: "C16", label: "guarantees a pass (ES)", pattern: /\baprobar[áa]s\s+(s[ií]|seguro)\b/i },
  { id: "C09", label: "states a pass probability", pattern: /\b\d{1,3}\s?%\s+(chance|probability|likely)\b/i },
  { id: "C09", label: "states a pass probability (ES)", pattern: /\b\d{1,3}\s?%\s+de\s+(probabilidad|aprobar)\b/i },

  // C08 — platform truth
  { id: "C08", label: "advertises Android", pattern: /\b(available|now)\s+on\s+Android\b/i },
  { id: "C08", label: "advertises Android (ES)", pattern: /\bdisponible\s+en\s+Android\b/i },
];

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
}

/**
 * Words that flip a forbidden phrase into an honest denial. The site says
 * "Not available on Android" and "there is no official NATO exam" on purpose,
 * and those sentences must keep shipping.
 */
const NEGATORS =
  /\b(not|never|no|non|without|cannot|refuse[sd]?|neither|nor|nunca|sin|ning[uú]n|ninguna|tampoco|jam[aá]s)\b/i;

/** The sentence or list item containing `index`. */
function enclosingSentence(text: string, index: number): string {
  const start = Math.max(
    ...[".", "!", "?", "\n", "•", "|", ";"].map((mark) => text.lastIndexOf(mark, index)),
    -1,
  );
  let end = text.length;
  for (const mark of [".", "!", "?", "\n", "•", "|", ";"]) {
    const found = text.indexOf(mark, index);
    if (found !== -1 && found < end) end = found;
  }
  return text.slice(start + 1, end);
}

/** Positive assertions of a forbidden claim, ignoring denials of it. */
function assertiveHits(text: string, pattern: RegExp): string[] {
  const scan = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
  const hits: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = scan.exec(text)) !== null) {
    const sentence = enclosingSentence(text, match.index);
    const before = sentence.slice(0, sentence.indexOf(match[0]));
    if (!NEGATORS.test(before)) hits.push(sentence.trim());
    if (match.index === scan.lastIndex) scan.lastIndex += 1;
  }
  return hits;
}

/**
 * llms.txt carries a "## Do not say" block whose entire job is to spell out the
 * forbidden claims for crawlers. Scanning it for forbidden claims would flag the
 * guardrail itself, so it is excised here and asserted on separately below.
 */
function llmsTxt(): { scannable: string; prohibitions: string } {
  const raw = readFileSync(path.join(process.cwd(), "public/llms.txt"), "utf-8");
  const start = raw.indexOf("## Do not say");
  if (start === -1) return { scannable: raw, prohibitions: "" };
  const end = raw.indexOf("\n## ", start + 1);
  const stop = end === -1 ? raw.length : end;
  return {
    scannable: raw.slice(0, start) + raw.slice(stop),
    prohibitions: raw.slice(start, stop),
  };
}

/** Every string of public-facing copy, labelled by where it comes from. */
function publicCopy(): { source: string; text: string }[] {
  const surfaces: { source: string; text: string }[] = [];

  for (const [id, page] of Object.entries(AUTHORITY_PAGES)) {
    const parts = [
      page.title,
      page.description,
      page.h1,
      page.kicker,
      ...page.sections.map((s) => `${s.h2} ${stripTags(s.html)}`),
      ...page.faq.map((f) => `${f.q} ${f.a}`),
      `${page.cta.heading} ${page.cta.body} ${page.cta.label}`,
      ...page.related.map((r) => r.label),
    ];
    surfaces.push({ source: `authority:${id}`, text: parts.join(" ") });
  }

  for (const page of MARKETING_RENDERS) {
    surfaces.push({ source: `marketing:${page.path}`, text: visibleText(page.html) });
  }

  for (const [key, html] of Object.entries(legalContent)) {
    if (typeof html === "string") {
      surfaces.push({ source: `legal:${key}`, text: stripTags(html) });
    }
  }

  surfaces.push({ source: "llms.txt", text: llmsTxt().scannable });

  return surfaces;
}

describe("claims registry (docs/growth/03_CLAIMS_REGISTRY.md)", () => {
  const surfaces = publicCopy();

  it("collects every public surface", () => {
    expect(surfaces.length).toBeGreaterThan(15);
    for (const surface of surfaces) {
      expect(surface.text.length, surface.source).toBeGreaterThan(0);
    }
  });

  for (const rule of FORBIDDEN) {
    it(`never ${rule.label} [${rule.id}]`, () => {
      const hits = surfaces.flatMap((surface) =>
        assertiveHits(surface.text, rule.pattern).map(
          (sentence) => `${surface.source}: "${sentence}"`,
        ),
      );
      expect(hits, `${rule.id} — ${rule.label}`).toEqual([]);
    });
  }


  /**
   * The guard has to tell a forbidden assertion apart from an honest denial of
   * it. The site says "there is no official NATO exam" and "Not available on
   * Android" deliberately; if those ever start failing, the guard is broken and
   * someone will "fix" it by deleting the disclaimer.
   */
  describe("negation handling", () => {
    const MUST_PASS = [
      "SLP Command is not an official NATO examination.",
      "There is no official NATO English exam.",
      "It is not affiliated with NATO, BILC, or any Ministry of Defence.",
      "AI feedback is indicative guidance, not an official SLP assessment.",
      "Not available on Android at the time of this page.",
      "We will never give you a pass probability.",
      "This is not the best app; we do not make that claim.",
      "No pass is guaranteed.",
      "SLP Command no está afiliado a la OTAN ni a ningún organismo oficial.",
      "No es un examen oficial.",
    ];

    for (const sentence of MUST_PASS) {
      it(`allows the honest denial: "${sentence.slice(0, 48)}..."`, () => {
        for (const rule of FORBIDDEN) {
          expect(
            assertiveHits(sentence, rule.pattern),
            `${rule.id} (${rule.label}) wrongly flagged a denial`,
          ).toEqual([]);
        }
      });
    }

    const MUST_FAIL = [
      "SLP Command is the official NATO app.",
      "This trainer is NATO-approved.",
      "It is used by NATO and the armed forces.",
      "The best SLP trainer available.",
      "Pass guaranteed.",
      "You have a 94% chance of passing.",
      "Available on Android.",
      "Es la app oficial del examen.",
    ];

    for (const sentence of MUST_FAIL) {
      it(`still catches the assertion: "${sentence.slice(0, 48)}"`, () => {
        const caught = FORBIDDEN.some((rule) => assertiveHits(sentence, rule.pattern).length > 0);
        expect(caught, `no rule caught: ${sentence}`).toBe(true);
      });
    }
  });

  it("keeps the machine-readable prohibitions in llms.txt", () => {
    const { prohibitions } = llmsTxt();
    expect(prohibitions, "llms.txt must keep its 'Do not say' block").toContain("Do not say");
    for (const phrase of ["NATO", "pass probability", "official"]) {
      expect(prohibitions.toLowerCase()).toContain(phrase.toLowerCase());
    }
  });

  it("keeps the independence disclaimer on every authority page", () => {
    for (const [id, page] of Object.entries(AUTHORITY_PAGES)) {
      const blob = page.sections.map((s) => s.html).join(" ");
      const disclaims = /not\s+affiliated|no\s+est[áa]\s+afiliado/i.test(blob);
      expect(disclaims, `${id} must carry the independence note`).toBe(true);
    }
  });
});
