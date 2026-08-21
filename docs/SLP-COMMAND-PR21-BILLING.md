# PR-21 — Web billing paywall (Phase 12)

**Date:** 2026-08-21
**Status:** 🟢 **READY FOR Q4.** Everything in PR-21 that does not require a provider decision
is implemented. The purchase rail itself is not, and is not faked.
**Definition:** master plan PR Plan, row 21 — `feat: web billing paywall`. The "Contains"
cell is literally **"(only after Q4)"**. Must not contain a client-side unlock. Review
focus: Model B.

---

## Q4, verified rather than assumed

| Where | What it says |
|---|---|
| Open Questions, line 94 | **Q4 — "Web billing: RevenueCat Web Billing vs Stripe direct?"** Default if unanswered: *"Not in MVP. Prefer RC Web Billing to reuse `process_billing_webhook_event` if the event map fits"*. Blocks: *"Phase billing"*. |
| AK. Explicit blockers, line 1991 | **"Web payment provider (Q4) · Owner: You + backend · Blocks: Web purchase · Web can work around? Yes — iOS purchase already flows to entitlements."** |
| Security gates → Before billing launch, line 2148 | Provider chosen (Q4) · Webhook atomic + reconcile · Subprocessors + Terms §10 + Privacy · **Never-grant-locally proven (`refreshUntilPro` analogue)** · Refund/cancel copy · No credentials CORS change |
| PR Plan, line 2271 | `21 · feat: web billing paywall · (only after Q4) · must not contain: client-side unlock · review focus: Model B` |

**Q4 is a provider decision and nothing more.** It blocks the *web purchase rail* — a
checkout, a provider SDK, a webhook contract, a new subprocessor and the legal disclosures
that come with one. The master plan states in its own blocker table that the web **can work
around it**, because an iOS purchase already flows into `user_plans` and therefore into
`GET /api/entitlements`.

Of the six billing-launch gates, exactly one is web-side and provider-independent —
**"Never-grant-locally proven (`refreshUntilPro` analogue)"** — and it is now implemented
and proven. One more ("No credentials CORS change as a shortcut") is a non-action, still
true. The remaining four are Q4's, the backend's, and legal's.

## Q5, and a correction to this document's previous version

**Q5 is "Who applies the two HIGH RLS view fixes, and when?"** — the views
`listening_publication_state` and `content_lifecycle_current`. Owner: backend/Supabase.
It appears in *Before public launch*, **not** in *Before billing launch*.

An earlier revision of this file listed Q5 among PR-21's blockers. That was an
overstatement: **Q5 blocks public launch, not billing.** Corrected here.

Web exposure to Q5 is nil, and that is now a verified statement rather than an assumption:
this repo contains **no Supabase client, no Supabase key and no direct database access** of
any kind — every read goes through the same-origin proxy to Express. The views are
reachable only by a caller holding the project's anon key against Supabase PostgREST
directly, which this application is not and does not have (see also *AL. What must NOT be
changed*: "do not add a Supabase service role").

---

## What was already true (audited, not assumed)

| Requirement | Verdict |
|---|---|
| Backend `user_plans` is the only authority | ✅ `isPro` iff `plan.key === "pro"`, in one module |
| No client-side unlock, trial clock or stored flag | ✅ no entitlement input from storage, cookies, query strings or `NEXT_PUBLIC_` |
| Premium content withheld server-side | ✅ the locked Academy topic returns early in a server component; the lesson body is never serialised |
| Browser cannot reach a billing write | ✅ RC webhook 410, admin reconcile 410, no purchase route allowlisted |
| Honest interim CTA | ✅ present, if scattered |

## What PR-21 implemented now

**One commercial state.** The sidebar's plan label was rendered once from the layout's
server read and never looked again, while Settings fetched its own. A learner who
subscribed in the iOS app and returned to an open tab could see *Free* in the chrome and
*Pro* in Settings simultaneously, with no way to resolve it but a hard reload.
`PlanProvider` now owns that state for the whole authenticated product; every surface reads
it. It has no setter — the only way to change it is to ask the server again.

