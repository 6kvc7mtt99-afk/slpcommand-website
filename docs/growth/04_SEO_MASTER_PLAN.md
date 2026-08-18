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

## Search Console (human)

1. Verify property slpcommand.com if not already.
2. Submit `https://slpcommand.com/sitemap.xml`.
3. Inspect `/stanag-6001` and `/es/examen-slp`.
4. Do not add marketing analytics cookies until Cookie Policy is updated.
