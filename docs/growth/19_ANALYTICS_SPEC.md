# 19 — Analytics & measurement specification

> **Version 2 — 18 August 2026 (Chairman review).**
> **v1 (Grok):** correct constraint, correct refusal to add pixels, but no legal
> analysis, no decision gate, and no implementation path — so the constraint read
> as "blocked forever" rather than "blocked pending a named decision".
> **v2 adds:** the exact legal position, what each option costs, what is already
> implemented, and who must approve what. **Nothing in v1 was wrong; it was
> incomplete.** The refusal to ship tracking is upheld.

---

## 0. Decision summary

| Question | Answer |
|---|---|
| Do we have web measurement today? | **No.** Nothing measures the public site. |
| Should we add GA4 now? | **No** — not without the legal work in §3. |
| What is safe and shipped? | Search Console verification hook (§2). Sets no cookie. |
| What is the single blocking action? | Verify the property and submit the sitemap. **Founder, 20 minutes.** |

---

## 1. The constraint, stated precisely

`/cookies` (Cookie Policy, last updated 16 August 2026) does not merely say we
use few cookies. It **enumerates them in a table** and states:

> "slpcommand.com uses only strictly necessary technical cookies… We do not use:
> advertising or marketing cookies; behavioural tracking or cross-site profiling
> cookies; third-party analytics cookies on the public website. Because we do not
> use non-essential cookies, no cookie-consent banner is required under Article
> 22.2 of the LSSI-CE, per the guidance of the AEPD."

That paragraph is an asset. It is also a tripwire: **the moment a non-essential
cookie ships, the policy becomes false and the banner exemption is lost.**

## 2. Implemented and safe

| Item | Status | Why it is exempt |
|---|---|---|
| Search Console verification meta tag | **Shipped**, inert until `GOOGLE_SITE_VERIFICATION` is set (`app/layout.tsx`) | A meta tag. No cookie, no script, no collection. |
| `sitemap.xml` with honest `lastmod` | Shipped | Server-side |
| `robots.txt` disallowing app routes | Shipped | Server-side |
| `llms.txt` | Shipped | Static file |

**Search Console is the source of truth for organic search** and needs no client
tracking at all: impressions, clicks, CTR, average position, queries, pages,
countries, devices, index coverage, sitemap status. For a pre-launch site this is
**most of the measurement value at zero legal cost.**

## 3. Options for behavioural measurement, with real costs

| Option | Cookies? | Consent banner? | Policy changes needed | Verdict |
|---|---|---|---|---|
| **A. Search Console only** | No | No | None | **Do this now.** |
| **B. Cloudflare Web Analytics** | No cookies; no cross-site ID | Probably not — but it is a **legal opinion, not a fact** | Cookie Policy §3 wording; Subprocessors (Cloudflare is already a subprocessor for hosting) | **Candidate.** Cheapest route to page-level behaviour. Requires counsel sign-off. |
| **C. Self-hosted Plausible / Umami** | No | Likely not | Cookie Policy; Subprocessors; DPA | Defer. Ops cost is real. |
| **D. GA4** | Yes (`_ga`, `_gid`) | **Yes** | Cookie Policy table, banner + consent store, Privacy Policy (transfers, retention), Subprocessors (Google) | **Do not ship without counsel.** The banner will also cost conversion on the pages we just built. |

**Recommendation: A now, B after counsel review.** Do not adopt D for a site with
no traffic yet — the compliance cost lands before the insight does.

> **HUMAN / LEGAL APPROVAL REQUIRED** before any of B, C or D. The change is not
> "add a script"; it is "amend three published policies and add a consent
> mechanism". Nothing in this repository should do that silently.

## 4. Sources of truth

| Surface | Tool | Notes |
|---|---|---|
| Organic search | Google Search Console | No pixel required |
| Website behaviour | **None today** — see §3 | Do not add without approval |
| App Store | App Store Connect | Blocked until the listing is live |
| In-app product | Existing backend / PostHog / RevenueCat | Already consented in-app; **do not fork** |
| AI search | `12_GEO_BENCHMARK.csv` | Manual, directional, not a KPI |
| Social | Native insights | Not a success metric |

## 5. Required product events (in-app, already consented)

Unchanged from v1. These live in the mobile/web app, not on marketing pages.

| Event | Definition | Funnel |
|---|---|---|
| `app_open` | Process start | |
| `register_success` | Account created | Install → Reg |
| `onboarding_target_set` | SLP 2 or 3 chosen | |
| `first_scored_practice` | First rated item, any skill | **Activation** |
| `practice_completed` | Skill + level + timed? | |
| `exam_completed` | Full mock finished | |
| `writing_reason_viewed` | User opened the AI rationale | Review-prompt trigger |
| `paywall_viewed` | Surface + reason | |
| `subscribe_success` / `subscribe_cancel` | Pro lifecycle | |

**North star: weekly activated learners** — users with ≥1 scored practice in the
last 7 days.

### 5a. New: the web funnel now exists and is unmeasured

The Chairman review connected the authority cluster to `/signup`. That created
the site's first real funnel:

```
organic search → authority page → /signup → register_success → first_scored_practice
```

Steps 1–2 are visible in Search Console today. Steps 4–5 are visible in the
existing in-app analytics. **Step 3 — did they click Start free — is the one gap**,
and it is exactly what option B would close. Until then, `register_success` volume
against Search Console clicks is a usable proxy.

## 6. Do not track as success

Follower counts. NATO news impressions. Any "pass rate" — we hold no official
outcomes and inventing one would breach claim C09.

## 7. Founder actions

1. Set `GOOGLE_SITE_VERIFICATION` and verify slpcommand.com. **Blocking.**
2. Submit `https://slpcommand.com/sitemap.xml`.
3. Inspect `/stanag-6001` and `/es/examen-slp`; request indexing.
4. Decide on option B with counsel. Until then, do not add any script.
