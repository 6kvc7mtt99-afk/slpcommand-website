# 04 — SEO master plan (implementation)

Parent strategy: Master Plan v1 §§8–11. This file records **what shipped** and **what is next**.

## Shipped technical SEO (18 Aug 2026)

| Item | Status | Location |
|---|---|---|
| Indexable authority IA | DONE | `app/stanag-6001`, `/slp`, `/slp-2`, `/slp-3`, `/es/*`, `/guides/*`, `/exam`, `/about` |
| robots.txt | DONE (pre-existing) | `app/robots.ts` — still Disallow app routes |
| sitemap.xml | DONE | `app/sitemap.ts` now includes authority URLs |
| Canonical + OG + Twitter | DONE | `lib/authority.ts`, `app/layout.tsx` |
| hreflang ES/EN | DONE | `/slp-2` ↔ `/es/slp-2`, `/slp-3` ↔ `/es/slp-3` |
| Article + FAQ + Breadcrumb JSON-LD | DONE | `components/marketing/JsonLd.tsx` |
| Organization + SoftwareApplication | DONE | Homepage |
| llms.txt | DONE | `public/llms.txt` |
| Internal links | DONE | Footer + related nav on each page |
| Open Graph / Twitter images | DONE (pass 2) | `authorityOgImage()`; 5 cards in `public/assets/og/` |
| Favicon / touch icon | DONE (pass 2) | `app/favicon.ico`, `app/icon.png`, `app/apple-icon.png` |
| hreflang x-default | DONE (pass 2) | `lib/authority.ts` |
| Breadcrumb schema = visible trail | DONE (pass 2) | `breadcrumbTrail()` shared by both |
| Truthful sitemap lastmod | DONE (pass 2) | parsed from each document's own date |
| Unique meta descriptions | DONE (pass 2) | `DESCRIPTIONS` in `lib/legalMeta.ts` |
| WebSite + Organization logo/knowsAbout | DONE (pass 2) | `lib/authority.ts` |
| SEO regression tests in CI | DONE (pass 3) | `seoInvariants`, `public-pages` e2e, lint now blocking |
| App-route collision avoided | DONE | Marketing is **not** on `/reading` etc. |

## Page inventory (live)

See `content/authority/pages.ts` for title, H1, keywords, FAQ, CTA.

## Next pages (do not spray)

| URL | Why | When |
|---|---|---|
| `/guides/reading` | Complete four-skill cluster | Days 31–45 |
| `/guides/speaking` | Five dimensions, public | Days 31–45 |
| `/compare/stanag-vs-cefr` | Mapping with caveats | Days 46–60 |
| `/glossary` | Entity terms | Days 46–60 |
| `/guides/how-to-prepare` | Commercial how-to | Days 46–60 |

## On-page rules (do not relax)

- One primary keyword per URL.
- First 80 words: definition + who it’s for.
- Cite BILC / official-adjacent sources; date-stamp admin claims.
- No “best app 2026”.
- Founder accuracy pass before publish.

## Regenerating social cards

Cards are static PNGs, not runtime-generated. Edit `assets/og/_template.svg` or the
`CARDS` array in `scripts/build-og.sh`, then run `./scripts/build-og.sh`. Requires
`rsvg-convert` (`brew install librsvg`). Never crop a screenshot into an OG image —
see `os/LEARNINGS.md` L002.

## Search Console (human)

1. Verify property slpcommand.com if not already.
2. Submit `https://slpcommand.com/sitemap.xml`.
3. Inspect `/stanag-6001` and `/es/examen-slp`.
4. Do not add marketing analytics cookies until Cookie Policy is updated.
