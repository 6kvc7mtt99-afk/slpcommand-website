# 24 — Chairman audit of the Grok phase-1 growth package

**Date:** 18 August 2026
**Scope:** everything under `docs/growth/01–22`, the twelve public authority
routes, and the technical SEO/GEO surface that supports them.
**Method:** dependencies installed, production build run, server started, and the
**rendered HTML measured**. Findings below are from `curl` output and test runs,
not from reading the source and assuming it works.

> **Material finding about the audit itself:** phase 1 had **never been built or
> run**. `node_modules` was absent, so `next build`, `vitest` and Playwright had
> never executed against it. `22_IMPLEMENTATION_LOG.md` recorded several items as
> DONE that were not observable in the output. The work was better than that log
> could prove, and in two places worse.

---

## 1. Verdict

**APPROVED WITH CORRECTIONS.** The strategy layer is strong and, unusually,
honest. The failure was not judgement — it was that nobody checked what the pages
actually emitted. One defect was commercially fatal and had gone unnoticed.

## 2. What Grok got right — kept unchanged

These were audited and deliberately **not** touched.

| # | Decision | Why it stands |
|---|---|---|
| 1 | **Caught the URL collision.** `/reading`, `/listening`, `/writing`, `/speaking` are learner-app routes and `Disallow`ed. Marketing was moved to `/guides/*`. | Non-obvious, correct, and would have been an expensive mistake. The single best call in the package. |
| 2 | Private routes emit `noindex, nofollow` **and** are robots-disallowed | Verified in rendered HTML. Correct belt-and-braces. |
| 3 | **Refused to invent keyword volumes.** Every row reads `UNKNOWN / NEEDS_DATA` | Rare discipline. Fabricated volumes would have mis-ranked the entire roadmap. |
| 4 | **Refused to add analytics** before the Cookie Policy matches | Legally correct. See `19` v2 — the policy enumerates cookies and claims a banner exemption. |
| 5 | Claims registry, and later its executable test | The negation-aware matcher is genuinely good: it blocks "is the official app" while allowing "there is no official NATO exam". |
| 6 | Okara = LATER; paid = BLOCKED; Reddit = listen-first | All correct under the current evidence. |
| 7 | Content voice on `/stanag-6001` and `/guides/writing` | Reads as written by someone who knows the exam. Not AI filler. |
| 8 | Did not claim the app is live | Consistent with C08 everywhere. |

## 3. What the audit found — and what was done

| ID | Finding | Severity | Status |
|---|---|---|---|
| F1 | **Zero conversion path.** All 12 authority CTAs pointed at `/#pricing`, `/#features` or another article. The homepage's only transactional button, "Get Professional in the app", pointed at **`/support`** — for a purchase that cannot complete while the iOS app is unreleased. A working free `/signup` existed, linked from nowhere. | **P0 — commercially fatal** | **Fixed.** `lib/conversion.ts`; every page leads with Start free and keeps its contextual link as secondary. |
| F2 | `og:image` absent on all 12 pages — a child `openGraph` block silently drops the root default. Existing card was **294×640**, below X's 300px minimum. | P0 | **Fixed by Grok** during the review, independently. Verified: 1200×630 on every page. |
| F3 | Homepage had no canonical | P0 | **Fixed by Grok** during the review. |
| F4 | Claims registry was a document, not a guard | P0 | **Fixed by Grok** during the review (`claimsRegistry.test.ts`). |
| F5 | `SoftwareApplication` declared `operatingSystem: "iOS"` with a bare €9.99 Offer while the App Store listing does not exist and Professional is an Apple IAP | P1 | **Fixed.** Marks up the web client: Free `InStock`, Professional `PreOrder`. |
| F6 | `"sameAs":[]` emitted into every page | P1 | **Fixed.** Omitted until real profiles exist. |
| F7 | `/guides` is an index but emitted `Article` | P1 | **Fixed.** `CollectionPage` + `hasPart`. |
| F8 | **11 of 12 pages cited nothing externally** | P1 | **Fixed.** BILC + JAPCC, both fetched and quoted; emitted as schema `citation`. |
| F9 | `/es/slp-2` and `/es/slp-3` ≈70 words of body — stubs, on the priority market | P1 | **Fixed.** 584 and 542 words, written for the Spanish query. |
| F10 | No custom 404; `/es` returned 404 | P1 | **Fixed.** Branded 404; `/es` → `/es/examen-slp`. |
| F11 | `/about` rendered "About SLP Command — SLP Command"; two titles truncated away the page's point (75, 70 chars) | P1 | **Fixed.** |
| F12 | Sitemap stamped `lastModified: new Date()` on every deploy | P1 | **Fixed by Grok** during the review — now reads each legal document's own declared date. |
| F13 | No Search Console verification path | P1 | **Fixed.** Inert env-driven meta tag; sets no cookie. |
| F14 | Authority pages had no a11y or conversion e2e coverage | P2 | **Fixed.** Extended `a11y.spec.ts`. |
| F15 | Keyword database pointed at URLs with nothing enforcing they exist | P2 | **Fixed.** `keywordMap.test.ts` + doc `23`. |

