# 22 — Implementation log

| Date | Action | File | Change | Reason | Test | Result | KPI | Status |
|---|---|---|---|---|---|---|---|---|
| 2026-08-18 | Audit Master Plan v1 | Desktop `SLP_COMMAND_AI_MARKETING_GROWTH_MASTER_PLAN.md` | Classified READY / NEEDS DATA / BLOCKED | Required before implement | Read-through | See `01` | n/a | DONE |
| 2026-08-18 | Discover URL collision | `app/robots.ts` + `app/(app)/` | Marketing must not use `/reading` etc. | Those are learner-app routes and Disallow | Code audit | Deviating to `/guides/*` | n/a | DONE |
| 2026-08-18 | Authority content model | `content/authority/pages.ts` `lib/authority.ts` | 12 page defs + metadata + JSON-LD | Citation pages | `tests/unit/authority.test.ts` | 4/4 pass | n/a | DONE |
| 2026-08-18 | Authority UI | `components/marketing/AuthorityPage.tsx` `JsonLd.tsx` | Shared article template | One quality bar | typecheck | tsc clean (ignoring .next dupes) | n/a | DONE |
| 2026-08-18 | Routes | `app/stanag-6001` `/slp` `/slp-2` `/slp-3` `/es/*` `/guides*` `/exam` `/about` | New public pages | P0 IA | unit + e2e list extended | unit pass; e2e not run in this session | indexable URLs | DONE |
| 2026-08-18 | Sitemap | `app/sitemap.ts` | Include authority URLs | Crawl | tsc | compiles | sitemap completeness | DONE |
| 2026-08-18 | Header/footer IA | `SiteChrome.tsx` | Learn + footer cluster | Internal links | visual later | code change | n/a | DONE |
| 2026-08-18 | Default OG/Twitter | `app/layout.tsx` | Card + screenshot | Share/GEO | none | code change | n/a | DONE |
| 2026-08-18 | Homepage JSON-LD | `app/page.tsx` | Organization + SoftwareApplication | Entity | none | code change | n/a | DONE |
| 2026-08-18 | llms.txt | `public/llms.txt` | Machine do/don’t | GEO | none | file exists | citable | DONE |
| 2026-08-18 | Authority CSS | `style.css` | Kicker/CTA/crumbs | Premium readability | none | added | n/a | DONE |
| 2026-08-18 | E2E list | `tests/e2e/public-pages.spec.ts` | New paths | Regression | not executed here | NEEDS REVIEW | 200s | PARTIAL |
| 2026-08-18 | Legal OG | `lib/legalMeta.ts` | description + twitter | Consistency | none | code change | n/a | DONE |
| 2026-08-18 | Growth package 01–22 | `docs/growth/*` | Execution artifacts | Traceability | files exist | written | n/a | DONE |
| 2026-08-18 | Competitor update | `10_COMPETITOR_DATABASE.csv` | Militärisches Englisch App Store | New DE rival | web search | listed; ratings UNKNOWN | n/a | DONE |
| 2026-08-18 | GEO baseline run | `12_GEO_BENCHMARK.csv` | Rows created | Need screenshots | not run | empty logs | mentions | PARTIAL |
| 2026-08-18 | Keyword volumes | `09_KEYWORD_DATABASE.csv` | UNKNOWN | No Ads/Ahrefs | n/a | still UNKNOWN | volumes | NEEDS REVIEW |
| 2026-08-18 | App Store submit | ASC | — | App not public | — | still “coming soon” | installs | BLOCKED |
| 2026-08-18 | Analytics pixels on marketing | site | none added | Cookie Policy | — | correctly not added | n/a | DONE |
| 2026-08-18 | Okara paid | — | not implemented | No bottleneck that requires it | — | LATER | cost | REJECTED |
| 2026-08-18 | `/guides/reading` `/guides/speaking` | — | not built | P1 after writing/listening | — | — | cluster | PARTIAL |
| 2026-08-18 | Playwright e2e / visual QA | browser | not run this session | No guarantee of local server | — | — | UX | NEEDS REVIEW |
| 2026-08-18 | Deploy to production | Cloudflare | not deployed by this agent | Needs founder deploy | — | — | live index | BLOCKED |

---

# Pass 2 — Chairman review and upgrade (Claude)

**Date:** 18 August 2026 · **Scope:** marketing infrastructure only. No product, scoring,
billing, auth or legal-copy behaviour changed. Audit and reasoning: `24_CHAIRMAN_AUDIT_2026-08-18.md`.

