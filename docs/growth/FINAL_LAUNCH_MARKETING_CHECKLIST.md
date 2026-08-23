# Final launch marketing checklist

**23 August 2026.** Three columns only: **CODE** (done, in git), **MANUAL**
(needs Rafael, with the exact action), **LATER** (deliberately deferred).

This does not restate the strategy. Twenty-eight growth documents already exist
and the constraint has never been strategy — it is execution. Nothing
speculative was added.

---

## 1. Technical SEO

| Item | State | Note |
|---|---|---|
| `sitemap.xml` | **CODE ✅** | `app/sitemap.ts`, live, 200 |
| `robots.txt` | **CODE ✅** | `app/robots.ts`, live, 200 |
| `llms.txt` | **CODE ✅** | live, 200 — AI-crawler discovery |
| Canonical URLs | **CODE ✅** | on every page |
| hreflang + `x-default` | **CODE ✅** | on the SLP-2 / SLP-3 EN↔ES pairs |
| OpenGraph | **CODE ✅** | title, description, locale, image, type |
| JSON-LD | **CODE ✅** | Organization, WebSite, SoftwareApplication, Offer |
| Metadata coverage | **CODE ✅** | 39 pages |
| Security headers | **CODE ✅** | new this pass — they were entirely absent |
| Search Console verification | **MANUAL** | `MANUAL_WEB_ACTIONS.md` §2 — blocks *all* organic measurement |
| Sitemap submission | **MANUAL** | §3 |
| Bing Webmaster | **LATER** | after Search Console |

## 2. Positioning — settled, do not relitigate

The niche is **STANAG 6001 / SLP English for military and defence personnel**,
targeting SLP 2 and SLP 3. It is narrow on purpose. Nothing here should broaden
it to "English learning".

Two constraints that are product decisions and must survive every marketing
edit:

- **No affiliation claim.** Not NATO's, not BILC's, not any ministry's. The app
  says so in-product and the site must not imply otherwise.
- **No outcome promise.** No pass rates, no score guarantees, no "certified".
  The methodology is cited to BILC and ATrainP-5 inside the source, which is a
  real and unusual asset — and it is defensible precisely because it does not
  overclaim.

## 3. Conversion path

| Item | State | Note |
|---|---|---|
| Landing → signup | **CODE ✅** | live |
| Paywall / pricing | **CODE ✅** | 848-line paywall; web checkout behind `web_billing_enabled` |
| Restore purchases | **CODE ✅** | on the subscription screen |
| Honest Coach copy | **CODE ✅** | no longer promises minutes no plan grants |
| Legal links from the paywall | **CODE ✅** | privacy, terms, subprocessors |
| **Social proof** | **LATER — the biggest gap** | there is none anywhere. It is the strongest lever in exam prep and it needs real users first. See §6 |
| Free trial | **LATER** | none exists. The competitor's 3-day no-card trial is the benchmark. Do not add trial analytics events before the trial exists |

## 4. Analytics and attribution

| Item | State | Note |
|---|---|---|
| PostHog wired | **CODE ✅** | 57 of 68 events have call sites |
| Funnel events | **CODE ✅** | practice/exam started+completed wired this pass |
| Paywall events | **CODE ✅** | viewed, scrolled, closed, upgrade clicked |
| Subscription lifecycle | **CODE ✅** (client-side signal) | `audit_logs` in the backend stays authoritative |
| 11 unwired events | **DOCUMENTED** | each classified with a reason; three describe a trial that does not exist |
| UTM / attribution params | **LATER** | needs campaigns to exist first |

## 5. App Store listing

| Item | State |
|---|---|
| Screenshots, both mandatory sizes | **CODE ✅** — iPhone 1320×2868 ×6, iPad 2064×2752 ×6 |
| Review notes | **CODE ✅** — `APP-STORE-REVIEW-NOTES.md`, paste-ready |
| ASO copy source | **CODE ✅** — `06_ASO_MASTER_PLAN.md` exists |
| Description, keywords, category, age rating | **MANUAL** |
| Reviewer account | **MANUAL** |
| Entity + NIF → banking | **MANUAL — blocks everything** |

## 6. Launch sequence — the honest order

Nothing below is a marketing task until the one above it is done.

1. **Entity + NIF.** Everything commercial waits here.
2. **Push and deploy.** Nothing shipped exists for a user yet.
3. **Render off the spin-down tier.** A 32-second first impression defeats any
   acquisition spend.
4. **Submit to the App Store.** The gate everything else waits behind.
5. **Search Console.** Twenty minutes; unblocks all measurement.
6. **Recruit 10–20 real candidates** from military and aviation communities.
   Free access in exchange for observed sessions. This is the only way to get
   both behavioural evidence *and* the first testimonials — which is why §3's
   social-proof gap is listed as LATER rather than as a task: it cannot be
   manufactured, only earned.
7. **Then** execute the existing plan — X account, PR emails, the three
   remaining content objects. No new strategy work.

## 7. Deliberately not done

- **No new growth documents.** There are 2,546 markdown files in this project
  and the constraint is execution.
- **No fabricated social proof.** No invented testimonials, no fake counts.
- **No urgency mechanics**, no "NATO official" framing, no pass-probability
  claims. The brand principle is calm, exact, adult, premium by restraint — and
  those tactics would each cost more credibility than they buy in a niche this
  small, where the buyers are professionals who will check.
