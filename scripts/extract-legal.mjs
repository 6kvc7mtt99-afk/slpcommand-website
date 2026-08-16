import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

const PAGES = [
  ["privacy.html", "privacy", "Privacy Policy"],
  ["terms.html", "terms", "Terms of Service"],
  ["ai-usage.html", "ai-usage", "Responsible AI Policy"],
  ["security.html", "security", "Security Policy"],
  ["cookies.html", "cookies", "Cookie Policy"],
  ["data-retention.html", "data-retention", "Data Retention Policy"],
  ["delete-account.html", "delete-account", "Account Deletion Policy"],
  ["disclaimer.html", "disclaimer", "Institutional Disclaimer"],
  ["intellectual-property.html", "intellectual-property", "Intellectual Property Policy"],
  ["legal-notice.html", "legal-notice", "Legal Notice"],
  ["subprocessors.html", "subprocessors", "Subprocessors and Third Parties"],
  ["support.html", "support", "Support"],
  ["contact.html", "contact", "Contact"],
  ["trust-center.html", "trust-center", "Trust Center"],
];

function extractWrap(html) {
  const m = html.match(/<div class="wrap">([\s\S]*?)<\/div>\s*<\/body>/);
  if (!m) throw new Error("wrap not found");
  return m[1]
    .replace(/href="(?!\/|#|mailto:|https?:)([^"]+)"/g, 'href="/$1"')
    .trim();
}

const outDir = path.join(ROOT, "content", "legal");
fs.mkdirSync(outDir, { recursive: true });

const exports = [];
for (const [file, slug] of PAGES) {
  const html = fs.readFileSync(path.join(ROOT, file), "utf8");
  const inner = extractWrap(html);
  fs.writeFileSync(path.join(outDir, `${slug}.html`), inner);
  exports.push({ slug, file: `${slug}.html` });
}

const index = `/* Auto-extracted from repo-root legal HTML. Do not tone-edit. */\n` +
  PAGES.map(([, slug]) => {
    const inner = fs.readFileSync(path.join(outDir, `${slug}.html`), "utf8");
    return `export const ${slug.replace(/-/g, "_")} = ${JSON.stringify(inner)};`;
  }).join("\n\n") +
  "\n";

fs.writeFileSync(path.join(ROOT, "content", "legal.ts"), index);
console.log("extracted", PAGES.length, "legal pages");
