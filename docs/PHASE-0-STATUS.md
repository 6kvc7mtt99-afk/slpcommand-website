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

## Remaining PRs in this train

- PR-01 scaffold + tokens + tests — implemented
- PR-02 absorb 15 public pages — implemented
- PR-03 secure proxy — implemented
- PR-04 Cookie Policy — implemented
- PR-05 auth + onboarding — implemented
- PR-06 app shell + entitlements — implemented

See the implementation report in the final session note. No production deploy. No push.
