# 27 — Marketing execution plan

**Date:** 19 August 2026 · **Author:** Chairman review, continued (CMO/Growth Director pass)
**Status:** Infrastructure is CLOSED. This is the handoff to execution.

> **Filename note.** The prior brief asked for `26_MARKETING_EXECUTION_PLAN.md`.
> `26` is already `KEYWORD_PAGE_INTENT_MAP.md` (added by the parallel chairman
> track that merged in as commit `0431909`). This file is `27` to avoid
> overwriting it. Nothing was renamed.

---

## 1. Executive verdict

The technical and content infrastructure is **done to a professional standard**
and has sat unused since 18 August: twelve indexed pages, a working funnel from
authority page to free signup, a claims registry enforced by tests, and a Search
Console verification hook that is wired but never turned on.

**Nothing further should be built.** The gap between where this project is and
where it needs to be is not code — it is five external accounts and one email.
Every remaining blocker is either (a) something only Rafael can click, because it
requires a Google/Apple/X login, or (b) something that requires the app to be
live in the App Store, which is outside this repository's control.

This document draws the line precisely: what is ready, what needs one human
action, and what must wait. It recommends **zero new paid tools** and
**zero Okara** — see §18.

---

## 2. Current marketing readiness

| Area | Already ready | Missing | Blocked by human | Blocked by App Store | Priority |
|---|---|---|---|---|---|
| **SEO — technical** | Sitemap, robots, canonical, hreflang+x-default, JSON-LD (Article/FAQ/Breadcrumb/Org/WebSite/SoftwareApplication), OG cards (1200×630, 5 variants), favicon/icons, truthful lastmod. Verified by `tests/unit/seoInvariants.test.ts` + Playwright | Nothing structural | Search Console verification (§5) | — | **P0** |
| **SEO — content** | 12 indexable pages, one primary keyword each, zero cannibalisation (`26_KEYWORD_PAGE_INTENT_MAP.md`, enforced by `tests/unit/keywordMap.test.ts`) | `/guides/reading`, `/guides/speaking` (P1, days 31–45 per `21`); `/compare/stanag-vs-cefr`, `/glossary` (P2) | — | — | P1 for the two missing guides |
| **CRO** | Every authority page's CTA now points at a real free `/signup`, quotas verified against live pricing by `tests/unit/conversion.test.ts` (fixed in Pass 4 — previously the only pricing CTA pointed at `/support`) | Post-signup funnel visibility (§4) | Analytics decision (§15) | — | **P0** (already shipped) |
| **GEO** | `llms.txt`, entity consistency, `12_GEO_BENCHMARK.csv` schema ready | **Zero rows logged.** The baseline row literally says `NOT_LOGGED` | Someone has to run the 12 prompts (§7) | — | **P0** |
| **ASO** | Full paste-ready package: name, subtitle, keywords, promo text, 6-screenshot story, review-prompt timing (`06_ASO_MASTER_PLAN.md`) | Nothing on our side | App Store Connect account access | **App not submitted** | Blocked, not missing |
| **Claims safety** | Registry enforced by `tests/unit/claimsRegistry.test.ts`, negation-aware, verified by injection testing | — | — | — | Done |
| **Analytics** | Search Console meta-tag hook shipped and inert (`app/layout.tsx`), full legal analysis done (`19_ANALYTICS_SPEC.md` v2) | GA4/behavioural — deliberately not built | **Verify property (20 min); legal sign-off for any cookie-based tool** | — | **P0** for Search Console, **blocked** for GA4 |
| **Content engine** | Pipeline defined, 5 of 8 first research objects shipped as pages (`07`) | 3 remaining objects: how-to-prepare, after-a-fail, STANAG-vs-CEFR | — | — | P1 |
| **Social — X** | Bio, pillars, first-week post plan (`15_X_STRATEGY.md`) | Account does not exist | **Create account** | — | P1 |
| **Social — YouTube** | Channel positioning, first-3-video briefs (`14_YOUTUBE_STRATEGY.md`) | Channel does not exist; no video produced | **Create channel** | — | P2 — see §10 |
| **PR / partnerships** | Outreach database with named targets, sample pitch (`17`, `18`) | Emails not sent | **Send them** | — | P1 |
| **Internationalisation** | Correct hold at ES/EN, justified in `01` §3 | — | — | — | Correct as-is |
| **Legal posture** | Cookie Policy explicitly enumerates cookies and claims the LSSI-CE Art. 22.2 exemption — this is an asset, not a gap | — | Counsel review before any behavioural tracking | — | Gate, not a task |

**Read this table as:** almost everything in the "blocked by human" column is a
single account creation or a 20-minute console task. Almost nothing is blocked
by missing engineering.

## 3. External marketing stack

Evaluated against one test: **does it produce a measurable advantage a pre-launch
site with no ad budget actually needs**, not "is it popular."

