# 24 — Chairman audit and upgrade

**Date:** 18 August 2026 · **Reviewing:** Grok v1 implementation (`01`–`22`) and the shipped code
**Standard applied:** would I bet the company's reputation on this before approving more investment?

## Scores

Justified below. Scored against "international reference for SLP/STANAG preparation", not against
"good for a pre-launch startup".

| Area | Before | After | Why |
|---|---|---|---|
| Positioning | 9 | 9 | Genuinely sharp and defensible. Untouched. |
| Brand | 6 | 8 | Copy was already premium; the shareable surface was broken and there was no favicon |
| SEO (content) | 8 | 8 | Twelve pages with real intent, no cannibalisation, no thin pages |
| Technical SEO | 5 | 9 | No og:image on any authority page, breadcrumb mismatch, fake lastmod, duplicate descriptions, no x-default |
| GEO | 7 | 8 | llms.txt and entity work were right; added WebSite/knowsAbout, ES card, Article image |
| ASO | 8 | 8 | Paste-ready and correctly blocked on the store. Untouched. |
| Content | 9 | 9 | Best part of the whole package. Not AI slop. Untouched. |
| Authority / E-E-A-T | 6 | 6 | Still organisation-authored with no named expert. Unresolved — see risks |
| CRO | 6 | 6 | Funnel is designed but unmeasured until the app ships |
| Analytics | 4 | 5 | Correctly refuses to add cookies; still zero events firing |
| PR | 7 | 7 | Honest target list, no link buying. Untouched. |
| Social | 7 | 7 | Disciplined. Untouched. |
| International | 8 | 8 | Correct call to hold at ES/EN |
| Legal / claims | 6 | 9 | Registry was excellent as a document and unenforced as a control |
| Performance | 8 | 8 | 106 kB first load, all authority pages static |
| **Overall** | **6.9** | **8.0** | |

Authority, CRO and analytics cannot be raised by this pass. They need a live app,
real events, and a named human expert — not more marketing infrastructure.

## What Grok got right

1. **Caught the URL collision.** Master Plan v1 wanted `/reading`, `/listening`,
   `/writing`, `/speaking`. Those are learner-app routes and `Disallow`ed. Shipping
   marketing there would have been the single most expensive mistake available.
   Grok moved the cluster to `/guides/*` and wrote a test to keep it there.
2. **Content that does not read like AI.** "Good English. Wrong task. Zero." is a real
   insight from the domain. The pages state what STANAG 6001 is *not*, which is the
   thing candidates actually get wrong.
3. **Refused to fabricate.** Keyword volumes are marked UNKNOWN rather than invented.
   Okara's price is marked UNVERIFIED because the public pages conflict.
4. **Claims registry exists at all**, with SIPERDEF/SOLIDI correctly flagged NEEDS REVIEW.
5. **Zero broken internal links** across all twelve pages — verified.
6. **Knew what not to do:** no Reddit automation, no fake personas, no bought links,
   no paid spend before the store is live, no video production.

## What Grok missed

| # | Finding | Severity | Evidence |
|---|---|---|---|
| 1 | **No `og:image` on any of the 12 authority pages.** A page-level `openGraph` block does not inherit the root layout's images | P0 | `og:image` count: home 4, all 12 authority pages 0 |
| 2 | **Site-wide social image was 294×640**, a portrait phone screenshot, below X's 300px floor for `summary_large_image` | P0 | `sips` on `01_home.png` |
| 3 | **No favicon, no touch icon, of any kind** | P1 | No `app/icon*`, no `favicon.ico`, nothing in `public/` |
| 4 | **Claims registry unenforced.** One regex, which the live copy passed coincidentally | P0 | Injected four forbidden claims; old test caught none |
| 5 | **Breadcrumb schema contradicted the visible trail** on `/guides/*` — 2 items vs 3 | P1 | Rendered JSON-LD vs `.authority-crumbs` |
| 6 | **Sitemap `lastmod` was build time** for 15 legal URLs | P1 | `2026-08-18T18:05:36.800Z`, moving every deploy |
| 7 | **14 legal pages shared one identical meta description** | P1 | `pageMetadata()` fallback, no per-page value |
| 8 | **No `x-default` hreflang** on the EN/ES pairs | P2 | Rendered head |
| 9 | **Article schema had no `datePublished`, no `image`** | P2 | Rendered JSON-LD |
| 10 | **No `WebSite` schema**; `Organization` had an empty `sameAs` and no `logo` | P2 | `lib/authority.ts` |

## What was changed

See `22_IMPLEMENTATION_LOG.md` for the file-level record.

## What was deliberately not changed

| Thing | Why |
|---|---|
| All page copy in `content/authority/pages.ts` | It is good. Rewriting it to show activity would have made it worse |
| `01`–`21` strategy documents | Accurate and appropriately scoped. Amended `04` only where the code changed |
| The 12-URL architecture | Correct. Adding pages now would dilute, not build, authority |
| Pricing, quotas, product claims | Product truth is not marketing's to edit |
| `middleware.ts`, proxy policy, auth, billing | Out of scope by instruction, and correct in production |
| `<html lang>` for `/es/*` | See risks — the only fix costs static rendering site-wide |
| Analytics events / any tracking script | Requires a Cookie Policy change. Human and legal approval required |

## Residual risks

Items 3, 4 and 5 of the original list were **closed in the technical-closure pass
(18 Aug 2026)** and are recorded in `25_TECHNICAL_CLOSURE_2026-08-18.md`. What
remains cannot be closed by engineering.

1. **`<html lang="en">` on the three Spanish pages.** Next.js only lets the root
   layout render `<html>`. Varying it per route needs either `headers()` in the root
   layout — which forces every page dynamic and loses static rendering, a real TTFB
   and cost regression on Cloudflare Workers — or splitting the app into multiple
   root layouts via route groups, a large restructure of a production app. Both are
   disproportionate to a secondary language signal that `hreflang`, `og:locale` and
   `Article.inLanguage` already carry correctly, with content scoped by
   `<article lang="es">`. **Accepted as the better engineering tradeoff.**
2. **E-E-A-T has no named human.** Every page is authored by "SLP Command" as an
   organisation. For a domain where careers depend on the exam, a named author with
   stated credentials is the highest-value remaining authority lever. Requires a
   human decision about who that is. Credentials must never be invented.
3. **SIPERDEF / SOLIDI claims (C13) remain NEEDS REVIEW** against an official source.
4. **Nothing is measured yet.** No GA4, no events, no Search Console data. Every
   number in the dashboard spec is a placeholder until the app ships.
5. **Two lint warnings remain**, both pre-existing product code and neither blocking:
   `components/spike/CoachSpike.tsx` (`react-hooks/exhaustive-deps`) and
   `components/writing/WritingTools.tsx` (unused `decodeOrchestrator` import).
   Left for a product-scoped pass rather than edited from a marketing session.

## Human approvals required

| # | Item | Why |
|---|---|---|
| 1 | Any analytics beyond Search Console | Cookie Policy currently claims almost no storage on the public site |
| 2 | App Store submission and the ASO package going live | External, irreversible |
| 3 | Naming a human author for E-E-A-T | Personal exposure decision |
| 4 | Verifying C13 against an official Spanish source | Accuracy of an administrative claim |
| 5 | Changing the CSRF origin handling or Playwright base URL | Security-adjacent |
| 6 | Teacher outreach emails in `17` | External communication |
