# PR-19 — ElevenLabs React Coach spike

**Date:** 2026-08-16  
**Verdict:** **PR-19 = GO**  
**Package:** `@elevenlabs/react@1.12.1` (re-exports `@elevenlabs/client@1.18.0`)  
**startSession API:** React hook `startSession(options?: HookOptions) => void` (synchronous, `undefined` at runtime). Client `Conversation.startSession` remains `Promise<VoiceConversation>`.  
**Spike route:** `/spike/coach` (auth required, `noindex`, hidden from product nav). Enabled when `COACH_SPIKE_ENABLED=1` or `NODE_ENV !== "production"`.

Live desktop **Chrome** validation passed on 2026-08-16 against the real backend session contract. Desktop Safari, CSP host capture, and the 10-second tab-hide check remain UNVERIFIED and are **not** required to start PR-20. PR-20 stays desktop-first and must not claim Safari iOS (or desktop Safari) as CONFIRMED.

## Live Chrome evidence (2026-08-16)

Operator ran `/spike/coach` on desktop Chrome with a real conversation token from `POST /api/speaking/coach/session`. Observed:

| Observation | Result |
|---|---|
| Microphone permission and capture | Works |
| WebRTC session connects (`conversationToken` + `dynamicVariables` + `connectionType: "webrtc"`) | Connects |
| Agent speaks | Heard |
| Agent receives user speech | Heard / transcribed |
| Transcript includes user vs agent roles and full utterance text | Present |
| `sendContextualUpdate` mid-call | Next agent turn changed behaviour (not a silent ACK) |
| Forced contextual-update failure | Active session stayed up |
| `endSession()` + `GET /api/speaking/coach/session/:id` poll | Completed successfully |

Safari desktop was not part of this live run.

## GO / NO-GO matrix

| # | Criterion | Result | Evidence |
|---|---|---|---|
| 1 | Desktop Chrome: real conversation starts, mic works, agent speaks, user speech received | **CONFIRMED** | Live Chrome spike, 2026-08-16. Mic, WebRTC connect, agent speech, user speech received. |
| 2 | Desktop Safari: same real-call requirements | **UNVERIFIED** | Not run. Does not block GO. PR-20 must not mark Safari desktop CONFIRMED until a later pass. |
| 3 | Conversation token only from `POST /api/speaking/coach/session` | **CONFIRMED** | `lib/coach/api.ts` `startCoachSession`. Proxy allowlists that POST and 410s the webhook. Live Chrome used this path. |
| 4 | `startSession({ conversationToken, dynamicVariables, connectionType: "webrtc" })` | **CONFIRMED** | Types + spike call + live Chrome WebRTC connect on that triple. |
| 5 | `sendContextualUpdate` reflected in the next agent turn (not a silent ACK) | **CONFIRMED** | Live Chrome: observable behavioural change on the next agent turn. |
| 6 | Transcript richness: user vs agent, stable user text, ≥6-word count | **CONFIRMED** | SDK `MessagePayload` (`role`, `source`, `message`). Live Chrome transcript contained user/agent roles and full text. Rotation helper can count ≥6-word final user turns. |
| 7 | `endSession()` + poll `GET /session/:id` + no leftover open session | **CONFIRMED** | Live Chrome teardown/poll completed successfully. |
| 8 | Forced failed contextual update does not tear down an active call | **CONFIRMED** | Unit tests + live Chrome: forced failure did not terminate the active session. |
| 9 | Exact installed version and `startSession` return type | **CONFIRMED** | `@elevenlabs/react@1.12.1`. Hook `startSession` → `void`. |
| 10 | Network hosts for later CSP | **UNVERIFIED** | Collector exists. Live run did not record the host list. Do not open CSP until a capture. Candidate: `livekit.rtc.elevenlabs.io`. |
| 11 | Token only in memory; never storage / commit / full logs | **CONFIRMED** | `redactToken`; token held in `useRef`; e2e asserts the mock token string is not in the DOM; Sentry already scrubs `token`. |
| 12 | Tab hidden 10s on desktop Chrome and Safari | **UNVERIFIED** | Logger is on the page. Not part of the Chrome live notes. Not a GO blocker. |

## Verdict

**PR-19 = GO** on desktop Chrome evidence.

Do **not** start PR-20 until explicit approval.  
Do **not** start PR-21.  
Do **not** claim desktop Safari, Safari iOS, or CSP hosts as CONFIRMED.

## What shipped (spike only)

- Learner allowlist: readiness, mission, balance, consent, session POST, session GET. Webhook remains 410.
- No product nav, no `/speaking/coach`, no phase clock, no rotation product, no billing.
- Unit tests: 81 passed. `tsc --noEmit` passed. `next build` passed.
- Playwright (isolated mock): spike unauth redirect, noindex, no nav, no raw token, webhook 410, speaking home still has no Coach.
- Live Chrome: real Coach circuit works in the browser.
