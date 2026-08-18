# 19 — Analytics specification

**Constraint:** marketing/legal pages must not grow advertising cookies until Cookie Policy + consent match reality (live policy still claims almost no storage on the public site).

## Sources of truth

| Surface | Tool | Notes |
|---|---|---|
| Website SEO | Google Search Console | No extra pixel required |
| Website behaviour (later) | First-party, consented only | Do not add today |
| App Store | App Store Connect | ASO |
| App product | Existing backend / PostHog / RevenueCat | Do not fork |
| GEO | `12_GEO_BENCHMARK.csv` | Experimental |
| Social | Native insights | Not a success KPI |

## Required events (app) — names to implement or confirm

| Event | Definition | Funnel |
|---|---|---|
| `app_open` | Process start | |
| `register_success` | Account created | Install→Reg |
| `onboarding_target_set` | SLP 2 or 3 chosen | |
| `first_scored_practice` | First rated item any skill | **Activation** |
| `practice_completed` | Skill + level + timed? | |
| `exam_completed` | Full mock finished | |
| `writing_reason_viewed` | User opened AI rationale | Review prompt |
| `paywall_viewed` | Surface + reason | |
| `subscribe_success` | Pro start | |
| `subscribe_cancel` | | |

North star: **weekly activated learners** = users with ≥1 scored practice in last 7 days.

## Do not track as success

Follower counts. Unrelated NATO news impressions. User “pass rate” (no official outcomes).
