# PR-20 — Speaking Coach desktop (Phase 11)

**Date:** 2026-08-21
**Status:** implemented on `feature/slpcommand-web-platform`. Not deployed, not pushed.
**Definition:** master plan PR Plan, row 20 — `feat: Speaking Coach desktop` — "(only after 19 go)". Contains no iOS-Safari-CONFIRMED claim. Review focus: pre-flight order; token not logged.
**Gate:** PR-19 = GO on live desktop Chrome evidence (`SLP-COMMAND-PR19-SPIKE.md`).

---

## What already existed (PR-19), and was reused unchanged

| Module | Role in PR-20 |
|---|---|
| `lib/coach/api.ts` | readiness / mission / balance / consent / session start / session status |
| `lib/coach/errors.ts` | `mapCoachStartError` + `COACH_START_COPY` — the master plan's start-error map |
| `lib/coach/preflight.ts` | `canAuthorizeCoachSession` — engine, then mic, then POST |
| `lib/coach/session.ts` | session-start / status decode, `pollCoachSession` (10 × 2 s) |
| `lib/coach/transcript.ts` | message classification, ≥6-word substantial-turn counting |
| `lib/coach/token.ts` | `redactToken`, storage-safety probe |
| `lib/server/proxyPolicy.ts` | the six learner coach routes allowlisted; webhook 410 |
| `components/coach/CoachVisualFoundation.tsx` | the orb + turn-state language |

No allowlist change was needed: PR-19 already opened exactly the routes the product Coach uses.

## What PR-20 added

**Contract gaps closed.** `decodeCoachSessionStart` silently discarded `sessionPlan`, and `decodeCoachSessionStatus` reduced the debrief to a `hasResult` boolean. Both are now decoded (`lib/coach/plan.ts`, `lib/coach/result.ts`), which is what made a phase clock and a real debrief possible at all. `GET /coach/mission` now also decodes `plan`, `availableMinutes`, `includedMinutes`, `purchasedMinutes`.

**The orchestration, as pure functions** (`lib/coach/clock.ts`):

- Phase clock — one 1 s tick. On crossing a boundary the agent gets
  `[Lesson moves on] {label}: {goal}`, plus `Change to a genuinely new situation now.` for `transfer`, plus `Do not mention this instruction or announce any phase.` Byte-compatible with the shipped iOS engine (`CoachEngineElevenLabs.advancePhase`).
- The first phase is never announced — the conversation already starts there.
- The guard is on what the **agent** was told (`announcedPhaseId`), not on what the screen shows, so a re-render can never resend an update.
- Scenario rotation — substantial learner turns (≥6 words, role `user`, final) counted against `sessionPlan.maxSameScenarioExchanges`; one nudge per window, restating the server's own rotation rule. Off in exam mode, where the field is `null`.
- A failed contextual update never ends the call (`sendContextualUpdateSafely`).

**Product surfaces:**

- `app/(app)/speaking/coach/page.tsx` — auth-guarded, `force-dynamic`.
- `components/coach/CoachPreSession.tsx` — objective, rationale, session arc, both minute pools by name, consent, pre-flight, start-error map, dead ends that name recorded Speaking Practice.
- `components/coach/CoachSession.tsx` — live: SDK transport, countdown, phase clock, rotation, teardown, poll.
- `components/coach/CoachDebrief.tsx` — the Phase-6 debrief, in the product's existing `.assessment` language.
- Speaking hub gains a `Converse · AI Coach` destination, shown **only** when `GET /coach/readiness` reports the flag on and a provider configured. Fails closed.

**Consent.** `lib/coach/consent.ts` carries the shipped iOS text verbatim at `policyVersion: coach-consent-1.0.0`, so a web grant and an iOS grant mean the same thing. The backend still hardcodes `source: "ios"` on the row — an existing backend follow-up, not patched from this repo (KD19). `appVersion` is `"web"` on the product path.

**Desktop-only.** `lib/coach/environment.ts` blocks phones and iPadOS (including its desktop UA) with a real screen, not a greyed-out button. Nothing here claims any browser as CONFIRMED.

## Defects found and fixed on the way

