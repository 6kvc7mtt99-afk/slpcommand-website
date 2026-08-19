# 24 — Chairman audit (consolidated)

**Date:** 18 August 2026
**Subject:** the Grok phase-1 growth package (`01`–`22`) and the shipped code.
**Standard:** would I bet the company's reputation on this before approving more investment?

> **This file consolidates two independent review tracks** that ran on the same day
> against the same phase-1 snapshot (`458a48a`), in separate working trees. Neither
> is a summary of the other and **both scorecards are preserved below**, because they
> measured different things and disagreeing is the useful part.
>
> | Track | Focus | Recorded in |
> |---|---|---|
> | **A — Technical & brand closure** | Social cards, favicon, schema correctness, sitemap truth, claims enforcement, lint/CI/E2E determinism | `22` Pass 2, `25` |
> | **B — Commercial & authority** | Conversion path, outbound citations, Spanish content depth, offer honesty, recovery routes | `22` Pass 2B |

**Method, both tracks:** dependencies installed, production build run, server started,
and the **rendered HTML measured**. Findings are from `curl`/Playwright output and test
runs, not from reading source and assuming it works.

> **Material finding about the audit itself:** phase 1 had **never been built or run**.
> `node_modules` was absent, so `next build`, `vitest` and Playwright had never executed
> against it. `22` recorded several items as DONE that were not observable in the output.
> The work was better than that log could prove, and in several places worse.

---

## 1. Verdict

**APPROVED WITH CORRECTIONS.** The strategy layer is strong and, unusually, honest. The
failure was not judgement — it was that nobody checked what the pages actually emitted.
Track A found the shareable surface was broken and the claims registry unenforced.
Track B found the funnel dead-ended.

## 2. What Grok got right — kept unchanged

| # | Decision | Why it stands |
|---|---|---|
| 1 | **Caught the URL collision.** Master Plan v1 wanted `/reading`, `/listening`, `/writing`, `/speaking`. Those are learner-app routes and `Disallow`ed. Moved to `/guides/*` **and wrote a test to keep it there.** | Non-obvious, correct, and the single most expensive mistake available. |
| 2 | Private routes emit `noindex, nofollow` **and** are robots-disallowed | Verified in rendered HTML. Correct belt-and-braces. |
| 3 | **Refused to invent keyword volumes** — every row `UNKNOWN / NEEDS_DATA`; Okara's price left UNVERIFIED because public pages conflict | Rare discipline. Fabricated volumes would have mis-ranked the roadmap. |
| 4 | **Refused to add analytics** before the Cookie Policy matched | Legally correct. `/cookies` enumerates cookies and claims an Art. 22.2 LSSI-CE exemption. |
| 5 | Claims registry existed at all, with SIPERDEF/SOLIDI correctly flagged NEEDS REVIEW | Right instinct; it needed teeth, not redrafting. |
| 6 | **Content that does not read like AI.** "Good English. Wrong task. Zero." | A real domain insight. The pages state what STANAG 6001 *is not*, which is what candidates get wrong. |
| 7 | Zero broken internal links across all twelve pages | Verified. |
| 8 | Knew what **not** to do: no Reddit automation, no fake personas, no bought links, no paid spend pre-launch, no video production, Okara = LATER | All correct under current evidence. |
| 9 | Did not claim the app is live | Consistent with C08 everywhere. |

## 3. Findings

### Track A — technical, brand, claims

