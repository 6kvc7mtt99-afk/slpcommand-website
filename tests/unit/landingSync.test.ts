import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { landingHtml } from "@/content/landing";

/**
 * The homepage renders `content/landing.ts`, but the file a human edits is
 * `content/landing.html`. Nothing enforced that they agree, so an edit to the
 * HTML could silently never reach the rendered page. Regenerate with
 * `node scripts/build-landing.mjs`.
 */
describe("landing content", () => {
  it("keeps landing.ts identical to landing.html", () => {
    const source = readFileSync(
      path.join(process.cwd(), "content", "landing.html"),
      "utf8",
    );
    expect(landingHtml).toBe(source);
  });
});
