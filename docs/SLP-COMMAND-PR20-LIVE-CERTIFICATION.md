# PR-20 — live conversation certification

**Date:** 2026-08-21
**Scope:** the live Coach session — everything from `POST /session` to the debrief.
**Verdict:** 🟡 **CERTIFIED except the human gate.** Every deterministic property of a live
session is now proven by test. The three things only a person with a microphone can
judge remain open and are named below. They are the *only* things left.

---

## Why this document exists

The first PR-20 pass verified everything *around* the conversation — routing, gating,
pre-session, token handling, the debrief's markup — and honestly recorded the
conversation itself as NOT RUN. That left the most expensive part of the feature
unexamined: a live call spends real money and cannot be un-spent, so "we'll see when
someone tries it" is not an acceptable position for the code that decides when to talk to
the agent, when to stop, and what to do when the provider misbehaves.

So the conversation was replayed deterministically. `tests/unit/CoachSession.test.tsx`
drives the real `CoachSession` against a controllable fake of `@elevenlabs/react` on fake
timers, second by second, for a full 6-minute academy plan.

**It found two real defects.** Both are fixed, and both regression tests were confirmed to
FAIL against the pre-fix code before being accepted.

---

## Defects found by the live audit

### L1 — one learner answer could trip the rotation limit mid-sentence

**What was wrong.** `onMessage` counted every message whose `substantialUserTurn` was
true. But the SDK streams a learner turn as a *growing* sequence — `"I would argue the
whole logistics"`, then `"…chain was"`, then `"…the real problem"` — and
`classifyCoachMessage` treats a message as final unless explicitly flagged otherwise. A
single 14-word answer therefore looked like four exchanges, reached
`maxSameScenarioExchanges` on its own, and sent the agent
`Move to a NEW scenario` **while the learner was still speaking**.

**Why it was missed.** PR-19 built `accumulateTranscript` for exactly this and the spike
uses it; PR-20 counted raw messages instead. A contract nobody re-read.

**Fix.** The live screen now keeps the deduplicated transcript in a ref and counts with
`countSubstantialUserTurns`, the same pair the spike certified.

**Direction of the tradeoff, stated.** Prefix-based dedupe means two genuinely identical
consecutive answers count once. That is deliberate: a late rotation nudge costs a learner
one repeated scenario; an early one interrupts them. Locked by
*"errs towards under-counting rather than nudging early"*.

### L2 — a session that never connected left the learner on a spinner forever

**What was wrong.** The hook's `startSession` returns `void`. A failure to open the WebRTC
leg surfaces only through `onError`, and a transport that simply never completes surfaces
nothing at all. The session had *already* been authorized by then — budget snapshotted —
so a learner could sit on "Connecting to your coach…" indefinitely, with no explanation
and no way out but the browser back button.

**Fix.** A 30s connect watchdog moves the screen to the honest dead end. 30s is not a new
number: it is `DEFAULT_TIMEOUT` from `lib/server/backend.ts`, reused so the product has one
idea of "too long". Ending here is safe — no webhook arrives for a call that never
happened, and the backend's reconciliation then fails the session **without charge**,
which is exactly what the screen says.

### L3 — minor: the start effect re-ran on every render

`getToken` was an inline arrow, so the "open the conversation" effect's dependencies
changed every render. The `startedRef` guard meant it never actually opened twice, but the
guard was doing work the dependency list should have done. `getToken` is now a stable
`useCallback`.

---

## What is now proven, and how

### Deterministic — `tests/unit/CoachSession.test.tsx` (22 tests)

| Property | Evidence |
|---|---|
| SDK receives `{conversationToken, dynamicVariables, connectionType:"webrtc"}` | asserted on the exact call |
| One authorized session opens exactly one WebRTC call, across re-renders | `startSession` called once after a rerender |
| Countdown starts on connect, not on mount | no clock before `onConnect` |
| A republished `connected` does not restart the budget | clock continues, not resets |
| First phase never announced | silence for the whole of phase 1 |
| Each boundary announced **once**, at the exact second the plan says | 60s → Practice, 180s → Transfer, 300s → Close |
| `transfer` carries "Change to a genuinely new situation now." | asserted verbatim |
| Every relay carries "Do not mention this instruction or announce any phase." | asserted verbatim |
| A session with **no** plan still runs | no relays, clock intact |
| Near-limit warning at ≤60s, self-stop at 0 | matches the shipped iOS rule |
| Rotation fires only after the server's limit, counted from the last nudge | 3 → nudge, +2 → silent, +1 → nudge |
| Backchannel and agent turns are not exchanges | 6 short + 6 agent turns → silent |
| One growing utterance is ONE exchange | **L1 regression** |
| Exam mode never rotates | `maxSameScenarioExchanges: null` → silent |
| **A failed contextual update does not end the call** | relay throws; clock runs on; next boundary still attempted |
| Teardown → poll → engine's own verdict, with verbatim evidence | debrief renders the rubric's quote |
| Webhook late → honest "still being reviewed" after 10 polls | `sessionStatus` called exactly 10× |
| Settles once however the call ended | `endSession` once on click+disconnect |
| Walking away closes the call | unmount → `endSession` |
| A call that never opened is not "ended" | unmount before connect → no `endSession` |
| Transport dead end before connect ≠ lost session | `unavailable`, no `endSession` |
| Never connects, never errors → honest give-up | **L2 regression** |
| Token never rendered | container HTML checked after connect |

