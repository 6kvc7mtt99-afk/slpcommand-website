# Phase 0 implementation status

Updated as PRs land on `feature/slpcommand-web-platform`. No production deploy. No push.

## PR-00 — Cloudflare / OpenNext spike — GREEN

Verified 2026-08-16 against local Workers runtime (`opennextjs-cloudflare preview` on :8787).

| Check | Result |
|---|---|
| Next.js 15.5.23 boots / `next build` | PASS |
| `@opennextjs/cloudflare` 1.20.2 `build` | PASS — worker at `.open-next/worker.js` |
| Wrangler 4.123.0 local ready | PASS |
| `Set-Cookie` HttpOnly + Secure + SameSite=Lax | PASS (`slp_spike=1; Path=/; Secure; HttpOnly; SameSite=lax`) |
| Route handlers | PASS |
| `AbortSignal.timeout` | PASS (`TimeoutError` in ~1s) |
| Server-side fetch to Render `/api/health` | PASS on retry (299ms). First call 15s timeout = Render cold start, not adapter failure |
| 15 public routes return 200 | PASS |
| `/:path*.html` → extensionless | PASS (308 `/privacy.html` → `/privacy`) |
| Production deploy | **not run** (by design) |
| Secrets in git | none (`.env.local` / `.dev.vars` gitignored) |
| Host switch to Vercel | **not taken** |

## PR-07 — Home v2 dashboard — implemented

Verified 2026-08-16 locally (`next dev` :3000 + Vitest + Playwright). No production deploy. No push.

| Check | Result |
|---|---|
| `tsc --noEmit` | PASS |
| Vitest (23) | PASS — DTO decode, `passProbability` null, progress ring hide, 5+0+2 budget, HomeDashboard render |
| Playwright dashboard gate | PASS — document GET `/dashboard` is 307 `/login`, not 400 |
| Anonymous `/dashboard` | PASS — 307 in ~80ms (page-level cookie guard, no Express fan-out) |
| Login credential copy | PASS |
| Home v3 / `coach/mission` | not called |
| Logged-in Free/Pro / one endpoint 500 | **not run** — no learner session in this environment |

`/dashboard` is Home v2: 5 SSR payloads (`feature-flags`, `entitlements`, `progress`, `session/today`, `activity/streak`) + 0 hydrate echo of those five + lazy `achievements` / `recent`. `passProbability` is always treated as null. AppGate no longer refetches entitlements on mount.

## Remaining PRs in this train

- PR-01 scaffold + tokens + tests — implemented
- PR-02 absorb 15 public pages — implemented
- PR-03 secure proxy — implemented
- PR-04 Cookie Policy — implemented
- PR-05 auth + onboarding — implemented
- PR-06 app shell + entitlements — implemented
- PR-07 Home v2 dashboard — implemented
- PR-08 Reading practice — implemented
- PR-09 Reading exam v2 — implemented
- PR-10 Listening practice — implemented
- PR-11 Listening exam — implemented
- PR-12 Writing practice + history — implemented
- PR-13 Writing exam — implemented
- PR-14 Progress + Profile + export/delete — implemented
- PR-15 MVP hardening — implemented
- PR-16 admin migration — implemented
- PR-17 Academy + Intelligence + Writing tools — implemented
- PR-18 Speaking practice/exam — implemented
- PR-19 ElevenLabs Coach spike — GO (`SLP-COMMAND-PR19-SPIKE.md`)
- PR-20 Speaking Coach desktop — implemented (`SLP-COMMAND-PR20-COACH.md`), live path certified (`SLP-COMMAND-PR20-LIVE-CERTIFICATION.md`)
- PR-21 web billing paywall — **blocked on Q4** (`SLP-COMMAND-PR21-BILLING.md`)

## PR-15 — MVP hardening — implemented

CI workflow, optional Sentry init with header scrubbing, GET transient retry, axe on login, CSRF/legacy 410 checks, and mocked authenticated Playwright (CI / `MOCK_BACKEND=1`). Local Playwright: 10 passed, 2 auth specs skipped without the mock backend.

## PR-08 — Reading practice — implemented

Verified 2026-08-16. `tsc` + `next build` PASS. Vitest 32. Playwright gate 4/4 including `/reading` and `/reading/practice` 307.

One GET `/api/reading/passage` per intent, client UUID reused across Strict Mode remounts, one question (N accepted, 4 not assumed). `/reading/next` remains 410. Exam is a stub only.

See the implementation report in the final session note. No production deploy. No push.

## PR-20 — Speaking Coach desktop — implemented

Verified 2026-08-21 locally. No production deploy. No push.

| Check | Result |
|---|---|
| `tsc --noEmit` | PASS (0 source errors) |
| `eslint .` | PASS — 0 errors, 3 pre-existing warnings |
| Vitest | PASS — 222 tests (was 173) |
| `next build` | PASS — `/speaking/coach` 5.0 kB |
| Playwright | PASS — 49 tests (was 39) |
| Visual QA | Coach wide / mobile / desktop-only captured under `docs/visual-qa/` |
| Live session orchestration | PASS — replayed deterministically; 2 real defects found and fixed (`SLP-COMMAND-PR20-LIVE-CERTIFICATION.md`) |
| Live conversation with a human | **open** — audio, and whether a phase relay changes the teaching. Runbook in the certification doc. |

`/speaking/coach` is the product Coach: server-designed session plan, a one-second phase clock that relays each phase's goal to the agent exactly once, scenario rotation against `maxSameScenarioExchanges`, teardown + 10 × 2 s poll, and the Phase-6 debrief. The Speaking hub offers it only when `GET /coach/readiness` says the flag and provider are on, and fails closed. Phones get a desktop-only screen. The conversation token never enters state, props, storage or a log line.

Desktop Safari, CSP hosts and the tab-hide check remain **UNVERIFIED** and are not claimed. The `/spike/coach` harness is kept for exactly those captures.

## PR-21 — web billing paywall — blocked

Q4 (RevenueCat Web Billing vs Stripe direct) is unanswered, and Phase 12 additionally needs a backend webhook, a new subprocessor and legal updates, plus Q5's RLS closure. Not started, by design. The Model B interim behaviour the master plan specifies is already implemented and is now locked by a regression test. See `SLP-COMMAND-PR21-BILLING.md`.
