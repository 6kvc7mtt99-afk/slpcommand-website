# PR-19 — ElevenLabs React Coach spike

**Date:** 2026-08-16  
**Verdict:** **PR-19 = NO-GO**  
**Package:** `@elevenlabs/react@1.12.1` (re-exports `@elevenlabs/client@1.18.0`)  
**startSession API:** React hook `startSession(options?: HookOptions) => void` (synchronous, `undefined` at runtime). Client `Conversation.startSession` remains `Promise<VoiceConversation>`.  
**Spike route:** `/spike/coach` (auth required, `noindex`, hidden from product nav). Enabled when `COACH_SPIKE_ENABLED=1` or `NODE_ENV !== "production"`.

Live Chrome/Safari microphone sessions were **not** executed in this environment (no approved test-account credentials, no operator ears, no Safari driver in CI). The spike page and contracts are in the tree for a human to finish the live cells.

## GO / NO-GO matrix

| # | Criterion | Result | Evidence |
|---|---|---|---|
| 1 | Desktop Chrome: real conversation starts, mic works, agent speaks, user speech received | **UNVERIFIED** | Page exists. No live Chrome call with a real token was run here. |
| 2 | Desktop Safari: same real-call requirements | **UNVERIFIED** | Same. Playwright project is Chromium only. |
| 3 | Conversation token only from `POST /api/speaking/coach/session` | **CONFIRMED** | `lib/coach/api.ts` `startCoachSession`. Proxy allowlists that POST and 410s the webhook. No `agentId` / signed URL path. |
| 4 | `startSession({ conversationToken, dynamicVariables, connectionType: "webrtc" })` | **CONFIRMED** | Installed types: `PrivateWebRTCSessionConfig` requires `conversationToken` and allows `connectionType?: "webrtc"`; `dynamicVariables` is on `BaseSessionConfig`. Spike calls exactly that triple. Combined live token+vars: **UNVERIFIED**. |
| 5 | `sendContextualUpdate` reflected in the next agent turn (not a silent ACK) | **UNVERIFIED** | API is present (`sendContextualUpdate(text): void`). Spike sends `SPIKE_CONTEXTUAL_UPDATE` asking for the words `SPIKE UPDATE RECEIVED`. Behaviour not heard. |
| 6 | Transcript richness: user vs agent, stable user text, ≥6-word count | **CONFIRMED** (SDK contract) / **UNVERIFIED** (live speech) | SDK `MessagePayload` has `role: "user" \| "agent"`, `source`, `message`, `event_id`. User text comes from `user_transcription_event` (final, not tentative). Rotation helper counts ≥6-word final user turns. Live utterances not captured. |
| 7 | `endSession()` + poll `GET /session/:id` + no `session_already_open` leftover | **CONFIRMED** (code/poll) / **UNVERIFIED** (live leftover) | `pollCoachSession` is 10×2s. Spike calls `endSession()` then GET. Live lock not exercised. |
| 8 | Forced failed contextual update does not tear down an active call | **CONFIRMED** | `sendContextualUpdateSafely` never sets teardown; unit tests cover forced throw and SDK throw. Live mid-call SDK rejection: **UNVERIFIED**. |
| 9 | Exact installed version and `startSession` return type | **CONFIRMED** | `@elevenlabs/react@1.12.1`. Hook `startSession` → `void`. Runtime inspection records `undefined` / not a Promise. |
| 10 | Network hosts for later CSP | **UNVERIFIED** | Collector records Performance resource hosts + ICE URLs. No live WebRTC session, so the host list is empty in this run. Candidate from public issues: `livekit.rtc.elevenlabs.io`. Do not open CSP until a live capture. |
| 11 | Token only in memory; never storage / commit / full logs | **CONFIRMED** | `redactToken`; token held in `useRef`; e2e asserts the mock token string is not in the DOM; Sentry already scrubs `token`. |
| 12 | Tab hidden 10s on desktop Chrome and Safari | **UNVERIFIED** | `visibilitychange` logger is on the spike page. Not run for 10s on real browsers. |

## GO requires every live-audio cell CONFIRMED. This run does not have that. **NO-GO.**

Do **not** start PR-20. A human should open `/spike/coach` on desktop Chrome and desktop Safari with the approved short-budget account and fill cells 1, 2, 5, 6, 7, 10, 12. If those flip to CONFIRMED, a later session can change the verdict to GO.

## What shipped (spike only)

- Learner allowlist: readiness, mission, balance, consent, session POST, session GET. Webhook remains 410.
- No product nav, no `/speaking/coach`, no phase clock, no rotation product, no billing.
- Unit tests: 81 passed. `tsc --noEmit` passed. `next build` passed.
- Playwright (isolated mock): spike unauth redirect, noindex, no nav, no raw token, webhook 410, speaking home still has no Coach.