| # | Area | Change | Reason | Files | Test | Result |
|---|---|---|---|---|---|---|
| 1 | Technical SEO | Per-page Open Graph and Twitter images on all 12 authority pages | A page-level `openGraph` block does not inherit the root layout's `images`; all 12 shipped with no card | `lib/authority.ts` | `seoInvariants` + `public-pages` e2e | PASS — verified in rendered HTML |
| 2 | Brand | Five 1200×630 cards generated from an SVG source, incl. a Spanish card | Previous card was a 294×640 portrait screenshot, under X's 300px floor | `assets/og/_template.svg`, `scripts/build-og.sh`, `public/assets/og/*.png` | dimension + HTTP 200 checks | PASS — 5 × 1200×630 |
| 3 | Brand | Favicon, `icon.png` (512), `apple-icon.png` (180) from the `.logo-mark` design | The site shipped no icon of any kind | `assets/og/icon.svg`, `app/favicon.ico`, `app/icon.png`, `app/apple-icon.png` | e2e asset 200s | PASS |
| 4 | Legal / claims | Executable claims registry scanning every public surface, EN + ES, negation-aware | `03` was enforced by one regex that live copy passed by coincidence | `tests/unit/claimsRegistry.test.ts` | injected 4 forbidden claims | PASS — all 4 caught, 0 false positives |
| 5 | Structured data | Breadcrumb schema now derives from the same trail the page renders | `/guides/*` declared 2 crumbs while showing 3 | `lib/authority.ts`, `components/marketing/AuthorityPage.tsx` | `seoInvariants` + e2e | PASS — 3 crumbs both places |
| 6 | Technical SEO | Sitemap `lastmod` read from each document's own "Last updated" line | Was `new Date()`; every deploy claimed all 15 legal pages had just changed | `app/sitemap.ts`, `lib/legalMeta.ts` | `seoInvariants` | PASS — `/privacy` 2026-07-31, `/cookies` 2026-08-16 |
| 7 | Content SEO | Unique meta description for each of the 15 public/legal URLs | All shared one fallback sentence | `lib/legalMeta.ts` | uniqueness test | PASS |
| 8 | Internationalisation | `x-default` hreflang on the EN/ES pairs | No default for unmatched languages | `lib/authority.ts` | `seoInvariants` | PASS |
| 9 | GEO | `Article.datePublished` + `image`; added `WebSite`; `Organization` gains `logo`, `knowsAbout` | Incomplete entity graph for AI retrieval | `lib/authority.ts`, `app/page.tsx` | `seoInvariants` | PASS |
| 10 | Marketing OS | Local roles, quality gate, experiment ledger, learnings | Reject the 1-star external repo; keep the three ideas worth having | `docs/growth/os/*`, `23_MARKETING_OS_DECISION.md` | n/a | DONE |

## Verification

| Check | Command | Result |
|---|---|---|
| Types | `npx tsc --noEmit` | PASS |
| Unit | `npx vitest run` | **125 passed / 22 files** (was 94 / 20) |
| Production build | `npx next build` | PASS — 70 static pages |
| E2E public pages | `npx playwright test public-pages --workers=1` | **7 passed** |
| E2E full suite | `npx playwright test --workers=1` | 29 passed, 2 failed — neither caused by this pass, see `24` risks 4–5 |
| Lint | `npx eslint .` | **BROKEN — pre-existing config error, not run in CI** |

The two E2E failures are `proxy-csrf` (consistent; a `localhost` vs `127.0.0.1`
Origin mismatch in pre-existing middleware — see `24` risk 5) and, on a cold `.next`,
Grok's `public pages return 200` test, which walks 27 routes inside one 30-second
timeout while the dev server compiles each on demand. Both pass in isolation on a warm
server; the seven `public-pages` tests pass 7/7 every run.

Rendered-HTML verification against `next start`: `og:image` and `twitter:image` present
on all 12 authority pages and all legal pages; `x-default` emitted; breadcrumb JSON-LD
matches the visible trail; all five cards and three icons return 200; sitemap dates stable.

---

# Pass 3 — Technical closure (Claude)

**Date:** 18 August 2026 · **Scope:** close the engineering loop. No new pages, no new
content, no new dependencies. Full reasoning: `25_TECHNICAL_CLOSURE_2026-08-18.md`.