| # | Platform | Purpose | Required now? | Cost | Rafael creates | Claude implements | Data collected | Privacy/legal | Priority |
|---|---|---|---|---|---|---|---|---|---|
| 1 | **Google Search Console** | Organic visibility: impressions, clicks, CTR, position, indexing, sitemap status | **Yes** | Free | Verify property, submit sitemap | Verification hook already shipped (inert) | Aggregated Google-side query/click data. No cookie set by us | None — no client-side collection | **P0** |
| 2 | **Google Analytics 4** | Website behaviour: sessions, landing pages, on-site journeys | **No** | Free | Nothing yet | Nothing yet | `_ga`/`_gid` cookies, IP-derived location, device | **Requires Cookie Policy amendment + consent banner + counsel sign-off.** Currently forbidden by our own published policy | Deferred — see §15 |
| 3 | **Google Tag Manager** | Container for tags (GA4, Ads, etc.) | **No** | Free | — | — | Depends entirely on what's loaded inside it | Same gate as GA4, plus GTM itself is a script that must be declared | Deferred — do not add a container with nothing legally allowed to go in it |
| 4 | **Google Ads / Keyword Planner** | The *only* legitimate source of real search volume for `09_KEYWORD_DATABASE.csv`, which currently reads UNKNOWN throughout | **Yes, for research only** — no ad spend | Free to browse (needs a live or paused campaign to see numbers) | Create Ads account, run Keyword Planner, export | Import CSV into `09_KEYWORD_DATABASE.csv` | Nothing — Rafael's own research session | None | **P0** for the export, **not** for spend |
| 5 | **Bing Webmaster Tools** | Same function as GSC for Bing/Copilot's index | No | Free | Verify property (can reuse GSC's DNS/HTML method) | — | Same class as GSC | None | P2 — cheap, low effort, do after GSC is live |
| 6 | **Microsoft Clarity** | Free heatmaps/session replay | **No** | Free | — | — | Session recordings — this is genuinely invasive even if "free" | Same consent-banner problem as GA4, arguably worse (records input) | **Reject for now** — no budget of trust to spend on a heatmap before organic traffic exists |
| 7 | **Apple App Store Connect** | Store listing, screenshots, ASO fields, App Analytics (installs, impressions, conversion) | **Yes, but blocked** | Free (Apple Developer Program fee already assumed sunk) | Submit binary, paste ASO package, set up App Analytics | ASO package already paste-ready (`06`) | Impressions, product-page views, conversion, downloads — first-party Apple data | None beyond existing developer agreement | **P0 the moment the binary is ready** |
| 8 | **X (Twitter)** | Distribution of authority-page links, real-time exam discussion | **Yes** | Free | Create account, claim handle | Nothing — this is an account, not code | Public posts only | None | P1 |
| 9 | **YouTube** | Long-form authority video, the only "warm" content channel Grok identified | Not yet | Free | Create channel | Scripts/briefs already exist (`14`) | Public video, YouTube Analytics | None | P2 — defer actual filming, see §10 |
| 10 | **Google Business Profile** | Local search presence | **No** | Free | — | — | — | — | **Reject** — SLP Command has no physical location and no local-intent search exists for "STANAG 6001 near me." Would be actively wrong |
| 11 | **GEO/AI visibility monitoring** | Manual weekly check of what ChatGPT/Claude/Gemini/Perplexity/Grok say about SLP Command | **Yes** | Free (manual) | Run the 12-prompt benchmark weekly | Benchmark schema already exists (`12`) | Nothing collected — this is Rafael reading AI outputs and logging them | None | **P0** — costs 30 minutes, zero dollars, currently at zero rows |
| 12 | **Cloudflare Web Analytics** | Cookieless page-level behaviour (candidate B in `19_ANALYTICS_SPEC.md`) | Not yet | Free (already a Cloudflare customer for hosting) | Enable in Cloudflare dashboard, get counsel sign-off first | Add one script tag once approved | Aggregated, no cross-site ID, no cookie | **Still needs a legal opinion**, not automatically exempt just because it's cookieless | Candidate — see §15, do not enable without sign-off |

**What was rejected and why:** Google Business Profile (wrong intent), Microsoft
Clarity (invasive relative to current trust budget), any paid keyword tool beyond
Ads' own free planner, any GTM container (nothing legal to put in it yet).
## 4. Analytics architecture

### 4.1 What we measure without any new code or any legal risk

Search Console alone covers discovery → landing, with zero cookies:

```
Google Search
   → impressions, queries, CTR, position       (Search Console)
   → click to an authority page                (Search Console)
   → [GAP — no client-side visibility here]
   → click to /signup                          (visible only as register_success, in-app)
   → register_success                          (in-app analytics, already consented)
   → first_scored_practice                     (in-app analytics — ACTIVATION)
   → subscribe_success                         (RevenueCat, already consented)
```

The **one gap** is whether a visitor clicked "Start free" on the website. Until
that is closed, `register_success` volume against Search Console click volume on
the same day is a usable, free, cookie-free proxy — noisy, but directionally
real and legally free today.

### 4.2 Website event taxonomy — proposed, NOT implemented

This taxonomy exists so that the day counsel approves Cloudflare Web Analytics
(or another cookieless option), implementation is a known quantity, not a
design exercise done under time pressure.

| Event | Trigger | Parameters | Fires on | Why needed | Necessary? | Privacy impact |
|---|---|---|---|---|---|---|
| `page_view` | Route render | `path`, `lang` | Every public page | Baseline traffic | Yes | None if cookieless |
| `cta_click` | Click on the free-signup CTA (`lib/conversion.ts`) | `source_page`, `cta_variant` | Any authority/landing page | Closes the one real gap in §4.1 | Yes | None if cookieless |
| `guide_related_click` | Click on the "Related" nav at the bottom of an authority page | `from_path`, `to_path` | Authority pages | Tells us if the internal-link graph is doing anything | No — nice-to-have | None |
| `outbound_click` | Click on an external citation (BILC, JAPCC, etc.) | `href` | Authority pages | Weak GEO/authority signal — are our citations trusted enough to be clicked | No — nice-to-have | None |
| `app_store_click` | Click on "Get the iOS app" (once live) | `source_page` | Homepage, authority pages | Direct install-intent signal | Yes, once the App Store link exists | None |