**The bounded re-read (`lib/plan/refresh.ts`).** The billing-launch gate, implemented:
five reads of `GET /api/entitlements`, front-loaded on the shipped iOS schedule
(300/500/800/1100/1100 ms), returning **the backend's answer** and never an optimistic one.
Provider-independent by construction — it re-reads the only thing the product treats as
authority, whether the purchase happened in the iOS app (today) or a web rail (Q4).

**`/subscription`.** Reserved in `app/robots.ts` since PR-15 and never built, which is why
every plan boundary in the product pointed at a usage meter inside Settings. It now exists,
behind auth, `noindex`, and is **explicitly non-operative**: real allowances from the
account, one honest route to Pro (the iOS app), the recheck, and no checkout of any kind.

**Honest display, still fail-closed access.** `planLabel` collapsed every non-Pro state
into "SLP Command Free" — including a failed read, which told a paying subscriber they were
not one. Display and access are now separate duties: an unknown state grants nothing and
says "Plan unavailable". Relatedly, `interpretEntitlements` mapped **5xx to `noPlan`**,
rendering a server outage as a definite Free plan; 5xx is now `error`. Access behaviour is
identical — both block — only the claim changed.

**`featureAccess` now says why.** `spent` / `notOnPlan` / `unknown`, so a screen can state
the true reason instead of guessing between "you used your ten" and "not on your plan".

**Dialog accessibility.** `CommercialDialog` claimed `aria-modal` and delivered none of it:
Escape inert, backdrop inert, focus never entered it, Tab walked out the back, the page
scrolled behind. All fixed and locked by tests.

**Dead code removed.** `components/home/PlanChip.tsx` was a third, unused plan-display
vocabulary — never imported anywhere. `HomeDashboard` had a fourth, calling the plan "SLP
Command Professional" where the master plan fixes the display names as "SLP Command Pro" /
"SLP Command Free".

## Blocked, and deliberately not built

| Blocked by | Item |
|---|---|
| **Q4** | Provider choice; checkout UI; provider SDK; `POST /api/checkout`; price display |
| **Q4 + backend** | Webhook contract, signature, event map, idempotency, refund/cancel/renewal lifecycle |
| **Legal** | New subprocessor entry; Terms §10; Privacy and Cookie Policy updates |
| **Backend (KD19)** | Atomic RPC + 6h reconcile — "do not modify Express / iOS / Supabase from this repo" |
| **Q5 (public launch, not billing)** | The two HIGH RLS view fixes |

No provider port or adapter interface was written either. With zero implementations behind
it, an interface for an unchosen provider is a guess about a contract that does not exist —
which is the failure mode this PR was told to avoid.

## What a provider connects to when Q4 is answered

The seam is already the right one, and it is the seam the product already uses:

```
provider → webhook → user_plans → GET /api/entitlements → interpretEntitlements
                                                              → PlanProvider → every surface
```

Concretely, the day Q4 is answered: add the checkout entry point to `/subscription`, add
the provider's routes to the proxy allowlist, and call the existing `recheck()` after the
purchase returns. Nothing above `GET /api/entitlements` needs to change, because nothing
above it knows a provider exists.

## Tests

| Gate | Result |
|---|---|
| `tsc --noEmit` | PASS — 0 source errors |
| `eslint .` | PASS — 0 errors, 3 pre-existing warnings |
| `vitest run` | PASS — 33 files, 274 tests |
| `next build` | PASS — `/subscription` 3.0 kB |
| `playwright test` | PASS — 57 tests |
| axe on `/subscription` and `/profile` | PASS — no critical or serious violations |
| Visual QA | `subscription-wide.png`, `subscription-mobile.png`, `plan-boundary-wide.png` |

Model B is proven end to end rather than asserted: a browser that sets `localStorage`,
`sessionStorage`, cookies, query strings and a global all claiming Pro, and then rewrites
the rendered plan label in the live DOM, still gets the locked topic — and the locked
lesson's text is absent from the served HTML, not merely hidden.