| # | Area | Change | Reason | Files | Test | Result |
|---|---|---|---|---|---|---|
| 1 | Tooling | `eslint-config-next` 16.3.1 → **15.5.23** to match `next@15.5.23` | v16 ships native flat config; routing it through `FlatCompat.extends()` crashed on a circular structure before linting anything | `package.json`, `package-lock.json` | `npx eslint .` | PASS — lint runs |
| 2 | Tooling | Ignore `next-env.d.ts` and `graft/` | Next regenerates `next-env.d.ts` every build and it says "should not be edited" | `eslint.config.mjs` | `npx eslint .` | PASS |
| 3 | Product (lint-only) | Renamed a local `const module` → `moduleName` | Shadowing the CommonJS `module` can break bundling (`@next/next/no-assign-module-variable`) | `lib/api/support.ts` | `vitest support` | PASS — 3/3 |
| 4 | **Product bug** | Hoisted a `useEffect` above an early return in `SpeakingExam` | Hook count went 6 → 7 between renders on gate→consent, crashing React on the first interaction of the Speaking exam. Founder-approved; body already guards on `phase`, so behaviour-preserving | `components/speaking/SpeakingExam.tsx` | `playwright speaking` | PASS — 3/3 |
| 5 | Testing | E2E now builds and serves a **production** server instead of `next dev` | Dev compiles routes on demand; failures scaled with parallelism (19 at 5 workers, 11 at 2, 2 at 1) | `playwright.config.ts` | full suite ×3 | PASS — 31/31 each |
| 6 | Testing | E2E origin moved to `localhost`, centralised in `tests/e2e/baseUrl.ts` | Next normalises `nextUrl.origin` to `localhost`, so a `127.0.0.1` Origin was rejected 403 by the CSRF check. **Middleware untouched** | `tests/e2e/baseUrl.ts`, 6 spec files, `playwright.config.ts` | `playwright proxy-csrf` | PASS |
| 7 | Testing | Same change fixed 10 authenticated tests | Specs seeded cookies at `127.0.0.1`; cookies are not shared with `localhost`, so sessions never applied | `auth-dashboard`, `academy`, `admin`, `speaking`, `coach-spike`, `visual-qa` | full suite | PASS |
| 8 | Testing | `COACH_SPIKE_ENABLED=1` on the test server only | `isCoachSpikeEnabled()` defaults off under `NODE_ENV=production`; the spike specs test that surface. Production default unchanged | `playwright.config.ts` | `playwright coach-spike` | PASS — 3/3 |
| 9 | Claims safety | Added negation regression tests | The guard must separate a forbidden assertion from an honest denial in both directions, permanently | `tests/unit/claimsRegistry.test.ts` | `vitest` | PASS — 39 in file |
| 10 | CI | `npx eslint .` added as a blocking step; base URL set to `localhost` | CI never ran lint at all | `.github/workflows/ci.yml` | — | DONE |
| 11 | Marketing OS | Documented the explicit role chain | Phase requirement: Analyst → Copywriter → Creative → SEO/GEO → Analyst → Learning | `docs/growth/os/README.md` | — | DONE |

## Verification — pass 3

| Command | Before pass 3 | After |
|---|---|---|
| `npx tsc --noEmit` | exit 0 | exit 0 |
| `npx eslint .` | **crash** (circular structure) | **exit 0** — 0 errors, 2 warnings |
| `npx vitest run` | 125 passed / 22 files | **143 passed / 22 files** |
| `npx next build` | exit 0 | exit 0 — 70 static pages |
| `npx playwright test` | 19 failed at 5 workers (dev server) | **31/31 passed**, 5 workers, production server, 3 consecutive runs |

The two surviving lint warnings are pre-existing product code
(`CoachSpike.tsx` exhaustive-deps, `WritingTools.tsx` unused import) and do not
block. Marketing files produce zero lint findings.
# Pass 4 — Commercial and authority review (Claude, isolated worktree)

Baseline established by actually running the project for the first time:
`npm install` (node_modules was absent), `tsc --noEmit`, `vitest`, `next build`,
`next start`, then measuring the rendered HTML. Work done in an isolated git
worktree on branch `growth/chairman-review` to avoid colliding with concurrent
sessions. Snapshot of phase 1 preserved as commit `458a48a` and branch
`snapshot/grok-phase1-20260818`, plus a tar backup in `90-BACKUPS/`.

