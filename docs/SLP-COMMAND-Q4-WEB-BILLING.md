# Q4 — RevenueCat Web Billing — implementation record

**Date:** 2026-08-21
**Q4 resolved as:** RevenueCat Web Billing, on SLP Command's own Stripe account, reusing the
existing webhook / entitlement / reconciliation path.
**Status:** 🟡 **IMPLEMENTED, SHIPPED OFF.** `web_billing_enabled = false`. Nothing is for sale
until sandbox, cross-platform and legal gates are signed off by a human.

---

## Documentation gate — what changed since the audit

Verified against RevenueCat's current docs before writing anything. Three findings changed the
implementation, and one corrects the Q4 determination itself.

### 1. RevenueCat now HMAC-signs webhooks

`billing.js` carried the comment *"RevenueCat does not HMAC-sign the payload; the static bearer
token IS the mechanism it provides."* **That is no longer true.** Deliveries now carry
`X-RevenueCat-Webhook-Signature: t=<unix>,v1=<hmac_sha256_hex>`, computed over
`"<t>.<raw body>"`.

This raises RevenueCat's security score in the Q4 determination, which weighed Stripe's
signature as the stronger primitive. The gap it described is closed.

### 2. There is no `REFUND` event — and the earlier finding was partly overstated

The PR-21 audit reported that a refunded subscriber "keeps Pro until `expires_at`". Checking
the docs properly: RevenueCat sends `CANCELLATION` (`cancel_reason: CUSTOMER_SUPPORT`) and then
**`EXPIRATION` (`expiration_reason: CUSTOMER_SUPPORT`)**, and *"revocation happens on the
separate EXPIRATION event"*. `EXPIRATION` was already mapped to `free`, so **access control was
never broken.**

What was broken was narrower and real: the dead `REFUND` row meant the audit distinction it
existed to record — ended by refund versus ended by running its term — was lost, and every
ending was written as `expired`. `BILLING-WEBHOOK-SPEC.md` line 28 described a flow that could
not happen, and `test/billing.test.js` case 5 proved the mapper against a payload the provider
never sends.

### 3. Cancellation must never revoke, for any reason

Including a refund's own `CANCELLATION`: *"in the case of refunds, a subscription's auto-renewal
setting may still be active"*. Turning any cancellation into an immediate revoke would cut off a
learner on day 2 of a month they paid for. The existing no-mutation mapping was correct and is
now locked by a test that iterates every `cancel_reason`.

### 4. Pricing ambiguity resolved

The 1% applies to **all** tracked revenue once $2,500 MTR is crossed, not only the excess, and is
computed on **gross** revenue. The Q4 cost model already assumed the less favourable reading, so
it stands. Source is RevenueCat's own community documentation rather than the pricing page, which
remains ambiguous — **confirm on the contract before launch.**

---

## Architecture

```
iOS · StoreKit ────┐
                   │   app_user_id = Supabase user UUID (both platforms)
Web · Purchase Link┼──▶ RevenueCat ──▶ POST /api/billing/revenuecat/webhook
                   │      store: APP_STORE | RC_BILLING
                   └──────────────▼
                   bearer + HMAC-SHA256 over "<t>.<raw body>"
                                  │
                   process_billing_webhook_event   · atomic, replay-safe
                                  │
                   apply_billing_plan_transition   · row-locked
                                  │
                            user_plans             · the only authority
                                  │
                   reconcileExpiredPlans           · 6h safety net
                                  │
                        GET /api/entitlements
                                  │
                   PlanProvider · recheck() ──▶ web surfaces
```

No second authority was created. Nothing above `GET /api/entitlements` knows a provider exists.

## Identity — unchanged, on purpose

`Purchases.configure(appUserID: supabaseUserId)` on iOS. On the web, the checkout link carries
`?app_user_id=<the same Supabase UUID>`, and **the server builds that link from the session
cookie**. The browser never sends an identity and cannot choose one.

That is the whole defence against the one unforgivable billing bug: a purchase attached to
someone else's account. It is why `/api/billing/checkout` exists as a route at all instead of a
plain link in the page.

## Event map