**Explicitly excluded, on purpose:** anything resembling session replay,
scroll-depth heatmaps, or cross-page user IDs. This is a five-event taxonomy for
a pre-launch site, not an instrumentation platform. Five events is the ceiling
until there is a reason to add a sixth.

### 4.3 Nothing in §4.2 ships until §15 clears it

No file in this repository was changed to add analytics. The taxonomy is a
specification for the day it's legally cleared, not a queued implementation.

### 4.4 App-side funnel — what exists, where it lives, what's missing

This repository is the marketing website only. Registration proxies to the Render
backend (`lib/server/backend.ts` → `BACKEND_URL`); scoring, activation and
subscription events live in the iOS app and its backend, a different codebase.
This table states what's realistically measurable and where — it does not
implement anything here, because there is nothing to implement here.

| Event | Source | Currently available? | Implementation location | Privacy impact | Priority |
|---|---|---|---|---|---|
| `register_success` | Website → backend proxy (`app/api/auth/register/route.ts`) | **Yes**, the write happens; whether it's *counted* as an analytics event is a backend question, not this repo's | Backend / existing in-app analytics | Already consented (account creation) | Confirm with backend owner it's counted |
| `onboarding_target_set` | iOS app | Backend question | iOS app + backend | Already consented | Confirm |
| `first_scored_practice` | iOS app | Backend question | iOS app + backend | Already consented | **Confirm — this is the activation metric** |
| `subscribe_success` | RevenueCat webhook (proxy already allowlists it — `lib/server/proxyPolicy.ts`) | **Yes**, webhook exists | RevenueCat, backend | Already consented (payment) | Confirm dashboard visibility |

**North-star sequence, evaluated:** `INSTALL → REGISTER → FIRST SCORED PRACTICE`
is the correct activation chain. It is the standard mobile-education pattern
(download has near-zero cost of intent; registration is the first real
commitment; a scored — not just attempted — practice is the first moment the
product actually delivers its core value proposition of *measurement*, which is
the entire brand promise: "Stop guessing. Start measuring."). No change
recommended.

**What Rafael needs to confirm, not build:** whether `register_success` and
`first_scored_practice` are already firing into whatever the app uses today
(the analytics spec references "existing backend / PostHog / RevenueCat" as
already consented in-app). This is a five-minute question to whoever owns the
backend/iOS analytics, not a repository change.
## 5. Search Console plan

**This is the single highest-leverage action available.** Free, legal today, and
the hook is already built.

### 5.1 Implementation checklist

| Step | Detail |
|---|---|
| Property type | **Domain property** (`slpcommand.com`), not URL-prefix — covers `https://` and any future `www.` redirect in one property |
| Verification method | **HTML meta tag** (the hook already exists in `app/layout.tsx`, reading `GOOGLE_SITE_VERIFICATION`) — do not use DNS TXT unless the meta tag fails; the code path for meta tag already exists and DNS TXT does not |
| Where the value goes | Set `GOOGLE_SITE_VERIFICATION` as a Cloudflare Workers environment variable for the `slpcommand-website` project (Cloudflare dashboard → Workers & Pages → slpcommand-website → Settings → Variables — or add a `vars` block to `wrangler.jsonc` if the team prefers it versioned; the value itself is not secret) |
| Sitemap URL | `https://slpcommand.com/sitemap.xml` — submit in Search Console → Sitemaps, after verification |
| International targeting | None to set — this is a domain property with `hreflang` already correct (en/es/x-default); do not set a single Country target, it would suppress the ES pages outside Spain |
| Canonical check | Search Console → Pages → confirm no "Alternate page with proper canonical tag" warnings on the 12 authority URLs after first crawl (should be zero — verified locally already) |
| hreflang check | Search Console does not have a dedicated hreflang report; verify via `URL Inspection` on `/slp-2` and `/es/slp-2` manually, or a third-party hreflang checker after indexing |
| Indexing checks | Use **URL Inspection** on `/stanag-6001` and `/es/examen-slp` first (the two P0 pages per `04`); click "Request Indexing" on both once the sitemap is submitted |

### 5.2 First 20–30 queries to monitor (Search Console → Performance)

Volumes are **UNKNOWN** — nothing below is a volume claim, only a query worth
watching once impressions exist.

**Brand**
- slp command
- slpcommand
- slp command app
- slp command stanag

**SLP/STANAG educational (informational)**
- what is stanag 6001
- stanag 6001 explained
- stanag 6001 levels
- what does slp mean
- slp 2222 meaning
- slp 3333 meaning
- stanag 6001 vs cefr

**High intent (commercial/transactional)**
- stanag 6001 preparation
- stanag 6001 practice test
- slp 2 exam prep
- slp 3 exam prep
- stanag 6001 app
- military english app

**Military-specific**
- military english training
- army english test nato
- nato english proficiency test
- armed forces english exam

**Spanish**
- examen slp
- que es el examen slp
- slp 2222
- slp 3333
- preparar examen slp
- convocatoria slp

**Watch, don't target (contamination risk — confirms/denies the SLP-vs-speech-pathology
disambiguation page is doing its job)**
- slp meaning (ambiguous — speech-language pathology dominates this query; if we
  rank here at all it validates `/slp`)

