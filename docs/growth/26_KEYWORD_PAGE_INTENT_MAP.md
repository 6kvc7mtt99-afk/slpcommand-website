# 26 — Keyword → Page → Intent map

**Added:** 18 August 2026 (Chairman review). **Source:** `09_KEYWORD_DATABASE.csv`.
**Enforced by:** `tests/unit/keywordMap.test.ts` — every URL below must exist as a
real route, and no two pages may hold the same primary keyword.

Volumes are **UNKNOWN** throughout and are deliberately not estimated. Priority
below is relevance × commercial value × winnability, not traffic. Fill volumes
from Google Ads Keyword Planner (action 6 in `01`), then re-rank.

---

## 1. One primary keyword per URL

Each page owns exactly one primary term. Secondary terms may repeat across pages;
primaries may not. This is what stops the cluster competing with itself.

| URL | Primary keyword | Intent | Funnel | Language |
|---|---|---|---|---|
| `/stanag-6001` | STANAG 6001 | Informational | Awareness | EN |
| `/slp` | SLP STANAG | Informational (disambiguation) | Awareness | EN |
| `/slp-2` | SLP 2 | Informational → commercial | Interest | EN |
| `/slp-3` | SLP 3 | Informational → commercial | Interest | EN |
| `/guides` | STANAG 6001 preparation | Commercial investigation | Awareness | EN |
| `/guides/writing` | STANAG 6001 writing level 3 | Informational | Consideration | EN |
| `/guides/listening` | STANAG 6001 listening | Informational | Consideration | EN |
| `/exam` | STANAG mock exam | Commercial | Consideration | EN |
| `/about` | SLP Command | Navigational / branded | Awareness | EN |
| `/es/examen-slp` | examen SLP | Commercial | Interest | ES |
| `/es/slp-2` | SLP 2222 | Commercial | Interest | ES |
| `/es/slp-3` | SLP 3333 | Commercial | Interest | ES |

## 2. Cannibalisation review

The real risk in this cluster is not EN vs ES — hreflang handles that — it is
three Spanish pages chasing overlapping commercial intent.

| Pair | Risk | Verdict | Control in place |
|---|---|---|---|
| `/es/examen-slp` ↔ `/es/slp-2` ↔ `/es/slp-3` | **Medium-high.** All three can rank for "preparar SLP". | Keep separate. `examen-slp` answers *the sitting* (convocatoria, administration); the level pages answer *the profile*. | Distinct primaries; `examen-slp` is the only page that discusses administration |
| `/slp-2` ↔ `/es/slp-2` | Low | Correct by design | Reciprocal hreflang + `x-default` |
| `/slp` ↔ `/stanag-6001` | Medium. Both define terms. | Keep separate. `/slp` exists to defeat the speech-language-pathology ambiguity, which `/stanag-6001` must not dilute. | `/slp` primary is the disambiguation term |
| `/exam` ↔ `/guides` | Low-medium | `/guides` is an index (CollectionPage); `/exam` is a single commercial argument | Schema types differ; `/guides` carries no FAQ |
| `/guides/writing` ↔ `/slp-3` | Medium. Both discuss Level 3 writing. | Keep. `/slp-3` covers the whole profile; `/guides/writing` covers task achievement across levels. | Cross-linked rather than duplicated |

**Rule:** before adding any page, name its primary keyword and check it is not in
the table above. If it is, improve the existing page instead.

## 3. Terms we deliberately do not target

| Term | Why not |
|---|---|
| `SLP` (bare, EN) | Speech-language pathology. Unwinnable and wrong-intent traffic. |
| `STANAG` (bare) | Rifle magazines and ammunition. |
| `military English` | High competition, low purchase intent, and not what the product is. Do not make it the homepage target. |
| `best app for STANAG 6001` | We may *rank* for it via `/about`; we may never *write* "best app" (claim C14). |

## 4. Coverage gaps, ranked

Only build these when the primary keyword is free and the page can be genuinely
useful. Do not spray.

| Rank | URL | Primary keyword | Why | Priority |
|---|---|---|---|---|
| 1 | `/guides/reading` | STANAG 6001 reading | Completes the four-skill cluster; inference-vs-vocabulary is a real misconception | P1 |
| 2 | `/guides/speaking` | STANAG 6001 speaking | Highest-anxiety skill; five named dimensions are a differentiator | P1 |
| 3 | `/guides/how-to-prepare` | how to prepare for STANAG 6001 | Commercial how-to, currently unserved | P1 |
| 4 | `/es/aprobar-slp-3333` | cómo aprobar el SLP 3333 | Spain, high commercial intent | P2 |
| 5 | `/compare/stanag-vs-cefr` | STANAG 6001 vs CEFR | Frequent question; must carry heavy caveats — the mapping is not official | P2 |
| 6 | `/glossary` | — | Entity terms for GEO; internal-link hub | P2 |
| 7 | IT / `JFLT` page | esame JFLT | Only after ES and EN are proven | P3 |
| 8 | DE page | STANAG 6001 Vorbereitung | A German App Store competitor exists; validate demand first | P3 |

## 5. Localisation gate

Do not translate on ambition. A language qualifies when **all four** hold:

1. A national test exists that STANAG 6001 descriptors actually govern.
2. Evidence of query demand (Planner or Search Console impressions).
3. We can be accurate about that nation's administration without guessing.
4. Support can answer in that language.

Today: **ES qualifies. EN qualifies.** IT, DE, PL, FR do not yet — not because
demand is absent, but because criteria 3 and 4 fail. Revisit after 100 activations.
