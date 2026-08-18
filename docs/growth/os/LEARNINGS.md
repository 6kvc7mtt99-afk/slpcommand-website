# Learnings

Durable findings only. Not a diary. If it would change a future decision, it
belongs here; if it would not, it does not.

Confidence: **HIGH** (measured) · **MEDIUM** (observed, small n) · **LOW** (reasoned)

---

## L001 — Metadata that overrides a parent silently drops the parent's images

**Date:** 2026-08-18 · **Confidence:** HIGH · **Area:** Technical SEO / distribution

**What we learned.** In Next.js, a page that exports its own `openGraph` block
does not inherit `openGraph.images` from the root layout. Every authority page
defined its own block, so all twelve shipped with no `og:image` at all, while
still declaring `twitter:card: summary_large_image`.

**Evidence.** `curl` against the production build: `og:image` occurrences — home 4,
`/slp-2` 0, `/es/slp-2` 0, `/guides/writing` 0, `/stanag-6001` 0, `/about` 0.

**Why it mattered.** The entire distribution plan — X, teacher outreach, Digital PR —
is links to those twelve pages. Each would have rendered as a bare text link.

**What changed.** `authorityOgImage()` in `lib/authority.ts` assigns a card per page
family; `tests/unit/seoInvariants.test.ts` fails the build if any page loses one.

**Applies to.** Any future page that sets its own metadata block.

---

## L002 — The site-wide social image was a portrait phone screenshot

**Date:** 2026-08-18 · **Confidence:** HIGH · **Area:** Brand / distribution

**What we learned.** `og:image` pointed at `01_home.png`, which is **294 × 640**.
X requires ≥ 300px wide for `summary_large_image`; the recommended card is
1200 × 630. The homepage card was below the minimum in both dimensions.

**Evidence.** `sips -g pixelWidth -g pixelHeight` → 294 × 640.

**What changed.** Five 1200 × 630 cards generated from `assets/og/_template.svg`
via `scripts/build-og.sh`, including a Spanish card for `/es/*`.

**Applies to.** Any new share surface. Regenerate, never hand-crop a screenshot.

---

## L003 — A claims registry that is only a document is not a control

**Date:** 2026-08-18 · **Confidence:** HIGH · **Area:** Legal / brand safety

**What we learned.** `03_CLAIMS_REGISTRY.md` forbids roughly twenty phrasings, but
the only automated check was one regex for `official NATO (app|exam|assessment)` —
which the live copy passed by luck, since the pages say "official NATO English exam"
inside a negation.

**Evidence.** Injecting "the official NATO app used by NATO and the best SLP trainer
with a guaranteed pass" into `/about` was caught by the new guard on four separate
rules; the previous test did not catch it.

**Why it mattered.** The single largest reputational risk this company carries is an
implied NATO endorsement. That risk was governed by a markdown table.

**What changed.** `tests/unit/claimsRegistry.test.ts` scans every authority page,
the landing page, all fourteen legal documents and `llms.txt` against the registry
in English and Spanish. It is negation-aware, so honest denials keep passing.

**Applies to.** Every copy change from now on, including ones made in a hurry.

---

## L004 — A lastmod that moves on every deploy is worse than none

**Date:** 2026-08-18 · **Confidence:** MEDIUM · **Area:** Technical SEO

**What we learned.** The sitemap stamped `new Date()` on all fifteen legal URLs, so
every deploy told Google that every policy had just changed. Google discounts a
`<lastmod>` it can see is untrue — which then devalues it on the authority pages
where it is true.

**What changed.** `publicPageUpdated()` parses each document's own
"Last updated:" line. Verified: `/privacy` → 2026-07-31, `/cookies` → 2026-08-16.

**Applies to.** Any future sitemap entry. Derive the date; never generate it.