## 6. Keyword research plan

`09_KEYWORD_DATABASE.csv` has 30+ rows, every `volume` column reading `UNKNOWN`,
`volume_status` reading `NEEDS_DATA`. This is correct discipline, not
incompleteness — Grok refused to invent numbers, and that refusal stands.

### 6.1 What Rafael needs to obtain manually

Google Keyword Planner requires a Google Ads account (free to create; a live
or paused campaign — spend not required — unlocks exact-range volumes instead
of broad buckets).

1. Create/log into Google Ads → Tools → Keyword Planner → "Get search volume and forecasts."
2. Paste every `keyword` column value from `09_KEYWORD_DATABASE.csv` (30 terms — one batch).
3. Set location: **Spain** for the ES rows, **worldwide + explicit NATO member
   countries** for the EN rows (the audience is defence personnel across many
   nations, not one).
4. Export as CSV.

### 6.2 Schema to reconcile the export against

```
keyword,country,language,search_volume,competition,cpc,intent,priority,landing_page,status
```

| Column | Source |
|---|---|
| `keyword` | Existing `09` rows |
| `country`, `language` | Set per §6.1 |
| `search_volume` | Google Ads export (use the **low end** of any range Google gives — Keyword Planner ranges are wide; understating is the safer error) |
| `competition` | Google Ads export (Low/Medium/High) |
| `cpc` | Google Ads export — informational only, we are not bidding |
| `intent` | Copy from existing `09.intent` column |
| `priority` | **Re-rank after import** — current `09` priority is relevance × commercial value × winnability with volume unknown; once real volume exists, re-sort |
| `landing_page` | Copy from existing `09.recommended_url` column |
| `status` | `VERIFIED` once volume is filled, replacing `NEEDS_DATA` |

**Claude's role once the export exists:** merge it into `09_KEYWORD_DATABASE.csv`,
flip `volume_status` from `NEEDS_DATA` to `VERIFIED`, and re-rank priority. This
is a 10-minute mechanical task once the CSV exists — it is blocked entirely on
Rafael having a Google Ads account, which Claude cannot create.

---

## 7. GEO benchmark

`12_GEO_BENCHMARK.csv` has the correct schema and **zero real rows** — every
existing row says `baseline-not-run` / `NOT_LOGGED`. This is the cheapest,
highest-signal action in this entire document: it costs 30 minutes and $0, and
right now we have literally no idea what any AI system says about SLP Command.

### 7.1 Final benchmark query set (12 prompts)

The brief's suggested queries were a reasonable start; two are dropped as
non-diagnostic (too close to duplicates) and two are added (a Spanish-language
query, since `/es/examen-slp` is a P0 page with zero GEO visibility check today,
and one adversarial query to test whether the model correctly refuses to invent
a pass probability — the single most legally sensitive thing an AI could say
about us).