| Event | Action | Entitlement result |
|---|---|---|
| `INITIAL_PURCHASE` | transition | → `pro` |
| `RENEWAL` | transition | → `pro` |
| `PRODUCT_CHANGE` | transition | → `pro` |
| `UNCANCELLATION` | transition | → `pro` (App Store / Play only; not emitted for web) |
| `EXPIRATION` | transition | → `free`, row closed `expired` |
| `EXPIRATION` + `expiration_reason: CUSTOMER_SUPPORT` | transition | → `free`, row closed **`cancelled`** (refund) |
| `CANCELLATION` (any reason) | **audit only** | unchanged — access ends at `EXPIRATION` |
| `BILLING_ISSUE`, `SUBSCRIPTION_PAUSED`, others | audit only | unchanged |
| `NON_RENEWING_PURCHASE` | coach ledger bridge | Coach minutes; no plan change |

## Kill switch

`web_billing_enabled` in the existing `feature_flags` table, read through
`GET /api/feature-flags`. **Defaults to `false` when absent, unreadable or non-boolean** —
the `home_v3_enabled` pattern, not the module-flag pattern that fails open.

Checked in two places on purpose: the page (a UI decision) and `/api/billing/checkout` (an
access decision). A stale tab, a hand-typed URL or a switch flipped mid-session all reach the
route, and all get 404.

**Off does not revoke anything.** The flag gates the way *in* to a purchase, never what a
purchase produced. Entitlements already granted stay granted; `/api/entitlements` is untouched.

## The purchase → entitlement race

Returning from the hosted checkout is **not** proof of payment — there is no signed receipt in
that redirect. The return runs PR-21's `recheck()` unchanged (five reads,
300/500/800/1100/1100 ms, the shipped iOS schedule) and reports what the backend said.

Three outcomes, three different sentences:

- **confirmed** — the backend says Pro.
- **pending** — came back from checkout, receipt has not landed. The plan still reads *Free*, a
  banner sits beside it, and **the Subscribe button is removed** so nobody concludes the payment
  failed and pays twice.
- **unchanged** — a manual recheck that found nothing new. Deliberately different copy.

The `?checkout=return` marker is stripped from the URL immediately, so a reload or a shared link
cannot replay a "just purchased" state.

## Configuration required before switching on

| Variable | Purpose |
|---|---|
| `WEB_BILLING_PRODUCT_ID` | RevenueCat product identifier, mirroring `com.slpcommand.pro.monthly` |
| `WEB_BILLING_PURCHASE_URL` | The Web Purchase Link. **https only.** Never reaches the browser |
| `WEB_BILLING_DISPLAY_PRICE` | Optional. Absent → the checkout states the price and this page does not |
| `WEB_BILLING_PERIOD` | Optional, and only rendered alongside a price |
| `REVENUECAT_WEBHOOK_SIGNING_SECRET` | Backend. Once set, a valid signature becomes **required** |

No price is written into any component. If the offer is unconfigured there is no offer — the
product does not guess.

## Rollout

1. Deploy with `web_billing_enabled = false` (current state).
2. Configure RevenueCat Billing against the Spanish Stripe account; enable Stripe Tax.
3. Set `REVENUECAT_WEBHOOK_SIGNING_SECRET` on Render and in the RevenueCat dashboard.
4. Sandbox: purchase → `INITIAL_PURCHASE` with `store: RC_BILLING` → `user_plans` → Pro on web
   **and** iOS. Then replay the event and confirm it is a no-op.
5. Sandbox lifecycle: renewal, cancellation-with-access-to-expiry, expiration, refund, billing
   issue.
6. Legal: Stripe into `subprocessors.html`, Terms §10, Privacy, Cookie Policy.
7. Confirm the iOS app still links nowhere near web checkout (guideline 3.1.3, outside the US
   storefront).
8. Enable for internal accounts, then `rollout_percent`.

**Rollback is flag-off.** The entry point disappears; the webhook keeps honouring purchases
already made; nobody who paid loses access.

---

## Pre-sandbox certification audit (2026-08-21, second pass)

### BUG-1 (fixed) — the buyer was identified by an editable cookie

`/api/billing/checkout` took the App User ID from `slp_uid`. That cookie is
written at login and **never checked against the session it claims to
describe**; `httpOnly` keeps page scripts out of it but not the person at the
keyboard, who can edit it in DevTools or send their own `Cookie:` header.

A signed-in learner could therefore point `slp_uid` at another account's UUID
and have their own payment create a subscription there. They would be paying
for a stranger rather than stealing from one — self-harm, not privilege
escalation — but it is still a real charge landing on the wrong account, an
entitlement nobody can explain, and a refund nobody can reconcile. It also
falsified the comment claiming the browser "cannot choose" an identity: a
cookie is something the browser sends.

