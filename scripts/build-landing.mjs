/**
 * Regenerate content/landing.ts from content/landing.html.
 *
 * The homepage renders `landingHtml` from the .ts module, but the source of
 * truth people edit is the .html file. They were kept in sync by hand, which
 * silently allows the rendered page and the file you edited to disagree.
 * `tests/unit/landingSync.test.ts` fails if they drift.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const html = fs.readFileSync(path.join(ROOT, "content", "landing.html"), "utf8");
fs.writeFileSync(
  path.join(ROOT, "content", "landing.ts"),
  `export const landingHtml = ${JSON.stringify(html)};\n`,
);
console.log("landing.ts regenerated from landing.html");