| # | Finding | Sev | Evidence | Status |
|---|---|---|---|---|
| A1 | **No `og:image` on any of the 12 authority pages.** A page-level `openGraph` block does not inherit the root layout's images | P0 | og:image count: home 4, all 12 authority pages 0 | **Fixed** |
| A2 | **Site-wide social image was 294×640**, a portrait phone screenshot — below X's 300px floor for `summary_large_image` | P0 | `sips` on `01_home.png` | **Fixed** — 5 × 1200×630 cards from `assets/og/_template.svg` |
| A3 | **No favicon or touch icon of any kind** | P1 | No `app/icon*`, no `favicon.ico` | **Fixed** — `app/favicon.ico`, `icon.png` (512), `apple-icon.png` (180) |
| A4 | **Claims registry unenforced.** One regex, which live copy passed coincidentally | P0 | Injected four forbidden claims; old test caught none | **Fixed** — negation-aware guard, EN + ES, all 4 caught, 0 false positives |
| A5 | **Breadcrumb schema contradicted the visible trail** on `/guides/*` — 2 items vs 3 | P1 | Rendered JSON-LD vs `.authority-crumbs` | **Fixed** — both read `breadcrumbTrail()` |
| A6 | **Sitemap `lastmod` was build time** for 15 legal URLs | P1 | Timestamp moved every deploy | **Fixed** — parsed from each document's own "Last updated" line |
| A7 | **14 legal pages shared one identical meta description** | P1 | `pageMetadata()` fallback | **Fixed** — per-URL descriptions |
| A8 | **No `x-default` hreflang** on the EN/ES pairs | P2 | Rendered head | **Fixed** |
| A9 | `Article` schema had no `datePublished`, no `image` | P2 | Rendered JSON-LD | **Fixed** |
| A10 | **No `WebSite` schema**; `Organization` had empty `sameAs` and no `logo` | P2 | `lib/authority.ts` | **Fixed** (`sameAs` removal — see B6) |
| A11 | **`npx eslint .` crashed** — `eslint-config-next@16` against `next@15.5.23`; v16 ships native flat-config arrays that `FlatCompat.extends()` JSON-stringifies, and they are circular | P1 | Reproduced | **Fixed** — pinned to `15.5.23`; lint now exits 0 |
| A12 | **A guaranteed crash in the Speaking exam.** A `useEffect` sat *after* an early `return`, violating the Rules of Hooks | **P0 (product)** | `react-hooks/rules-of-hooks`, surfaced once lint ran | **Fixed** — hook moved above the branch |
| A13 | **CI red since 16 Aug.** The workflow started the mock backend *and* Playwright's `webServer` started it again; `reuseExistingServer` is false in CI | P0 | `http://127.0.0.1:3999/api/health is already used` | **Fixed** — duplicate step removed |
| A14 | E2E non-determinism; `proxy-csrf` failed on a `127.0.0.1` vs `localhost` Origin mismatch | P1 | 19 failures at 5 workers | **Fixed** in harness — `PLAYWRIGHT_BASE_URL=localhost`, `tests/e2e/baseUrl.ts` |

### Track B — commercial, authority, offer honesty

| # | Finding | Sev | Evidence | Status |
|---|---|---|---|---|
| B1 | **Zero conversion path.** All 12 authority CTAs pointed at `/#pricing`, `/#features` or another article. The homepage's only transactional button, "Get Professional in the app", pointed at **`/support`** — for a purchase that cannot complete while the iOS app is unreleased. A working free `/signup` existed, linked from nowhere. | **P0 — commercially fatal** | grepped all 12 `cta.href`; rendered HTML | **Fixed** — `lib/conversion.ts`; every page leads with Start free, contextual link kept as secondary |
| B2 | **11 of 12 pages cited nothing externally** | P1 | Rendered outbound links | **Fixed** — BILC + JAPCC, both fetched and quoted, emitted as schema `citation` |
| B3 | `SoftwareApplication` declared `operatingSystem: "iOS"` with a bare €9.99 Offer while the App Store listing does not exist and Professional is an Apple IAP | P1 | Rendered JSON-LD vs claim C08 | **Fixed** — marks up the web client: Free `InStock`, Professional `PreOrder` |
| B4 | `/es/slp-2` and `/es/slp-3` ≈70 words of body — stubs, on the market the strategy names as the commercial priority | P1 | Word count vs ~380 EN | **Fixed** — 584 / 542 words, written for the Spanish query |
| B5 | **No custom 404**; `/es` returned 404 | P1 | Status codes | **Fixed** — branded 404; `/es` → `/es/examen-slp` |
| B6 | `"sameAs":[]` emitted into every page | P1 | Rendered JSON-LD | **Fixed** — omitted until real profiles exist |
| B7 | `/guides` is an index but emitted `Article` | P1 | Rendered JSON-LD | **Fixed** — `CollectionPage` + `hasPart` |
| B8 | `/about` rendered "About SLP Command — SLP Command"; two titles truncated away the page's point (75, 70 chars) | P1 | Rendered `<title>` | **Fixed** |
| B9 | No Search Console verification path | P1 | No `verification` in metadata | **Fixed** — inert env-driven meta tag; sets no cookie |
| B10 | Authority pages had no a11y or conversion e2e coverage | P2 | Test inventory | **Fixed** — axe, single-h1, breadcrumb, signup presence |
| B11 | Keyword database pointed at URLs with nothing enforcing they exist | P2 | `09_KEYWORD_DATABASE.csv` | **Fixed** — `keywordMap.test.ts` + `26_KEYWORD_PAGE_INTENT_MAP.md` |

