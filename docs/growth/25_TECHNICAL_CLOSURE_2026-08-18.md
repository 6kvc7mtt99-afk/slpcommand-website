# 25 — Technical closure

**Date:** 18 August 2026 · **Scope:** close the engineering loop on the marketing
infrastructure. No new pages, no new content, no new dependencies on an external
marketing framework.

Predecessors: `22` (implementation log), `23` (Marketing OS decision),
`24` (chairman audit). This file records only what changed in the closure pass.

## The four open items, closed

### 1. ESLint was broken — root cause was a version mismatch

`npx eslint .` died with `TypeError: Converting circular structure to JSON`
before linting a single file.

**Cause.** `package.json` carried `eslint-config-next@^16.3.1` against
`next@15.5.23`. eslint-config-next is released in lockstep with Next, and v16
ships **native flat config arrays**. `eslint.config.mjs` routed them through
`FlatCompat.extends()`, which expects eslintrc-style *string* configs and
JSON-stringifies what it is given. The v16 config holds live plugin objects, and
those are circular.

**Fix.** Align the dependency: `eslint-config-next@15.5.23`, matching
`next@15.5.23` exactly. `eslint.config.mjs` is unchanged from Grok's original
apart from two added ignores — it was always correct for the v15 config it was
written against.

**Effect.** 21 problems under the mismatched v16 ruleset (16 of them from
`eslint-plugin-react-hooks@7`, a React-Compiler-era ruleset that does not apply
to this framework version) → **0 errors, 2 warnings**.

Additional fixes required to reach zero errors:

| File | Rule | Fix |
|---|---|---|
| `next-env.d.ts` | `@typescript-eslint/triple-slash-reference` | Added to `ignores`. Next generates it on every build and it carries a "should not be edited" banner |
| `lib/api/support.ts` | `@next/next/no-assign-module-variable` | Renamed a local `const module` to `moduleName`. Pure rename; the binding shadowed the CommonJS `module` object, which can break bundling |
| `components/speaking/SpeakingExam.tsx` | `react-hooks/rules-of-hooks` | See below — a real crash |

**`npx eslint .` now exits 0.** It is now a blocking step in CI, which never ran
lint at all before.

### 2. A guaranteed crash in the Speaking exam

Found by the lint fix, not by the marketing work, and worth recording on its own.

`SpeakingExam` initialises `phase` to `"gate"` and returns early at what was
line 44. A `useEffect` sat *after* that early return. So:

- render 1 (`phase === "gate"`) → early return → **6 hooks**
- user accepts the disclaimer → `setPhase("consent")` → render 2 reaches the
  effect → **7 hooks**
- React: *"Rendered more hooks than during the previous render"* → crash

That is the first interaction in the Speaking exam, not an edge case.

**Fix.** Hoisted the effect above the early return so hook order is
unconditional. Its body already opens with `if (phase !== "consent") return;`,
so the move is behaviour-preserving. Approved by the founder before the edit,
since this is product code and outside the marketing mandate. Covered by
`tests/e2e/speaking.spec.ts`, which passes.

### 3. E2E was non-deterministic — it ran against `next dev`

Failure count scaled with parallelism: **19 failures at 5 workers, 11 at 2, 2 at
1**, with tests passing on retry. The dev server compiles each route on first
request, so route-walking tests raced a 30-second timeout on a cold `.next`.

**Fix.** `playwright.config.ts` now builds and serves a production server
(`npx next build && npx next start`). `PLAYWRIGHT_DEV_SERVER=1` keeps the old
behaviour for local iteration.

**Effect.** **31/31 passing at 5 workers, twice consecutively, in ~31s.**

### 4. The CSRF test failure was a test-environment bug, not a product bug

`proxy-csrf` → "shared-secret admin generate routes stay gone" expected 410 and
got 403.

**Cause, measured rather than assumed.** Middleware was temporarily instrumented
against a production server and restored byte-identically (hash verified). It
reported:

```
_debug_nextUrlOrigin : http://localhost:3121
_debug_sentOrigin    : http://127.0.0.1:3121
_debug_host          : 127.0.0.1:3121
```

`middleware.ts` allows `request.nextUrl.origin`, and **Next normalises that to
`localhost` even when the Host header is `127.0.0.1`**. Playwright's base URL was
`127.0.0.1`, so every state-changing `/api` request was rejected before reaching
the behaviour under test. Confirmed both ways: an Origin of
`http://localhost:3121` returns the expected 410; `http://127.0.0.1:3121`
returns 403.

**Fix — in the test environment only.** `middleware.ts` is untouched and verified
clean against the committed tree. The E2E origin moved to `localhost`, with
`tests/e2e/baseUrl.ts` as the single source of truth shared by the config and
every spec.

This also fixed a second, larger problem it had been masking: six spec files
seeded auth cookies at a hardcoded `http://127.0.0.1:3000`. Cookies set for
`127.0.0.1` are never sent to `localhost`, so ten authenticated tests were
landing on the login page. All six now read the shared constant.

`COACH_SPIKE_ENABLED=1` was added to the test server env: `isCoachSpikeEnabled()`
defaults **off** under `NODE_ENV=production`, and the spike specs exist to test
that surface. The production default is unchanged.

## Language handling — reviewed, deliberately unchanged

`/es/*` pages render under a root `<html lang="en">` with content scoped by
`<article lang="es">`.

Both available fixes were assessed and rejected as disproportionate:

- `headers()` in the root layout to vary `lang` forces **every** page to dynamic
  rendering, losing static generation for all 70 routes — a real TTFB and cost
  regression on Cloudflare Workers.
- Splitting into multiple root layouts via route groups is a large restructure of
  a production app.

Both trade a materially worse architecture for a secondary signal. The primary
signals are correct and verified in rendered HTML: `hreflang` en/es/x-default
reciprocal on both pairs, `og:locale: es_ES`, `Article.inLanguage: es`, canonical
per URL, and Spanish-language OG cards. **Kept as the better engineering
tradeoff.**

## Verification

Every command below was executed; results are exact.

| Command | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npx eslint .` | **exit 0** — 0 errors, 2 warnings |
| `npx vitest run` | **143 passed / 22 files** |
| `npx next build` | exit 0 — 70 static pages |
| `npx playwright test` | **31/31 passed**, 5 workers, production server |

Rendered-HTML checks against `next start`: unique title and description,
canonical, `og:image` + `twitter:image` (1200×630) on home, EN authority, ES
authority, guide and legal pages; reciprocal hreflang with `x-default` on both
language pairs; JSON-LD `Organization`/`WebSite`/`SoftwareApplication` on home
and `Article`/`FAQPage`/`BreadcrumbList` on authority pages; `robots.txt`,
`llms.txt`, `sitemap.xml` all 200. Sitemap: 27 URLs, no duplicates, and **no URL
blocked by robots.txt** (checked prefix by prefix).

Claims guard, re-verified by injection: 8 forbidden claims — official NATO app,
NATO-approved, endorsed by BILC, used by NATO, best, only dedicated, guaranteed
pass, a fabricated "94% chance", and Android — were caught by **9 rules**.
10 honest denials ("there is no official NATO exam", "Not available on Android",
"no está afiliado a la OTAN") still pass. Both directions are now locked by
regression tests rather than checked by hand.

## Remaining lint warnings (not errors, not marketing)

| File | Warning |
|---|---|
| `components/spike/CoachSpike.tsx` | `react-hooks/exhaustive-deps` — unnecessary deps in a `useMemo` |
| `components/writing/WritingTools.tsx` | unused `decodeOrchestrator` import |

Both are pre-existing product code. Left for a product-scoped pass rather than
edited from a marketing session.