| Defect | Fix |
|---|---|
| `.app-shell .btn-primary` (product.css) beat `.btn:disabled` (design-system.css) on both order and specificity — **every disabled primary button in the authenticated product rendered as an enabled one** | `.app-shell .btn:disabled` / `:disabled:hover` added in product.css |
| Task bar hard-coded "Practice" for anything not an exam, so History read as Practice | `exam ? "Exam" : mode`; exam styling and clock still key off `isExam()` |
| PR-19's placeholder Coach copy used exam vocabulary ("examiner", "silence is part of the exam") and asserted that hiding the tab ends the conversation — which the PR-19 matrix lists as UNVERIFIED | Rewritten in teaching vocabulary; the tab line now asks the learner to stay rather than predicting behaviour |

## Still UNVERIFIED — deliberately not claimed

Unchanged from the PR-19 matrix, and **not** advanced by this PR:

| # | Cell | Why it stays open |
|---|---|---|
| 2 | Desktop Safari | Never run live. The product does not block it and does not claim it. |
| 10 | CSP connect-src hosts | The app sets **no** CSP at all today. Opening one without a host capture would break the call; the spike's `startHostCapture` is still there to take that capture. |
| 12 | Tab hidden 10 s | Not observed. No copy claims what happens. |
| — | Safari iOS / Chrome iOS | Out of scope by design: mobile gets the desktop-only screen. |

The PR-19 spike page (`/spike/coach`) is **kept**. It is the diagnostic harness for exactly those open cells — SDK inspection, host capture, forced-failure and tab-hide instrumentation — and remains flag-gated, `noindex`, and unlinked from the product.

## Live-path certification (2026-08-21, second pass)

The conversation itself was replayed deterministically against a controllable fake of the
SDK — see **`SLP-COMMAND-PR20-LIVE-CERTIFICATION.md`**. It found and fixed two real
defects (**L1** a single growing learner utterance could trip the rotation limit
mid-sentence; **L2** a session that never connected and never errored left the learner on
a spinner after being charged), plus a minor effect-dependency issue. Both regressions were
confirmed to fail against the pre-fix code.

## Manual validation still required before enabling in production

The live circuit cannot be tested without a real microphone, a real WebRTC hop and real minutes. Automated coverage stops at everything that must hold *before* a minute is spent. On desktop Chrome with a real account:

1. `/speaking/coach` → objective, arc and both pools match `GET /coach/mission`.
2. Start → mic prompt appears **before** any `POST /session` in the network panel.
3. Agent speaks, learner speech is transcribed, turn state flips on the orb.
4. Cross a phase boundary → the agent's next turn changes; the transcript shows no phase name spoken.
5. Force a failed contextual update → the call stays up.
6. End session → poll → debrief renders the engine's own strengths/growth areas with verbatim evidence.
7. Network panel: the conversation token appears only in the `POST /session` response, never in a log, never in storage.

## Tests

| Gate | Result |
|---|---|
| `tsc --noEmit` | PASS (0 errors in source; the only output is stale duplicated files inside the gitignored `.next/types/`) |
| `eslint .` | PASS — 0 errors, 3 pre-existing warnings, none in Coach code |
| `vitest run` | PASS — 29 files, 222 tests (was 173) |
| `next build` | PASS — `/speaking/coach` 5.0 kB / 270 kB first load |
| `playwright test` | PASS — 49 tests (was 39) |
| Visual QA | `docs/visual-qa/speaking-coach-wide.png`, `speakingcoach-mobile.png`, `speaking-coach-desktop-only-mobile.png`, `speaking-home-wide.png` |
| Live session orchestration | PASS — 22 deterministic tests replaying a full 6-minute session (`tests/unit/CoachSession.test.tsx`) |
| Pre-flight order in a real browser | PASS — a denied microphone never issues `POST /session`; observed order is mic → session |
| Token through a real start attempt | PASS — absent from DOM, both storages, every console message and every page error |
| Live conversation with a human | **OPEN** — the audio itself, and whether a phase relay changes the teaching. Runbook above. |

`tests/e2e/speaking.spec.ts` previously asserted the product never links `/speaking/coach`. That was PR-19's invariant and PR-20 supersedes it; the test now asserts what is still true — recorded practice leads, the provider is never named on the hub, and the spike is never linked from product.