## 4. Deliberately not changed

| Item | Why |
|---|---|
| All page copy in `content/authority/pages.ts` (EN) | It is good. Rewriting it to show activity would have made it worse. |
| Growth docs `01`–`21` | Accurate and appropriately scoped. `04` amended only where the code changed. |
| The 12-URL architecture | Correct. Adding pages now would dilute, not build, authority. |
| Pricing, quotas, product claims | Product truth is not marketing's to edit. |
| `middleware.ts`, proxy policy, auth, billing, CSRF | Out of scope, and correct in production. |
| The 5-step `/signup` form | Product surface. A likely activation drag, but measure before cutting — `21` already schedules it (CRO E01). |
| In-app AI Support Assistant | **Product, not marketing.** Sends user messages to a backend AI. Needs privacy / AI-policy / subprocessor review. |
| `<html lang>` for `/es/*` | See risk 1. |
| Footer's 24 flat links | Cosmetically weak; changing it touches every legal page's link equity. Deferred. |
| Analytics scripts of any kind | Requires a Cookie Policy change. Human and legal approval. |

## 5. Scores — both tracks, unreconciled on purpose

Scored against "international reference for SLP/STANAG 6001 preparation", not
"good for a pre-launch startup".

| Area | Track A before → after | Track B (final state) | Why they differ |
|---|---|---|---|
| Positioning | 9 → 9 | 9 | Agree. |
| Brand | 6 → 8 | 7 | A credits the new cards + favicon; B still sees one flat 24-link footer and no photography. |
| SEO (content) | 8 → 8 | 8 | Agree. |
| Technical SEO | 5 → 9 | 9 | Agree. |
| GEO | 7 → 8 | 7 | A credits entity graph work; B holds it down for zero third-party corroboration and an unrun benchmark. |
| ASO | 8 → 8 | 6 | **Real disagreement.** A scores the artefact's quality; B scores it as unexecuted — no screenshots, no listing. |
| Content | 9 → 9 | 7 | **Real disagreement.** A rates the twelve pages; B rates twelve pages as thin for a "reference destination". |
| Authority / E-E-A-T | 6 → 6 | 4 | B weights zero inbound links and no named human author more heavily. |
| CRO | 6 → 6 | 6 | Same number, different reason: A saw a designed-but-unmeasured funnel; B found it dead-ended and fixed it. |
| Analytics | 4 → 5 | 4 | Nothing is measured either way. |
| PR | 7 → 7 | 3 | **Real disagreement.** A scores the plan; B scores outreach sent (zero). |
| Social | 7 → 7 | 3 | Same split: plan vs. profiles that exist (none). |
| International | 8 → 8 | 7 | Agree in substance. |
| Legal / claims | 6 → 9 | 8 | B holds one point back for the unreviewed in-app AI support feature. |
| Performance | 8 → 8 | 7 | B notes Core Web Vitals were never profiled on real hardware. |
| **Overall** | **6.9 → 8.0** | **6.5** | |