### Not changed, deliberately

| Item | Why left alone |
|---|---|
| The 5-step `/signup` form | Product surface, not marketing. It is a likely activation drag and should be measured before it is cut — but that is the founder's call, and `21` already schedules it (CRO E01). |
| `components/app/SupportAssistant.tsx`, `lib/api/support.ts` | **Product, not marketing**, and shipped in the same uncommitted change set. It sends user messages to a backend AI. **Needs privacy / AI-policy / subprocessor review** before release. Flagged, untouched. |
| Footer's 24 flat links | Cosmetically weak, but changing it touches every legal page's link equity. Low value, non-trivial risk. Deferred. |
| Growth docs `01, 02, 03, 05, 07, 08, 10–18, 20, 21` | Audited and sound. Rewriting them to show activity would have destroyed working material. |
| `robots.ts`, private-route `noindex` | Already correct. |

---

## 4. Scores

Scored on the **final** state, and against the stated ambition — *the international
reference for SLP/STANAG 6001 preparation* — not against "a decent startup site".

| Area | Score | Justification |
|---|---|---|
| **Positioning** | **9/10** | Sharp, defensible, honestly differentiated. "Independent, measured, will not fake a pass probability" is a real position, not a slogan. Loses a point only because it is unproven with users. |
| **Brand** | **7/10** | Voice is excellent and consistent; the paper/graphite system is coherent and adult. But the brand's only real asset is five OG cards — no logo file, no photography, and a 24-link flat footer that reads as boilerplate. |
| **SEO (content & architecture)** | **8/10** | IA is right, the collision was avoided, one primary keyword per URL is now enforced, cannibalisation is analysed. Held back by cluster incompleteness: no `/guides/reading`, no `/guides/speaking`, no how-to-prepare. |
| **Technical SEO** | **9/10** | Canonicals, reciprocal hreflang + `x-default`, correct OG/Twitter, accurate schema, honest `lastmod`, correct robots + `noindex`, branded 404, redirects — and **executable invariants** so it cannot silently regress. Not 10 only because Core Web Vitals are unmeasured on real hardware. |
| **GEO / AI search** | **7/10** | Everything controllable is done: `llms.txt`, consistent entity, extractable tables, accurate schema, and now real citations. Everything uncontrollable — third-party corroboration — is absent, and the benchmark has never been run. |
| **ASO** | **6/10** | The package is disciplined and paste-ready, and correctly refuses to pretend the app is live. But it is **entirely unexecuted**: no screenshots produced, no listing, no validation. It is a good plan, not an asset. |
| **Content** | **7/10** | `/stanag-6001` and `/guides/writing` are genuinely citable. Spanish is now real. But twelve pages is not a reference destination, and the content engine has produced nothing beyond them. |
| **Authority** | **4/10** | Two verified citations *outbound*. Zero inbound. No PR executed, no teacher relationships, no Wikidata (correctly — the sources do not exist yet). This is the weakest area and the one that most determines the 12-month outcome. |
| **CRO** | **6/10** | Was ~1: the funnel dead-ended at a support page. There is now a real path from twelve pages to a free account. Not higher because the 5-step signup is untested and step-3 click-through is unmeasured. |
| **Analytics** | **4/10** | Search Console verification is now possible in one env var, and the spec is precise about the legal trade-offs. But **nothing is measured today** — no property verified, no sitemap submitted, no behavioural data. |
| **Digital PR** | **3/10** | Sound targets, honest pitch, correct refusal to buy links. Zero outreach sent. |
| **Social** | **3/10** | Strategy is right (teach, don't spam). No profile exists on any platform. |
| **International** | **7/10** | ES is properly served, not machine-translated, and the localisation gate is explicit and evidence-based. Correct restraint on IT/DE/PL/FR. |
| **Legal / claim safety** | **8/10** | Best-in-class for a company this size: enumerated cookie table with a defensible LSSI-CE exemption, disclaimers on every page, and a claims registry that is now **executable**. Held at 8 by the unreviewed in-app AI support feature. |
| **Performance** | **7/10** | Authority pages are static, ~106 kB first-load JS, no images, no third-party scripts. Sound by construction — but never profiled against real Core Web Vitals. |
| **OVERALL** | **6.5/10** | **Foundations are 8–9. Distribution and proof are 3–4.** The asset is real and now technically sound; almost nothing has met an actual user. |

The honest summary: **this is a well-built shop on a street with no footfall.**
The next 90 days are not a building problem.

---

## 5. The most important question

> *If SLP Command executes this system for 12 months with excellent product
> quality, what are the biggest realistic levers?*

### Controllable

1. **Product truth becoming reputation.** Task-and-language separation, five named
   speaking dimensions, and the refusal to invent a pass probability are checkable
   claims. Candidates who pass will say *why* it helped. This is the strongest lever.
2. **Owning the definitional queries.** "What is STANAG 6001", "what does 3333
   mean", "why did my writing fail". Low competition, high intent, and they feed
   AI answers, which is how the next cohort will ask.
3. **Spain, properly.** ES is under-served and the terms are commercial. One market
   done excellently beats seven done adequately.
4. **Teachers.** Fifteen independent SLP teachers who trust the writing guide are
   worth more than any ad budget and produce the citations GEO needs.
5. **Shipping the four-skill cluster and the App Store listing.** Both are just work.

### Partially controllable

6. **AI citation.** We can be accurate, consistent and citable. We cannot make a
   model recommend us. Track description *accuracy* first; mentions are a bonus.
7. **App Store ranking.** We control metadata, screenshots and rating prompts —
   not Apple's algorithm or category competition.
8. **Press and community.** We control pitch quality and usefulness, not uptake.

### Not controllable

9. National exam policy, convocatoria timing, and whether a MoD blesses any tool.
10. Competitor behaviour — including a well-funded entrant.
11. Whether Google keeps sending clicks at all as AI answers absorb definitional queries.

**No ranking is promised anywhere in this package, and none should be.**

---

## 6. Human approvals required

| # | Item | Why it cannot be done here |
|---|---|---|
| 1 | **Verify the production web signup end-to-end** | Twelve pages now point at `/signup`. It is wired to the live backend, but registering a real account is an outward-facing side effect. **Do this before deploy.** |
| 2 | In-app AI Support Assistant | New AI processing of user messages. Privacy Policy, Responsible AI Policy and Subprocessors review. |
| 3 | Any behavioural analytics (options B/C/D in `19`) | Amends three published policies; may require a consent mechanism. |
| 4 | App Store submission and all ASO copy | Apple account, and public claims. |
| 5 | Teacher/PR outreach emails | External communication in the company's name. |
| 6 | Production deployment | Founder-controlled. |
| 7 | Changes to claims C06, C07, C08, C13 | Per `03`. Pricing, quotas, platform, Spanish administration. |
