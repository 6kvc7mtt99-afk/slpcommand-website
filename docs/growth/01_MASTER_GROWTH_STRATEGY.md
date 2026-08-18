# 01 — Master Growth Strategy (execution layer)

**Parent:** `/Users/rafael/Desktop/SLP_COMMAND_AI_MARKETING_GROWTH_MASTER_PLAN.md` (Marketing Master Plan v1)  
**This file is not a replacement plan.** It is the audit + implementation map of v1.  
**Date:** 18 August 2026

---

## 1. Audit of Master Plan v1

| Section in v1 | Status | Why | Implementation |
|---|---|---|---|
| Brand promise / UVP / tone | READY | Live on slpcommand.com; copy is load-bearing | `02_BRAND_ENTITY.md` |
| Claims / disclaimer | READY | Legal pages already exist | `03_CLAIMS_REGISTRY.md` |
| Keyword universe | NEEDS DATA | Volumes UNKNOWN — no Ads/Ahrefs pull yet | `09_KEYWORD_DATABASE.csv` |
| Competitor set | READY + UPDATE | New App Store rival: Militärisches Englisch (DE) | `10_COMPETITOR_DATABASE.csv` |
| VOC | READY | Enough to write pages; mine more after launch | `11_VOC_DATABASE.csv` |
| SEO architecture | READY | One collision: `/reading` etc. are **app routes** | Implemented as `/guides/*` |
| GEO | STRATEGIC | Controllable assets yes; mentions not controllable | `05_GEO_MASTER_PLAN.md` + `12_GEO_BENCHMARK.csv` |
| ASO | BLOCKED on store | App still “coming to the App Store” | `06` + `13` ready to paste |
| Content engine / 90-day calendar | READY | Cadence in v1 is correct | `07`, `08`, `21` |
| Reddit / X / YouTube | STRATEGIC | Do not automate | `14` `15` `16` |
| Paid | BLOCKED | No live store + no funnel numbers | Do not spend |
| Okara | DECIDED | LATER / Free only | Unchanged |
| Analytics / dashboard | NEEDS DATA | Spec only until events exist | `19` `20` |

### Critical deviation from v1 URLs

Master Plan v1 proposed `/reading`, `/listening`, `/writing`, `/speaking`.

**Those paths are the learner web app** and are `Disallow` in `app/robots.ts`. Publishing marketing there would either leak app chrome into Google or fight the robots file.

**Shipped public IA:**

| Intent | Live URL |
|---|---|
| STANAG pillar | `/stanag-6001` |
| SLP disambiguation | `/slp` |
| Levels | `/slp-2` `/slp-3` `/es/slp-2` `/es/slp-3` |
| Spain money page | `/es/examen-slp` |
| Skill guides | `/guides` `/guides/writing` `/guides/listening` |
| Exam | `/exam` |
| Entity | `/about` |
| Machine citation | `/llms.txt` |

`/guides/reading` and `/guides/speaking` are P1 — not shipped in this pass.

---

## 2. What “reference product” requires

| Layer | Controllable now | Not controllable |
|---|---|---|
| Search authority | 12 citation pages + sitemap + schema | Volumes, competitors publishing more |
| Product authority | Honesty, measurement, four skills | Official outcomes we refuse to fake |
| App Store authority | Metadata + screenshots (when live) | Apple ranking |
| AI discovery | Entity consistency, llms.txt, third-party cites | Model recommendations |
| Social / community | Teaching, not spam | Virality |
| Third-party | Teacher outreach | Wikidata/Wikipedia before sources exist |

---

## 3. The 20 most important actions

Scored Impact × Confidence ÷ Effort. Owner = Founder unless noted.

| # | P | Action | Output | KPI |
|---|---|---|---|---|
| 1 | P0 | Keep these 12 URLs live and accurate | Authority pages | Index coverage |
| 2 | P0 | Instrument install → register → first scored practice | Analytics events | Funnel exists |
| 3 | P0 | Ship iOS listing with ASO package | App Store | Installs |
| 4 | P0 | Submit sitemap in Search Console | GSC | Indexed pages |
| 5 | P0 | Freeze claims registry on every bio | `03` | Zero official-claim incidents |
| 6 | P0 | Pull keyword volumes (Google Ads planner) | Fill UNKNOWN in `09` | Volumes labelled VERIFIED |
| 7 | P0 | Friday GEO log of 12 prompts | `12` | Directional only |
| 8 | P1 | `/guides/writing` as public signature | Already live | Rank + citations |
| 9 | P1 | ES storefront subtitle `SLP 2222 & 3333 preparation` | ASC | ES CVR |
| 10 | P1 | YouTube #1: What STANAG 6001 is | Video | Watch time |
| 11 | P1 | X 5/week from content engine | Posts | Profile clicks |
| 12 | P1 | In-app review prompt after writing reason | Code | Ratings |
| 13 | P1 | Three teacher emails with the writing table | Outreach | 0–2 replies |
| 14 | P1 | Add `/guides/reading` + `/guides/speaking` | Pages | Cluster completeness |
| 15 | P1 | Shorten iOS registration if drop-off > 40% | CRO E01 | Reg→practice |
| 16 | P2 | IG 3/week cut-downs | Social | Saves |
| 17 | P2 | Apple Search Ads exact **only after gates** | Ads | CPA install |
| 18 | P2 | Glossary page | SEO | Internal links |
| 19 | P3 | PL / IT / DE localisation | Later | After 100 activations |
| 20 | P3 | Revisit Okara | Decision | Still no, unless drafting is the bottleneck |

---

## 4. Traceability

```
MASTER PLAN v1
    → docs/growth/* (this package)
    → app/* authority routes + public/llms.txt
    → Search Console / App Store Connect / GEO sheet
    → Friday CEO dashboard (20)
```

Success for this implementation pass: **pages compile, tests pass, claims are safe, IA does not collide with the app.**

Not claimed: rankings, installs, AI citations.