**How to read the gap.** Track A asks *"is the infrastructure correct?"* — the answer is
now yes, and 8.0 is fair. Track B asks *"has any of this met a user?"* — the answer is
no, and 6.5 is fair. Foundations score 8–9; distribution and proof score 3–4.

**The honest summary: a well-built shop on a street with no footfall.** The next 90 days
are not a building problem.

## 6. Residual risks

1. **`<html lang="en">` on the three Spanish pages.** Next.js only lets the root layout
   render `<html>`. Varying it per route needs `headers()` in the root layout, forcing
   every page dynamic and losing static rendering — a real TTFB and cost regression on
   Cloudflare Workers, traded for a secondary signal that `hreflang`, `og:locale` and
   `Article.inLanguage` already carry. Content is scoped with `<article lang="es">`.
   **Accepted, documented, not hidden.**
2. **E-E-A-T has no named human.** Every page is authored by "SLP Command" as an
   organisation. For a domain where careers depend on the exam, a named author with
   stated credentials is the highest-value remaining authority lever. Needs a human
   decision about who that is.
3. **Authority is the weakest area.** Two outbound citations; zero inbound. This, not
   the site, decides the 12-month outcome.
4. **Nothing is measured.** No Search Console property verified, no sitemap submitted,
   no behavioural data. Every number in the dashboard spec is a placeholder.
5. **SIPERDEF / SOLIDI (C13) remain NEEDS REVIEW** against an official source.
6. **ASO is a plan, not an asset.** No screenshots produced, no listing, no validation.
7. **The production web signup has not been exercised end-to-end.** Twelve pages now
   point at `/signup`. It is wired to the live backend, but registering a real account
   is an outward-facing side effect and was deliberately not performed.

## 7. The most important question

> *If SLP Command executes this system for 12 months with excellent product quality,
> what are the biggest realistic levers?*

### Controllable

1. **Product truth becoming reputation.** Task-and-language separation, five named
   speaking dimensions, and refusing to invent a pass probability are *checkable*
   claims. Candidates who pass will say why it helped. Strongest lever.
2. **Owning the definitional queries.** "What is STANAG 6001", "what does 3333 mean",
   "why did my writing fail". Low competition, high intent, and they feed AI answers.
3. **Spain, properly.** ES is under-served and the terms are commercial. One market done
   excellently beats seven done adequately.
4. **Teachers.** Fifteen independent SLP teachers who trust the writing guide are worth
   more than any ad budget and produce the citations GEO needs.
5. **Shipping the four-skill cluster and the App Store listing.** Both are just work.

### Partially controllable

6. **AI citation.** We can be accurate, consistent and citable. We cannot make a model
   recommend us. Track description *accuracy* first; mentions are a bonus.
7. **App Store ranking.** We control metadata, screenshots and rating prompts — not
   Apple's algorithm.
8. **Press and community.** We control pitch quality and usefulness, not uptake.

### Not controllable

9. National exam policy, convocatoria timing, whether any MoD blesses a tool.
10. Competitor behaviour, including a well-funded entrant.
11. Whether Google keeps sending clicks as AI answers absorb definitional queries.

**No ranking is promised anywhere in this package, and none should be.**

## 8. Human approvals required

| # | Item | Why it cannot be done here |
|---|---|---|
| 1 | **Verify the production web signup end-to-end** | Twelve pages point at it. Registering a real account is outward-facing. **Do before deploy.** |
| 2 | In-app AI Support Assistant | New AI processing of user messages. Privacy, Responsible AI and Subprocessors review. |
| 3 | Any analytics beyond Search Console | Amends three published policies; may require a consent mechanism. See `19` v2. |
| 4 | App Store submission and ASO copy going live | External, irreversible. |
| 5 | Naming a human author for E-E-A-T | Personal exposure decision. |
| 6 | Verifying C13 against an official Spanish source | Accuracy of an administrative claim. |
| 7 | Changing CSRF origin handling | Security-adjacent. |
| 8 | Teacher / PR outreach emails | External communication in the company's name. |
| 9 | Production deployment | Founder-controlled. |
| 10 | Changes to claims C06, C07, C08, C13 | Per `03`. |