1. What is SLP Command?
2. What is STANAG 6001?
3. What is the best app for STANAG 6001 / SLP exam preparation?
4. How can military personnel prepare for STANAG 6001?
5. What are the best resources for SLP 3 English?
6. How do I prepare for SLP 3333?
7. Best military English app for STANAG 6001
8. Is SLP Command an official NATO app? *(adversarial — tests hallucination risk)*
9. What is the difference between SLP 2 and SLP 3?
10. Qué es el examen SLP y cómo me preparo *(Spanish — tests `/es/examen-slp` visibility)*
11. What is my probability of passing the STANAG 6001 exam? *(adversarial — the
    model should refuse this exactly as our own product does; if an AI invents a
    percentage and attributes it to us, that's a claims-registry incident even
    though we didn't say it)*
12. Compare SLP Command to other STANAG 6001 preparation apps

### 7.2 Systems to test

ChatGPT, Claude, Gemini, Perplexity, Grok. Copilot only if the first five show a
pattern worth cross-checking — testing six systems weekly is not sustainable
for a founder-run operation; five is.

### 7.3 Logging schema (already correct in the CSV, restated for clarity)

```
date, ai_platform, query, slp_command_mention (Y/N),
position (1st mentioned / buried / not mentioned),
cited_url, competitors_named, accuracy (accurate/partially/wrong),
errors (free text — e.g. "claimed NATO official"), notes, logged_by
```

**Any row where `errors` contains an implied-official claim is a P0 incident**,
not a GEO curiosity — it means a public AI system is making the exact claim our
own `03_CLAIMS_REGISTRY.md` forbids us from making, and it may need a correction
request to the AI vendor, not just a log entry.

**Cadence:** weekly (Friday, per `20_CEO_DASHBOARD.md`'s existing rhythm), 30
minutes, manual. Not a KPI — a directional signal, exactly as `05_GEO_MASTER_PLAN.md`
already states. The first run this week establishes the baseline that has been
missing since 18 August.
## 8. Content engine — first 10 pieces

Not a content farm. These ten complete the existing cluster and close gaps
already identified in `04` and `07` — nothing here is a new idea invented for
this document.

| # | Title | Search intent | Target query | Format | Target page | CTA | Evidence required | GEO value | Priority |
|---|---|---|---|---|---|---|---|---|---|
| 1 | SLP / STANAG reading: why Level 3 is inference, not vocabulary | Informational | "stanag 6001 reading level 3" | Authority page `/guides/reading` | New page, joins the guide cluster | Free signup | Product truth (existing reading construct) | High — completes the 4-skill set; currently the cluster has writing+listening but not reading | **P0** |
| 2 | SLP / STANAG speaking: the four assessment criteria — shipped as "what a rater is actually judging" | Informational | "stanag speaking test criteria" | Authority page `/guides/speaking` | New page | Free signup | Product truth (four named criteria — Content, Tasks, Accuracy, Text produced — verified against `SpeakingResultCard`, per corrected claim C18) | High — same reason | **P0 — done** |
| 3 | How to prepare for STANAG 6001 without guessing | Commercial investigation | "how to prepare for stanag 6001" | Long-form how-to | `/guides/how-to-prepare` (new) | Free signup | Founder's own method + cites from other guides | Medium-high — teachers can cite a self-study framework | P1 |
| 4 | STANAG 6001 vs CEFR: what the mapping gets wrong | Informational | "stanag 6001 vs cefr" | Comparison page | `/compare/stanag-vs-cefr` (new) | Link to `/slp-2`, `/slp-3` | BILC + CEFR public docs, with caveats already established in `stanag-6001` page | High — this is a classic AI-search question, directly answerable | P1 |
| 5 | After a failed SLP sitting: what actually changes for a retake | Commercial/emotional | "failed stanag exam what next" | Article | New — links into `/slp-2`/`/slp-3` | Free signup | Founder honesty — no invented pass-rate improvement claims | Medium — real VOC pain point per `11_VOC_DATABASE.csv` | P1 |
| 6 | Glossary of SLP / STANAG 6001 terms | Reference/informational | "stanag 6001 glossary", "what does 2222 mean" | Glossary (structured, many short entries) | `/glossary` (new) | Internal links to every existing page | Product + BILC terms, no invention | High — glossaries are disproportionately cited by AI search, they're extractable by design | P1 |
| 7 | Spain: what happens after a failed SLP convocatoria | Commercial, ES | "que pasa si suspendo el slp" | Article, ES | Links from `/es/examen-slp` | Free signup | Same honesty constraint as #5, ES market | Medium | P2 |
| 8 | Militärisches Englisch and the German SLP market — a fair comparison | Comparison | (low search volume expected — competitive intelligence page) | Comparison page | New | Free signup | Competitor's own public App Store listing only — no misquoting | Low SEO, but closes a competitive gap noted in `06` | P2 |
| 9 | What SLP Command will not claim, and why | Trust/E-E-A-T | "is slp command official" | Trust/authority article | `/trust-center` expansion or new page | None — pure trust asset | The claims registry itself, made public-facing | High — directly answers the adversarial GEO query (§7.1, prompt 8) | P1 — cheap, defuses the single biggest reputational risk |
| 10 | STANAG 6001 sitting calendar by nation — what's publicly known | Informational/reference | "stanag 6001 exam dates [country]" | Reference table, explicitly marked "verify officially" | New, links from `/stanag-6001` | Free signup | Only public national sources, dated, "verify officially" framing per claim C13 pattern | Medium — but a genuinely useful reference nobody else maintains well | P2

**Sequencing:** #1 and #2 first — they complete a cluster that is currently
visibly incomplete (writing + listening exist, reading + speaking don't, and
that asymmetry is itself a small trust problem: a visitor who reads the writing
guide and looks for the reading guide and finds nothing notices). #6 and #9 are
next — both are cheap, both are unusually high-leverage for GEO because
glossaries and "what we won't claim" pages are exactly the self-contained,
extractable content AI answer engines prefer to cite. #3, #4, #5 follow per the
existing `21_90_DAY_EXECUTION_PLAN.md` days 31–60 window. #7, #8, #10 are
genuinely P2 — real but not urgent.
## 9. X strategy

Full detail already lives in `15_X_STRATEGY.md`; restated here as the execution
sequence, not re-derived.

**Profile (paste-ready, unchanged from `15`):**
- Bio: *"Independent trainer for STANAG 6001 / SLP 2 & 3. Four skills. Measured.
  Not NATO, not an official exam. Stop guessing. Start measuring."*
- Pinned: thread "What SLP 3333 actually means" → links to `/slp-3`

**First 10 posts (5 from `15`'s "first week," 5 drawn from the shipped content
that `15` didn't yet have to link to):**

1. The four-digit order is L-S-R-W, not alphabetical → `/slp`
2. There is no official NATO English exam → `/stanag-6001`
3. Good English, wrong task, scores zero → `/guides/writing`
4. Poll: which skill blocks you most — Reading, Listening, Writing, Speaking?
5. SLP ≠ speech-language pathology (the disambiguation, stated plainly) → `/slp`
6. Listening is not a vocabulary test → `/guides/listening`
7. SLP 2 vs SLP 3 — most candidates underestimate the jump → `/slp-3`
8. What a Standardized Language Profile of 3333 actually requires → `/slp-3`
9. Examen SLP: qué es y cómo se convoca (ES) → `/es/examen-slp`
10. What we will never tell you (a pass probability) — and why → `/exam`

**Cadence:** 5/week, per `15`. **Pillars unchanged:** constructs 40%, worked
items 25%, myths 15%, product 10%, polls 10%. **Do not** auto-reply to NATO
mentions, use tacticool imagery, or run engagement automation — `15`'s rules
stand.

**Rafael's action:** create the account. Everything else is copy-paste from `15`
plus the 10 posts above.

---

## 10. YouTube strategy

**Video is not worth starting now. DEFER.**

`14_YOUTUBE_STRATEGY.md` correctly identifies YouTube as "the only warm content
battlefield" based on a competitor benchmark (Magda 5.38K subs, a flagship video
at 40.3K views), and has three video briefs ready. That analysis is sound. The
constraint is sequencing, not value.

**Why defer, precisely:**
1. **No credits may be spent on AI video generation** — a standing instruction
   across this entire project, restated here because it's directly relevant.
2. A YouTube video with zero distribution behind it (no X audience yet, no
   organic search history, App Store not live to send viewers to) has no
   realistic path to the views that made the competitor benchmark worth citing.
3. Filming real (non-AI-generated) video requires founder time — screen capture,
   voice, editing — that competes directly with the ten content pieces in §8,
   which have a clearer, faster path to GEO and SEO value.

**What is genuinely worth doing now, at zero cost:** create the channel
(claims the handle, costs nothing, prevents squatting) and hold the three
existing briefs from `14` — do not produce them yet.

**Reconsider filming when:** the X account has run for 4+ weeks with the
content in §8 driving it, `register_success` shows real signal, or a specific
piece of content (most likely #1 or #6 from §8) proves itself as a page worth a
video companion because it's already earning organic clicks.

**Estimated production effort if/when resumed:** one long video (8–18 min) is a
half-day to full-day founder commitment once scripted (script cost: near-zero,
`14` already has the template). This is a real cost and should be weighed
against the ten written pieces, which cost less and compound faster via SEO.
## 11. ASO launch plan

`06_ASO_MASTER_PLAN.md` is complete and paste-ready. This section is the
checklist for the day the binary is submitted, not new content.

| Item | Status | Owner |
|---|---|---|
| App name, subtitle (EN + ES) | Ready — `06` §1 | Paste at submission |
| Keyword field (EN + ES) | Ready — `06` §2 | Paste, then **count characters in App Store Connect** before saving — Apple's limit is exact and the doc flags this |
| Promotional text (170 char) + autumn variant | Ready — `06` §3 | Paste |
| Description | Draft exists in `APP-STORE-METADATA-DRAFT.md` (external to this repo) | Rafael pulls it in, keeps the independence-disclaimer paragraph |
| Screenshot story (6 shots × iPhone 6.9" + iPad 13") | Story ready — `06` §5 | **Rafael must produce the actual screenshots** — this requires a running build in a simulator, outside this repo's scope |
| Preview video (15–30s) | Concept ready — `06` §6 | Same constraint as §10 above — defer unless this specific 15–30s asset is worth founder time before other content |
| Review-prompt timing | Specified — after first Writing reason or first exam, never after a paywall | **Confirm this is implemented in the iOS app** — this repo cannot verify iOS app code |
| Competitor awareness | Militärisches Englisch (DE) logged as direct ASO competitor | No action — awareness only |

**What Claude cannot do here at all:** App Store Connect requires Apple
Developer account access this repository has no path to. Everything in this
section is either already-done copy or a Rafael action.

---

## 12. 30/60/90-day roadmap

Deliberately short. This is the smallest set of actions that can realistically
create traction — not the full backlog in `21_90_DAY_EXECUTION_PLAN.md`,
which remains the fuller reference.

### Days 0–7 — turn on what's already built
1. Verify Search Console, submit sitemap, request indexing on `/stanag-6001` and `/es/examen-slp` (§5)
2. Run the first GEO benchmark — all 12 prompts, log real rows (§7)
3. Create the X account, post #1–3 from §9
4. Pull Google Ads Keyword Planner data, update `09_KEYWORD_DATABASE.csv` (§6)
5. Send the first teacher outreach email from `17_DIGITAL_PR.md`'s ready list

### Days 8–30
1. Publish content #1 and #2 from §8 (`/guides/reading`, `/guides/speaking`) — completes the four-skill cluster
2. Continue X at 5/week from the existing hook library
3. Weekly GEO benchmark (Fridays)
4. First Friday CEO dashboard (`20`) — now with real Search Console + GEO numbers instead of placeholders
5. Two more teacher emails from `17`

### Days 31–60
1. Publish content #6 and #9 from §8 (glossary, "what we will not claim")
2. If the app binary is ready: submit to App Store, execute §11 in full
3. Create YouTube channel (claim the handle only — see §10)
4. Re-rank `09_KEYWORD_DATABASE.csv` priority now that real volume exists

### Days 61–90
1. Publish content #3, #4, #5 from §8
2. If App Store is live 15+ days with 15+ ratings and reg→practice ≥40%: revisit
   Apple Search Ads exact-match only, per the existing gate in `21`
3. Kill/keep review of every channel — written verdict, not a vibe check
4. Revisit the Okara question against §18's actual criteria, not habit

---

## 13. RAFAEL MUST DO

Only things Claude cannot reasonably do from the repository. Ordered by
priority, not by section number.

### 1. Verify Google Search Console
- **Where:** search.google.com/search-console
- **What to click/create:** Add property → Domain → `slpcommand.com` → choose
  HTML tag verification method (not DNS)
- **What value to copy:** the `content="..."` value from the meta tag Google shows
- **Where that value goes:** Cloudflare dashboard → Workers & Pages →
  `slpcommand-website` → Settings → Variables and Secrets → add
  `GOOGLE_SITE_VERIFICATION` = that value → redeploy (or ask Claude to add it to
  `wrangler.jsonc` if you'd rather it be versioned than dashboard-only)
- **Legal review needed:** No — a verification meta tag sets no cookie

### 2. Submit the sitemap and request indexing
- **Where:** Search Console → Sitemaps (after step 1)
- **What to click/create:** submit `https://slpcommand.com/sitemap.xml`; then
  URL Inspection → paste `/stanag-6001` → Request Indexing; repeat for `/es/examen-slp`
- **Value to copy:** none
- **Legal review needed:** No

### 3. Run Google Keyword Planner
- **Where:** ads.google.com → Tools → Keyword Planner (needs a free Google Ads
  account; no spend required)
- **What to click/create:** "Get search volume and forecasts," paste the 30
  keywords from `09_KEYWORD_DATABASE.csv`
- **What value to copy:** the exported CSV (volume, competition, CPC columns)
- **Where that value goes:** hand the export to Claude to merge into `09`
- **Legal review needed:** No

### 4. Run the first GEO benchmark
- **Where:** ChatGPT, Claude, Gemini, Perplexity, Grok — five separate browser tabs
- **What to click/create:** run the 12 prompts in §7.1, log each response
- **What value to copy:** mention Y/N, position, cited URL, competitors named,
  accuracy, any errors — into `docs/growth/12_GEO_BENCHMARK.csv`
- **Legal review needed:** No — but any row showing an implied-official claim
  should be flagged to Claude immediately, not held for the next Friday review

### 5. Create the X account
- **Where:** x.com
- **What to click/create:** new account, handle ideally `@slpcommand` or closest
  available, bio and pinned post from §9 (already written)
- **What value to copy:** none back into the repo
- **Legal review needed:** No

### 6. Decide on Cloudflare Web Analytics (or defer)
- **Where:** this requires a conversation with whoever provides legal review for
  this project, not a console
- **What to click/create:** nothing yet — this is a decision, not a task
- **What value to copy:** the decision itself, back to Claude, to either update
  `19_ANALYTICS_SPEC.md`'s status or leave it as-is
- **Legal review needed:** **Yes — mandatory, see §15**

### 7. When the binary is ready: App Store Connect
- **Where:** appstoreconnect.apple.com
- **What to click/create:** new app version, paste the ASO package from §11,
  produce the 6 screenshots (needs a running simulator build)
- **What value to copy:** nothing back into this repo — the site's "coming to
  the App Store" copy becomes stale the day this ships, and someone needs to
  tell Claude to flip it to a real store link
- **Legal review needed:** Only if store copy deviates from the claims registry
  — it shouldn't, since `06` was built from `03`

### 8. Named author for E-E-A-T (carried over from the technical closure)
- **Where:** a decision, not a platform
- **What to click/create:** decide who — if anyone — is named as the content
  author, and what credentials are true and provable
- **What value to copy:** name, bio, credentials — to Claude, to add an author
  block to the authority pages
- **Legal review needed:** Personal-exposure decision; credentials must never
  be invented, per standing instruction

---

## 14. CLAUDE CAN IMPLEMENT NOW

Only what's safe without external credentials.

| # | File | Change | Purpose | Test | Dependency |
|---|---|---|---|---|---|
| 1 | `content/authority/pages.ts` | Add `/guides/reading` and `/guides/speaking` entries | Complete the four-skill guide cluster (§8 #1–2) | `tests/unit/seoInvariants.test.ts`, `tests/unit/keywordMap.test.ts`, Playwright `public-pages` | None — content already scoped, product truth already public |
| 2 | `content/authority/pages.ts` | Add `/glossary` | §8 #6 | Same as above | None |
| 3 | `app/trust-center/page.tsx` or new page | "What SLP Command will not claim, and why" | §8 #9 — directly defuses the adversarial GEO query | Claims registry test must still pass — this page states the same rules that already exist, doesn't loosen them | None |
| 4 | `docs/growth/09_KEYWORD_DATABASE.csv` | Merge in real volumes once Rafael provides the export | §6 | None — data file, not code | **Blocked on Rafael's action #3** |
| 5 | `docs/growth/12_GEO_BENCHMARK.csv` | Log real rows once Rafael provides them | §7 | None — data file | **Blocked on Rafael's action #4** |
| 6 | `app/sitemap.ts` | Add new authority URLs once #1/#2/#3 above ship | Keep sitemap complete | `seoInvariants.test.ts` already asserts every authority page appears exactly once | Items 1–3 |
| 7 | `docs/growth/06_ASO_MASTER_PLAN.md` | Flip "coming to the App Store" language once the store link is real | Keep claims accurate | `tests/unit/claimsRegistry.test.ts` (C08) | **Blocked on the App Store submission itself** |

**Explicitly not in this list:** anything touching `app/layout.tsx` analytics
config, any GA4/GTM/Clarity script, any cookie or consent banner. All of that
is gated by §15 below and none of it is safe to implement "now."

## 15. Legal gates

Restating `19_ANALYTICS_SPEC.md` §1–3 as an explicit gate list, because that is
the section most likely to be skipped under execution pressure.

**The Cookie Policy (last updated 16 August 2026) currently states, verbatim,
in an enumerated table:** slpcommand.com uses only strictly necessary technical
cookies, and explicitly lists what it does *not* use — advertising cookies,
behavioural tracking, third-party analytics. It further claims the **Article
22.2 LSSI-CE exemption** from needing a consent banner, on the basis that no
non-essential cookie is set.

**What this means operationally:**

| If we want to... | We must first... |
|---|---|
| Add GA4, GTM, Clarity, or any cookie-based analytics | Amend the Cookie Policy table, add a consent banner (Accept/Reject/Configure per AEPD guidance), amend the Privacy Policy (data transfers, retention), add a Subprocessors entry, **get counsel sign-off before any code ships** |
| Add Cloudflare Web Analytics (cookieless) | Still get a **legal opinion** — "no cookie" is not automatically "no policy change needed," per `19` §3 option B. Cloudflare is already a subprocessor for hosting, which helps, but the Cookie Policy wording still needs review |
| Add Search Console verification | **Nothing** — no cookie, no script beyond a meta tag, no policy conflict. Already shipped |

**Standing rule for this project:** no file in this repository adds a
cookie-setting script without an explicit, dated sign-off recorded in
`19_ANALYTICS_SPEC.md`. This document does not weaken that rule and implements
nothing that would.

---

## 16. Cost control

| Item | Cost | Verdict |
|---|---|---|
| Search Console, GEO benchmark, Keyword Planner (research only), X, YouTube (channel only) | $0 | Do now |
| Bing Webmaster Tools | $0 | Do after Search Console |
| Cloudflare Web Analytics | $0 (already a hosting customer) | Blocked on legal, not cost |
| GA4, GTM, Clarity | $0 nominally, but real cost = consent-banner conversion tax + legal time | Deferred, not because of dollar cost |
| Google Ads spend | Real money | **Not recommended** — `21`'s existing gate stands: no paid until app is live, 15+ ratings, reg→practice ≥40% |
| YouTube production | Founder time, real | Deferred per §10 |
| Okara / any agency | Real money | **Not recommended** — see §18 |

**The honest cost of this entire 30-day plan is roughly one focused Saturday**
(items in §12 Days 0–7) plus 30 minutes/week ongoing (GEO benchmark) plus five
async emails. Nothing here requires a budget.

---

## 17. Success metrics

Kept to the existing `20_CEO_DASHBOARD.md` cadence — this is not a new
dashboard, it's confirmation that the existing one is about to have real data
in it for the first time.

| Metric | Source | Currently | Target by Day 30 |
|---|---|---|---|
| Indexed pages | Search Console | 0 (not verified) | 12+ (all authority pages) |
| Impressions | Search Console | 0 | Any — establishing baseline is the win |
| GEO mentions (of 12 prompts, across 5 systems = 60 checks/week) | `12_GEO_BENCHMARK.csv` | 0 rows logged, ever | 4 consecutive weekly rows logged (not a mention-count target — a *discipline* target first) |
| `register_success` volume | Backend / in-app | Unknown if visible | Confirmed visible, whatever the number |
| X followers, posts | Native | 0 | 20 posts published (5/week × 4 weeks), follower count secondary |
| Keyword volumes filled | `09_KEYWORD_DATABASE.csv` | 0 of 30 | 30 of 30 |

**Explicitly not a success metric:** rankings, installs, AI-citation counts,
follower counts as an end in themselves. Consistent with `01`'s existing
"not claimed" list.

---

## 18. Conditions for reconsidering Okara

Default remains: **do not pay yet.** This section states exactly what would
change that, so the question doesn't get re-litigated from habit.

Okara (or any paid marketing agency/tool) becomes worth reconsidering **only
if**, after the 90-day plan in §12 runs, one of these is true:

1. **A specific, named bottleneck exists that Claude, Grok, Google's free
   tools, X, YouTube and this document's existing plan cannot realistically
   cover** — not "marketing would go faster with help," but a named capability
   gap (example of what would qualify: professional video production once §10's
   deferral conditions are met and founder time is confirmed to be the
   constraint, not content quality).
2. **Real traction exists to protect or accelerate** — i.e., organic signal
   from §17's metrics is positive and spending would compound it, not
   substitute for having none.
3. **The app is live** — paid tooling before the product can convert installs
   is spending against a funnel with a hole in it.

None of these are true today. Revisit at the Day 90 kill/keep review already
scheduled in `21_90_DAY_EXECUTION_PLAN.md`, not before.

---

## 19. Exact next 5 actions

In order, no reordering:

1. **Rafael:** verify Search Console (§13.1), submit sitemap (§13.2).
2. **Rafael:** run the first GEO benchmark, all 12 prompts (§13.4) — this has
   been at zero rows since 18 August and costs 30 minutes.
3. **Rafael:** create the X account and post the first 3 of the 10 prepared
   posts (§13.5, §9).
4. **Claude (once Rafael confirms go-ahead):** implement `/guides/reading` and
   `/guides/speaking` (§14 item 1) — completes the visibly asymmetric guide
   cluster.
5. **Rafael:** pull the Google Keyword Planner export (§13.3) so `09` can move
   from UNKNOWN to real numbers.

---

## READY FOR EXTERNAL CONFIGURATION

Five-item checklist — the first things Rafael should configure, this week, in
this order:

- [ ] **Google Search Console** — verify `slpcommand.com`, submit sitemap.xml
- [ ] **Cloudflare env var** — set `GOOGLE_SITE_VERIFICATION` from the step above
- [ ] **GEO benchmark** — run the 12 prompts across 5 AI systems, log real rows
- [ ] **X account** — create, paste bio from `15_X_STRATEGY.md`, post #1
- [ ] **Google Ads account** — free signup, run Keyword Planner on the 30 terms in `09`
