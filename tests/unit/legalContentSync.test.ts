/**
 * FASE 2 — content/legal.ts must stay in sync with the root legal HTML.
 *
 * THE DEFECT THIS DEFENDS AGAINST, which actually happened.
 *
 * The legal pages have a three-step pipeline:
 *
 *   <root>/subprocessors.html          ← the source anyone edits
 *     └─ scripts/extract-legal.mjs
 *          ├─ content/legal/<slug>.html   (intermediate)
 *          └─ content/legal.ts            ← what the app actually imports
 *
 * During the Phase-2 remediation, Cloudflare and xAI were added to
 * /subprocessors, /privacy and /ai-usage. Both HTML layers were edited by hand
 * and the generator was never run, so `content/legal.ts` — the only one the
 * application reads — kept the old text. The pages built, deployed and returned
 * 200, and the two newly-disclosed subprocessors were simply absent. Nothing
 * failed; the work was just invisible.
 *
 * That is the worst shape a defect can take in a legal page: the document says
 * one thing in the repository and another thing to the person reading it.
 *
 * This test compares the generated module against the source of truth, so the
 * pipeline cannot silently go stale again. If it fails, the fix is one command:
 *
 *     node scripts/extract-legal.mjs
 */

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import * as legal from "../../content/legal";

const ROOT = path.resolve(__dirname, "../..");

/** Same extraction the generator performs, so the comparison is like-for-like. */
function extractWrap(html: string): string {
  const m = html.match(/<div class="wrap">([\s\S]*?)<\/div>\s*<\/body>/);
  if (!m) throw new Error("wrap not found");
  return m[1]
    .replace(/href="(?!\/|#|mailto:|https?:)([^"]+)"/g, 'href="/$1"')
    .trim();
}

/** slug → root file. Mirrors PAGES in scripts/extract-legal.mjs. */
const PAGES: Array<[string, string]> = [
  ["privacy", "privacy.html"],
  ["terms", "terms.html"],
  ["security", "security.html"],
  ["cookies", "cookies.html"],
  ["disclaimer", "disclaimer.html"],
  ["legal-notice", "legal-notice.html"],
  ["subprocessors", "subprocessors.html"],
  ["support", "support.html"],
  ["contact", "contact.html"],
  ["ai-usage", "ai-usage.html"],
  ["data-retention", "data-retention.html"],
  ["delete-account", "delete-account.html"],
  ["intellectual-property", "intellectual-property.html"],
  ["trust-center", "trust-center.html"],
];

/**
 * The generator names exports `slug.replace(/-/g, "_")`, so `legal-notice`
 * becomes `legal_notice` — snake_case, not camelCase. Mirrored exactly here
 * rather than guessed: an export-name mismatch would make every assertion in
 * this file pass vacuously against `undefined`.
 */
function exportNameFor(slug: string): string {
  return slug.replace(/-/g, "_");
}

describe("legal content pipeline is not stale", () => {
  for (const [slug, file] of PAGES) {
    it(`${slug} matches ${file}`, () => {
      const expected = extractWrap(fs.readFileSync(path.join(ROOT, file), "utf8"));
      const actual = (legal as Record<string, string>)[exportNameFor(slug)];
      expect(actual, `content/legal.ts has no export for "${slug}"`).toBeTypeOf("string");
      expect(
        actual,
        `content/legal.ts is stale for "${slug}". Run: node scripts/extract-legal.mjs`
      ).toBe(expected);
    });
  }
});

describe("the Phase-2 subprocessor disclosures reach the shipped module", () => {
  // Named explicitly rather than left to the generic sync check above. These
  // two are a compliance statement about who receives user data, and the whole
  // reason this test file exists is that they were absent from the shipped
  // bundle while present in the repository.
  it("Cloudflare is disclosed on /subprocessors", () => {
    expect(legal.subprocessors).toContain("Cloudflare");
  });

  it("xAI is disclosed on /subprocessors", () => {
    expect(legal.subprocessors).toContain("xAI");
  });

  it("Cloudflare and xAI are in the privacy processor list", () => {
    expect(legal.privacy).toContain("Cloudflare");
    expect(legal.privacy).toContain("xAI");
  });

  it("/ai-usage discloses the live Coach and the support assistant", () => {
    // The other half of the same Phase-2 change: the page used to state that
    // the Coach is "not powered by external AI inference", which is false of
    // the live ElevenLabs Coach.
    expect(legal.ai_usage).toContain("live AI Speaking Coach");
    expect(legal.ai_usage).toContain("xAI");
  });
});
