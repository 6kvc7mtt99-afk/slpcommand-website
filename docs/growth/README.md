# SLP Command — Growth implementation package

Parent strategy (do not replace):  
`/Users/rafael/Desktop/SLP_COMMAND_AI_MARKETING_GROWTH_MASTER_PLAN.md`

| File | Role |
|---|---|
| [01_MASTER_GROWTH_STRATEGY.md](01_MASTER_GROWTH_STRATEGY.md) | Audit + 20 actions + URL deviation |
| [02_BRAND_ENTITY.md](02_BRAND_ENTITY.md) | Single source of truth |
| [03_CLAIMS_REGISTRY.md](03_CLAIMS_REGISTRY.md) | Allowed / forbidden claims |
| [04_SEO_MASTER_PLAN.md](04_SEO_MASTER_PLAN.md) | What shipped + next URLs |
| [05_GEO_MASTER_PLAN.md](05_GEO_MASTER_PLAN.md) | Controllable AI-search work |
| [06_ASO_MASTER_PLAN.md](06_ASO_MASTER_PLAN.md) | Paste-ready store listing |
| [07_CONTENT_ENGINE.md](07_CONTENT_ENGINE.md) | Weekly production system |
| [08_CONTENT_DATABASE.csv](08_CONTENT_DATABASE.csv) | Asset inventory |
| [09_KEYWORD_DATABASE.csv](09_KEYWORD_DATABASE.csv) | Keywords (volumes UNKNOWN) |
| [10_COMPETITOR_DATABASE.csv](10_COMPETITOR_DATABASE.csv) | Live competitive set |
| [11_VOC_DATABASE.csv](11_VOC_DATABASE.csv) | Voice of customer |
| [12_GEO_BENCHMARK.csv](12_GEO_BENCHMARK.csv) | Friday AI-search log |
| [13_ASO_TEST_MATRIX.md](13_ASO_TEST_MATRIX.md) | Store experiments |
| [14_YOUTUBE_STRATEGY.md](14_YOUTUBE_STRATEGY.md) | Authority video |
| [15_X_STRATEGY.md](15_X_STRATEGY.md) | Profile + first week |
| [16_REDDIT_STRATEGY.md](16_REDDIT_STRATEGY.md) | Listen, don’t spray |
| [17_DIGITAL_PR.md](17_DIGITAL_PR.md) | Outreach |
| [18_PARTNERSHIPS.md](18_PARTNERSHIPS.md) | Affiliate / later B2B |
| [19_ANALYTICS_SPEC.md](19_ANALYTICS_SPEC.md) | Events + cookie constraint |
| [20_CEO_DASHBOARD.md](20_CEO_DASHBOARD.md) | Friday 15 numbers |
| [21_90_DAY_EXECUTION_PLAN.md](21_90_DAY_EXECUTION_PLAN.md) | D1–90 with KPIs |
| [22_IMPLEMENTATION_LOG.md](22_IMPLEMENTATION_LOG.md) | What changed, all four passes |
| [23_MARKETING_OS_DECISION.md](23_MARKETING_OS_DECISION.md) | External Marketing OS: audit + reject-with-reasons |
| [24_CHAIRMAN_AUDIT.md](24_CHAIRMAN_AUDIT.md) | Consolidated chairman audit: findings, both scorecards, approvals |
| [25_TECHNICAL_CLOSURE_2026-08-18.md](25_TECHNICAL_CLOSURE_2026-08-18.md) | Lint, E2E determinism, CSRF origin, closure verification |
| [26_KEYWORD_PAGE_INTENT_MAP.md](26_KEYWORD_PAGE_INTENT_MAP.md) | Keyword → page → intent, cannibalisation, gaps |
| [os/README.md](os/README.md) | Roles + handoff format |
| [os/QUALITY_GATE.md](os/QUALITY_GATE.md) | Pre-publish scorecard (≥80 to ship) |
| [os/EXPERIMENTS.md](os/EXPERIMENTS.md) | Experiment ledger |
| [os/LEARNINGS.md](os/LEARNINGS.md) | Durable findings |
| [os/GRAFT.md](os/GRAFT.md) | Graft tooling evaluation — PILOT, with measured evidence |

Live public pages implemented in this pass are listed in `01` and `04`.

**Pass structure (18 Aug 2026).** `01`–`21` are Grok v1 and stand as written. `22`
carries all four passes. The chairman review ran as two independent tracks against
the same snapshot (`458a48a`) in separate working trees — technical/brand closure
(`25`) and commercial/authority (`22` Pass 4) — and `24` consolidates both, keeping
both scorecards because they disagree usefully rather than picking one.

**Executable documents.** Four of these files are enforced by tests, so they cannot
silently stop describing the site:

| Document | Test |
|---|---|
| `03_CLAIMS_REGISTRY.md` | `tests/unit/claimsRegistry.test.ts` |
| `26_KEYWORD_PAGE_INTENT_MAP.md` | `tests/unit/keywordMap.test.ts` |
| Free-plan quotas quoted in CTAs | `tests/unit/conversion.test.ts` |
| SEO invariants (canonical, OG, hreflang, sitemap) | `tests/unit/seoInvariants.test.ts` |