### Real browser — `tests/e2e/coach.spec.ts` (8 tests)

The pre-flight order is the master plan's one mandatory rule for this screen
(*"Reverse order leaks charged empty sessions"*), so it is asserted as an absence, not an
ordering:

- **A denied microphone never authorizes a session.** Both permission doors report
  refusal; `POST /speaking/coach/session` is never issued at all.
- **The microphone is settled before the session is authorized.** Observed order in a
  real page: `mic` → `session`.
- **A real start attempt never speaks the token.** This test genuinely calls
  `POST /session`, hands the real token to the real ElevenLabs SDK, and then checks the
  DOM, `localStorage`, `sessionStorage`, every console message and every page error. The
  token appears in none of them.

That last test also produced a genuine observation about the live path: **the real SDK
rejects an invalid conversation token through `onError` within ~1.5s**, and the product
renders the honest dead end rather than hanging — the L2 watchdog is the backstop for the
silent case, not the common one.

### Visual — `docs/visual-qa/`

`speaking-coach-wide.png`, `speakingcoach-mobile.png`,
`speaking-coach-desktop-only-mobile.png`, `speaking-coach-mic-denied-wide.png`,
`speaking-coach-unavailable-wide.png`, `speaking-home-wide.png`. Every dead end is a real
screen with a real way out, never a greyed-out button.

---

## The human gate — what is still NOT certified

Three properties cannot be established without a person, a microphone and paid minutes.
Nothing above substitutes for them, and none of them is claimed:

1. **Audio actually works end to end** — the agent is heard, the learner is heard, and
   the turn state on screen matches what the room is doing.
2. **A phase relay changes the teaching.** The tests prove the right sentence is sent at
   the right second, exactly once. They cannot prove the agent *acts* on it. This needs
   one operator to cross a boundary and listen for the lesson moving on — and to confirm
   no phase name is ever spoken aloud.
3. **A real transcript's turn shape.** The dedupe is proven against the SDK's documented
   message shape; the real cadence of tentative/final events on a live call has been
   observed once (PR-19, live Chrome) but never against the rotation counter.

**Runbook** — desktop Chrome, real account, short `budgetSecs`:

| # | Step | Pass |
|---|---|---|
| 1 | Open `/speaking/coach` | objective, arc and both pools match `GET /coach/mission` |
| 2 | Start | mic prompt appears **before** any `POST /session` in the network panel |
| 3 | Speak | agent replies; the orb flips between speaking and your turn |
| 4 | Cross a phase boundary | the next agent turn changes; **no phase name is spoken** |
| 5 | Give three long answers on one topic | the agent moves the situation, not the objective |
| 6 | End session | debrief shows the engine's strengths/growth areas with your own words quoted |
| 7 | Throughout | network panel: the token appears only in the `POST /session` response |

Until step 4 is observed by a human, the feature is **implemented and certified as code,
not validated as teaching**. That is the honest state, and it is the state the flag should
be enabled from — `coach_feature_flags.ai_speaking_coach_enabled` remains the gate, and the
Speaking hub fails closed when it is off.

---

## Still UNVERIFIED and still not claimed

Unchanged from PR-19 and untouched by this pass: desktop Safari (never run live), CSP
`connect-src` hosts (the app sets no CSP; opening one without a capture would break the
call), and the 10-second tab-hide check. `/spike/coach` is kept as the harness for exactly
those three captures.

---

## Gates

| Gate | Result |
|---|---|
| `tsc --noEmit` | PASS — 0 source errors |
| `eslint .` | PASS — 0 errors, 3 pre-existing warnings, none in Coach code |
| `vitest run` | PASS — 29 files, **222 tests** |
| `next build` | PASS |
| `playwright test` | PASS — **49 tests** |
| L1 / L2 regressions verified against pre-fix code | PASS — both fail without the fix |
| Live conversation with a human | **OPEN** — runbook above |