**Fix.** The identity now comes from the access token's `sub` claim
(`lib/server/identity.ts`), and the token is proved real by an authenticated
call to the backend (`allowRefresh: false`, so no rotation mid-request) before
that id is used. `slp_uid` is kept only as a cross-check: if the two disagree,
the request is refused. Signature verification stays where the signing key is —
at Express — which is why the probe call exists at all.

Locked by `tests/unit/checkoutIdentity.test.ts` and two E2E cases, including one
that edits `slp_uid` to a victim UUID and asserts the response contains neither
a checkout link nor the victim's id.

### BUG-2 (fixed) — two shared-secret billing routes were reachable by policy

`MONETIZATION-ENTITLEMENT-AUDIT-001` added `POST /api/admin/billing/manual-grant`
(which can grant a plan) and `GET /api/admin/billing/webhook-secret-fingerprint`
while the web proxy still relied on its blanket `/api/admin/` allow. Neither was
exploitable — `buildUpstreamHeaders` never forwards `x-admin-secret`, so Express
answers 403 — but they were reachable *by policy*, and the existing
`billing/reconcile` deny exists precisely to prevent that. Both are now denied by
name.

### GAP-1 (documented, not fixed) — no ordering guard on a late EXPIRATION

`apply_billing_plan_transition` is idempotent (unique `event_id`, matching
`external_reference`, already-free no-op) and race-safe (row lock), but it has
**no event-ordering guard**. The sequence that bites:

1. a subscription lapses → `EXPIRATION` is sent, and its delivery fails;
2. the learner resubscribes → `INITIAL_PURCHASE` lands, plan is `pro`;
3. RevenueCat retries the `EXPIRATION` (up to 80 minutes later) → it succeeds.

The retry closes the new `pro` row and inserts `free`. The 6-hourly sweep only
ever degrades, so the learner stays Free until their next `RENEWAL`.

Rare, and self-healing at the next renewal, but real. The proposed guard is one
condition — *an `EXPIRATION` may not end a period whose `expires_at` is still in
the future* — and it belongs in the SQL function. It is **not implemented here**
because it means changing a hardened billing function that cannot be tested
without a database, and the failure mode does not justify an untested migration.
**Pre-production item, owned by the backend.**

### GAP-2 (documented) — `TRANSFER` does not move a plan

`TRANSFER` (transactions moved between App User IDs, e.g. a restore on a device
signed into a different SLP account) is not in the event map, so it is logged as
unhandled and nothing changes. Neither the losing nor the gaining account is
adjusted. Left alone deliberately: RevenueCat's transfer semantics depend on the
dashboard's transfer-behaviour setting, which has not been decided, and guessing
it would be worse than the current honest no-op. **Decide the setting before
sandbox, then map the event.**

### Verified clean, no change needed

- **Kill switch isolation.** `web_billing_enabled` appears in exactly four
  places: the decoder, the type, the `/subscription` page and the checkout
  route. Nothing in the entitlement path. Off cannot revoke anything.
- **Model B.** Unchanged by Q4. The checkout never writes plan state; the return
  path only re-reads. The full tampering suite still passes.
- **Idempotency.** A duplicate `event_id` is a no-op inside the same transaction
  as the transition, so a retry after a failure reprocesses rather than being
  swallowed.
- **iOS.** No link, CTA or copy anywhere in the app points at web checkout, and
  `com.slpcommand.pro.monthly` is still the live IAP — so guideline 3.1.3(b) is
  satisfied and 3.1.3's linking restriction is not engaged.
- **`billing 2.js`** — untracked, not gitignored, byte-identical to the committed
  `billing.js`, referenced by no import, script or test, and the import-closure
  test passes without it. A macOS duplication artifact dated 17 Aug. **Deleted.**

## Known risks

- **No sandbox run yet.** Everything below the provider boundary is tested; the provider
  boundary itself has never been crossed with a real RevenueCat account.
- **Signature verification is untested against a real delivery.** The HMAC is proven against
  vectors we generate; RevenueCat's actual header has not been seen by this code.
- **RevenueCat Billing is unavailable in India and does not support B2B.**
- **The 1% basis is confirmed only from community documentation.** Contractual.
