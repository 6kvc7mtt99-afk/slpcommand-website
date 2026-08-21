# PR-21 — Web billing paywall (Phase 12) — BLOCKED, not started

**Date:** 2026-08-21
**Status:** 🔴 PENDING. Deliberately not implemented.
**Definition:** master plan PR Plan, row 21 — `feat: web billing paywall`. The "Contains" cell is literally **"(only after Q4)"**. Must not contain a client-side unlock. Review focus: Model B.

## Why it is not implemented

**Q4 is unanswered.** Open Questions, master plan: *"Web billing: RevenueCat Web Billing vs Stripe direct?"* — the table's "Default if unanswered" is a **preference** (*"Prefer RC Web Billing to reuse `process_billing_webhook_event` if the event map fits"*), not a decision. Choosing between them is a human call with a new subprocessor and new legal disclosures attached; picking one here would be inventing the requirement.

**The work is not mostly in this repo.** Phase 12 needs a backend webhook + atomic RPC (RevenueCat or Stripe), a new subprocessor entry, Privacy/Cookie/Subprocessors updates, and closure of the two HIGH RLS findings (Q5, also unanswered). KD19 is explicit: *"Do not modify Express / iOS / Supabase from this repo."*

**Nothing is silently missing meanwhile.** The behaviour Phase 12 replaces is specified in section T and is fully implemented today:

> *"Web until billing ships: a user who already bought on iOS is Pro on web the moment `GET /api/entitlements` says so. Everyone else is Free. Show an honest 'Get Professional in the iOS app'."*

## Audited state — Model B holds

| Requirement | Where | Verdict |
|---|---|---|
| Backend `user_plans` is the only authority | `lib/entitlements.ts` — `isPro` iff `plan.key === "pro"` | ✅ |
| No client-side unlock, grant, trial clock or stored flag | no `localStorage`, no date arithmetic, no `isPro = true` anywhere | ✅ |
| Fail-closed on 404/401/5xx/empty | `interpretEntitlements` → `noPlan` / `error`, never Pro | ✅ |
| Browser cannot reach any billing write | `proxyPolicy` DENY: RC webhook 410, admin reconcile 410; no purchase route allowlisted | ✅ |
| Honest interim CTA | `PlanChip`, `CommercialCard`, `CommercialDialog`, Settings `#plan`, academy locks | ✅ |
| Plan + real per-feature allowances visible | Settings → Plan & usage | ✅ |
| `/subscription` route | reserved in `app/robots.ts` disallow list, never built | ⛔ correct — Phase 12 |
| Purchase rail | none | ⛔ correct — blocked on Q4 |

These invariants are now locked by `tests/unit/entitlements.test.ts` → *"Model B — the client never unlocks"*, so PR-21 cannot weaken them when it does land.

## What unblocks it

1. **Answer Q4** — RevenueCat Web Billing vs Stripe direct.
2. Backend: webhook + atomic RPC, replicating `billing.js` timing-safe compare and the 6 h reconcile.
3. Legal: new subprocessor in `subprocessors.html`, Privacy and Cookie Policy updates.
4. **Q5** — the two HIGH RLS view fixes, owned by the backend, required before public launch.
5. Only then: `/subscription` paywall UI in this repo, with `refreshUntilPro`-style polling (5 reads, never a local grant).
