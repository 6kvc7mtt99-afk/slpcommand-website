import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { allAuthorityPages } from "@/lib/authority";
import { AUTHORITY_PAGES } from "@/content/authority/pages";

/**
 * Executable form of docs/growth/23_KEYWORD_PAGE_INTENT_MAP.md.
 *
 * A keyword spreadsheet that points at URLs nobody built is the most common way
 * an SEO plan quietly stops describing the site. These tests keep the map and
 * the routes honest about each other, and keep one primary keyword per page so
 * the cluster does not compete with itself.
 */

type Row = Record<string, string>;

function loadKeywords(): Row[] {
  const csv = readFileSync(
    path.join(process.cwd(), "docs", "growth", "09_KEYWORD_DATABASE.csv"),
    "utf8",
  ).trim();
  const [head, ...lines] = csv.split("\n");
  const cols = head.split(",");
  return lines.map((line) => {
    const cells = line.split(",");
    return Object.fromEntries(cols.map((c, i) => [c, (cells[i] ?? "").trim()])) as Row;
  });
}

const rows = loadKeywords();
const livePaths = new Set(allAuthorityPages().map((p) => p.path));
// Routes that exist outside the authority model.
const OTHER_LIVE = new Set(["/", "/signup", "/exam"]);
/** Values in recommended_url that mean "nothing is built for this yet". */
const NOT_A_URL = /^(not built|later|future|do not|none|admin)/i;

describe("keyword map", () => {
  it("has rows to check", () => {
    expect(rows.length).toBeGreaterThan(20);
  });

  it("recommends only URLs that actually exist", () => {
    for (const row of rows) {
      const url = row.recommended_url;
      if (!url || NOT_A_URL.test(url)) continue;
      const exists = livePaths.has(url) || OTHER_LIVE.has(url);
      expect(exists, `keyword "${row.keyword}" points at ${url}, which is not a route`).toBe(true);
    }
  });

  it("never recommends a page for a keyword we refuse to chase", () => {
    for (const row of rows) {
      if (row.priority !== "NEVER") continue;
      // Hazard terms (bare "SLP", bare "STANAG") must not be assigned a target.
      expect(NOT_A_URL.test(row.recommended_url) || row.recommended_url === "none",
        `hazard keyword "${row.keyword}" has a target page`).toBe(true);
    }
  });

  it("gives each authority page a distinct primary keyword", () => {
    const primaries = allAuthorityPages().map((p) => p.primaryKeyword.toLowerCase());
    const duplicates = primaries.filter((k, i) => primaries.indexOf(k) !== i);
    expect(duplicates, `primary keyword held by more than one page: ${duplicates.join(", ")}`).toEqual([]);
  });

  it("declares an intent and funnel stage for every page", () => {
    for (const [id, page] of Object.entries(AUTHORITY_PAGES)) {
      expect(page.intent, id).toBeTruthy();
      expect(["awareness", "interest", "consideration", "conversion"], id).toContain(page.funnel);
    }
  });
});