| Date | Area | Change | Reason | Files | Test | Result | Status |
|---|---|---|---|---|---|---|---|
| 2026-08-18 | Safety | Committed phase-1 work untouched; tar backup | It was uncommitted on a production project with two agents writing | whole tree | build+tests at that state | tsc clean, 94/94, build OK | DONE |
| 2026-08-18 | CRO | **Conversion path opened.** Authority CTAs lead with Start free → `/signup`; contextual link kept as secondary | All 12 pages dead-ended; `/signup` was linked from nowhere | `lib/conversion.ts`, `AuthorityPage.tsx`, `SiteChrome.tsx`, `style.css` | `conversion.test.ts` | 7/7 pass | DONE |
| 2026-08-18 | CRO | Homepage hero + both pricing cards act; "Get Professional in the app" → `/support` removed | Money CTA pointed at the support desk for a purchase that cannot complete | `content/landing.html`, `content/landing.ts` | `conversion.test.ts`, `landingSync.test.ts` | pass | DONE |
| 2026-08-18 | Build | `scripts/build-landing.mjs`; landing.ts generated, not hand-synced | The rendered homepage could silently diverge from the edited file | scripts, tests | `landingSync.test.ts` | pass | DONE |
| 2026-08-18 | Schema | SoftwareApplication made accurate: web client, Free InStock, Professional PreOrder | Declared an iOS purchase that cannot be transacted (C08) | `lib/authority.ts` | `conversion.test.ts` | pass | DONE |
| 2026-08-18 | Schema | `sameAs: []` no longer emitted | An empty array is noise in the output | `lib/authority.ts` | — | verified in HTML | DONE |
| 2026-08-18 | Schema | `/guides` → `CollectionPage` + `hasPart` | An index is not an Article | `pages.ts`, `lib/authority.ts` | build + curl | verified | DONE |
| 2026-08-18 | E-E-A-T | **Citations added to all 12 pages** (BILC, JAPCC), rendered + schema `citation` | 11 of 12 pages cited nothing | `pages.ts`, `AuthorityPage.tsx`, `style.css` | `authority.test.ts` host allowlist | 6/6 pass | DONE |
| 2026-08-18 | Content | `/es/slp-2`, `/es/slp-3` rewritten: ~70 → 584 / 542 words | Stubs on the priority commercial market | `pages.ts` | build + word count | verified | DONE |
| 2026-08-18 | Metadata | `/about` brand duplication fixed; 2 over-length titles shortened | "About SLP Command — SLP Command"; 75 and 70 chars | `lib/authority.ts`, `pages.ts` | `seoInvariants.test.ts` | pass | DONE |
| 2026-08-18 | Recovery | Branded 404; `/es` → `/es/examen-slp` | Stock 404; `/es` was a dead end | `app/not-found.tsx`, `next.config.ts` | curl 404/308 | verified | DONE |
| 2026-08-18 | Analytics | Search Console verification hook, env-driven, inert | Removes the deployment blocker without touching the cookie position | `app/layout.tsx`, `.env.example` | tsc | clean | DONE |
| 2026-08-18 | Docs | `19_ANALYTICS_SPEC.md` → v2 with legal analysis and options A–D | v1 stated the constraint but gave no decision path | docs | — | written | DONE |
| 2026-08-18 | Docs | `26_KEYWORD_PAGE_INTENT_MAP.md` + `keywordMap.test.ts` | Brief §7; the keyword CSV pointed at unverified URLs | docs, tests | `keywordMap.test.ts` | 5/5 pass | DONE |
| 2026-08-18 | Docs | `24_CHAIRMAN_AUDIT.md` merged with the concurrent technical/brand audit (Track A + Track B, both scorecards kept) — findings, scores, approvals | Two independent reviews ran the same day; neither summarises the other | docs | — | written | DONE |
| 2026-08-18 | Testing | Authority a11y + breadcrumb + signup e2e coverage | The SEO cluster had none | `tests/e2e/a11y.spec.ts` | Playwright | 4/4 pass | DONE |
| 2026-08-18 | Testing | **Playwright public-pages executed for the first time** | v1 log recorded it as NEEDS REVIEW / not run | — | Playwright | 3/3 pass | DONE |
| 2026-08-18 | Product | In-app Support Assistant left untouched | Product surface; needs privacy/AI-policy review | — | — | — | **HUMAN APPROVAL** |
| 2026-08-18 | Product | 5-step signup left untouched | Likely activation drag, but a founder decision; measure first | — | — | — | DEFERRED |
| 2026-08-18 | Deploy | Not deployed | Founder-controlled | — | — | — | BLOCKED |
