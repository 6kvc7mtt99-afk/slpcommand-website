"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ConversationProvider,
  useConversation,
  useConversationControls,
  useConversationMode,
  useConversationStatus,
} from "@elevenlabs/react";
import {
  CoachStartFailure,
  fetchCoachBalance,
  fetchCoachMission,
  fetchCoachReadiness,
  fetchCoachSessionStatus,
  recordCoachConsent,
  startCoachSession,
  type CoachBalance,
  type CoachMission,
  type CoachReadiness,
} from "@/lib/coach/api";
import { SPIKE_CONTEXTUAL_UPDATE, sendContextualUpdateSafely } from "@/lib/coach/context";
import { COACH_START_COPY } from "@/lib/coach/errors";
import { startHostCapture } from "@/lib/coach/hosts";
import {
  canAuthorizeCoachSession,
  queryMicrophonePermission,
  requestMicrophonePreview,
  type MicPermission,
} from "@/lib/coach/preflight";
import {
  ELEVENLABS_REACT_VERSION,
  inspectStartSessionFn,
  inspectStartSessionReturn,
  type StartSessionInspection,
} from "@/lib/coach/sdk";
import { pollCoachSession, type CoachSessionStatus } from "@/lib/coach/session";
import { redactToken, tokenPersistenceSafe } from "@/lib/coach/token";
import {
  accumulateTranscript,
  classifyCoachMessage,
  countSubstantialUserTurns,
  type ClassifiedCoachMessage,
} from "@/lib/coach/transcript";

type LogLevel = "info" | "ok" | "warn" | "err";
type LogLine = { t: string; level: LogLevel; text: string };

function nowStamp(): string {
  return new Date().toISOString().slice(11, 23);
}

function CoachSpikeInner() {
  const { startSession, endSession, sendContextualUpdate, getId } = useConversationControls();
  const { status, message } = useConversationStatus();
  const { mode, isSpeaking, isListening } = useConversationMode();
  const conversation = useConversation({
    onMessage(payload) {
      const classified = classifyCoachMessage(payload);
      setMessages((prev) => accumulateTranscript(prev, classified));
      push(
        "info",
        `onMessage role=${classified.role} final=${classified.isFinal} words=${classified.wordCount} event=${classified.eventId ?? "n"}`,
      );
    },
    onError(error) {
      push("err", `sdk onError: ${typeof error === "string" ? error : "conversation error"}`);
    },
    onConnect() {
      push("ok", "sdk onConnect");
    },
    onDisconnect() {
      push("warn", "sdk onDisconnect");
    },
  });

  const tokenRef = useRef<string | null>(null);
  const hostCapture = useRef<ReturnType<typeof startHostCapture> | null>(null);
  const hiddenAt = useRef<number | null>(null);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [readiness, setReadiness] = useState<CoachReadiness | null>(null);
  const [mission, setMission] = useState<CoachMission | null>(null);
  const [balance, setBalance] = useState<CoachBalance | null>(null);
  const [mic, setMic] = useState<MicPermission>("unknown");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [tokenHint, setTokenHint] = useState<string>("");
  const [messages, setMessages] = useState<ClassifiedCoachMessage[]>([]);
  const [poll, setPoll] = useState<CoachSessionStatus | null>(null);
  const [hosts, setHosts] = useState<string[]>([]);
  const [tabHiddenMs, setTabHiddenMs] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [sdkInspect, setSdkInspect] = useState<StartSessionInspection | null>(null);
  const [forceFailResult, setForceFailResult] = useState<string>("");
  const [statusAtForceFail, setStatusAtForceFail] = useState<string>("");

  const sdkReady = typeof startSession === "function";
  const preflight = canAuthorizeCoachSession({ sdkReady, mic });
  const substantial = countSubstantialUserTurns(messages);
  const persistence = useMemo(() => tokenPersistenceSafe(), [sessionId, status]);

  const push = useCallback((level: LogLevel, text: string) => {
    setLogs((prev) => [...prev, { t: nowStamp(), level, text }]);
  }, []);

  useEffect(() => {
    hostCapture.current = startHostCapture();
    const onVis = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt.current = Date.now();
        push("info", "tab hidden");
      } else if (hiddenAt.current != null) {
        const ms = Date.now() - hiddenAt.current;
        setTabHiddenMs(ms);
        push("info", `tab visible again after ${ms}ms; sdk status=${status}`);
        hiddenAt.current = null;
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      hostCapture.current?.stop();
    };
  }, [push, status]);

  useEffect(() => {
    void (async () => {
      setMic(await queryMicrophonePermission());
      try {
        setReadiness(await fetchCoachReadiness());
      } catch (error) {
        push("err", `readiness failed: ${error instanceof Error ? error.message : "error"}`);
      }
      try {
        setMission(await fetchCoachMission());
      } catch (error) {
        push("err", `mission failed: ${error instanceof Error ? error.message : "error"}`);
      }
      try {
        setBalance(await fetchCoachBalance());
      } catch (error) {
        push("warn", `balance failed: ${error instanceof Error ? error.message : "error"}`);
      }
    })();
  }, [push]);

  async function prepareMic() {
    try {
      const next = await requestMicrophonePreview();
      setMic(next);
      push("ok", "getUserMedia preview granted and tracks stopped");
    } catch {
      setMic("denied");
      push("err", "getUserMedia denied");
    }
  }

  async function grantConsent() {
    try {
      await recordCoachConsent();
      setMission(await fetchCoachMission());
      push("ok", "consent recorded (source remains ios on the backend)");
    } catch (error) {
      push("err", `consent failed: ${error instanceof Error ? error.message : "error"}`);
    }
  }

  async function start() {
    if (busy) return;
    const gate = canAuthorizeCoachSession({ sdkReady, mic });
    if (!gate.ok) {
      push("err", `pre-flight blocked POST /session: ${gate.reason}`);
      return;
    }
    setBusy(true);
    try {
      const started = await startCoachSession({
        objective: mission?.objective,
        objectiveSource: mission?.objectiveSource,
      });
      tokenRef.current = started.conversationToken;
      setSessionId(started.sessionId);
      setTokenHint(redactToken(started.conversationToken));
      push("ok", `POST /session sessionId=${started.sessionId} token=${redactToken(started.conversationToken)} budgetSecs=${started.budgetSecs}`);

      const baseInspect = inspectStartSessionFn(startSession);
      const returned = startSession({
        conversationToken: started.conversationToken,
        dynamicVariables: started.dynamicVariables,
        connectionType: "webrtc",
      });
      const ret = inspectStartSessionReturn(returned);
      setSdkInspect({ ...baseInspect, ...ret });
      push(
        "ok",
        `startSession declared=${baseInspect.declaredReturn} runtime=${ret.runtimeReturnType} promise=${ret.runtimeIsPromise} pkg=${baseInspect.packageVersion}`,
      );
    } catch (error) {
      if (error instanceof CoachStartFailure) {
        push("err", `start failed ${error.code}: ${COACH_START_COPY[error.code]}`);
      } else {
        push("err", `start failed: ${error instanceof Error ? error.message : "error"}`);
      }
    } finally {
      setBusy(false);
    }
  }

  async function sendUpdate() {
    const result = await sendContextualUpdateSafely(sendContextualUpdate, SPIKE_CONTEXTUAL_UPDATE);
    push(result.ok ? "ok" : "err", result.ok ? "sendContextualUpdate dispatched" : `sendContextualUpdate failed: ${result.error}`);
    setHosts(hostCapture.current?.snapshot() ?? []);
  }

  async function forceFail() {
    const before = status;
    const result = await sendContextualUpdateSafely(sendContextualUpdate, SPIKE_CONTEXTUAL_UPDATE, {
      forceFail: true,
    });
    setForceFailResult(result.error ?? "ok");
    setStatusAtForceFail(status);
    push(
      "warn",
      `forced contextual failure: error=${result.error ?? "none"} toreDown=${result.toreDown} statusBefore=${before} statusAfter=${status}`,
    );
  }

  async function teardown() {
    setBusy(true);
    try {
      endSession();
      push("ok", `endSession() called; provider id=${getId() || "none"}`);
      if (!sessionId) {
        push("warn", "no sessionId to poll");
        return;
      }
      const last = await pollCoachSession(() => fetchCoachSessionStatus(sessionId));
      setPoll(last);
      push("ok", `poll done status=${last?.status ?? "null"} eval=${last?.evaluationStatus ?? "null"} result=${last?.hasResult ?? false}`);
      setHosts(hostCapture.current?.snapshot() ?? []);
    } catch (error) {
      push("err", `teardown failed: ${error instanceof Error ? error.message : "error"}`);
    } finally {
      setBusy(false);
    }
  }

  const userTurns = messages.filter((item) => item.role === "user");

  return (
    <main className="wrap" style={{ maxWidth: 880 }}>
      <p className="section-eyebrow">PR-19 spike · not product</p>
      <h1>ElevenLabs Web Coach spike</h1>
      <p className="muted">
        Desktop Chrome + desktop Safari only. No production nav. Token stays in memory. End the call quickly — short budget.
      </p>

      <section style={{ marginTop: 24 }}>
        <h2>SDK</h2>
        <p>
          <code>@elevenlabs/react@{ELEVENLABS_REACT_VERSION}</code>
        </p>
        <p>
          startSession declared return: <code>{sdkInspect?.declaredReturn ?? "void"}</code>
          {sdkInspect ? (
            <>
              {" "}
              · runtime: <code>{sdkInspect.runtimeReturnType}</code> · promise:{" "}
              <code>{String(sdkInspect.runtimeIsPromise)}</code>
            </>
          ) : (
            " · not called yet"
          )}
        </p>
        <p>
          connection: <code>{status}</code> {message ? `· ${message}` : ""} · mode <code>{mode}</code> · speaking{" "}
          <code>{String(isSpeaking)}</code> · listening <code>{String(isListening)}</code> · hook status{" "}
          <code>{conversation.status}</code>
        </p>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>Pre-flight</h2>
        <ul>
          <li>SDK loaded: {sdkReady ? "yes" : "no"}</li>
          <li>Mic: {mic}</li>
          <li>Authorize POST /session: {preflight.ok ? "allowed" : preflight.reason}</li>
          <li>Readiness: {readiness ? `${readiness.status} enabled=${String(readiness.coachEnabled)}` : "…"}</li>
          <li>Mission: {mission ? `${mission.eligibility} · ${mission.objective || "(none)"}` : "…"}</li>
          <li>
            Balance secs:{" "}
            {balance
              ? `sub ${balance.subscriptionSecs} / topup ${balance.topupSecs} / total ${balance.totalSecs}`
              : "…"}
          </li>
        </ul>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
          <button className="btn btn-outline" type="button" onClick={() => void prepareMic()}>
            1. Request microphone
          </button>
          {mission?.eligibility === "needs_consent" ? (
            <button className="btn btn-outline" type="button" onClick={() => void grantConsent()}>
              Record consent
            </button>
          ) : null}
          <button className="btn btn-primary" type="button" disabled={busy || !preflight.ok} onClick={() => void start()}>
            2. POST /session + startSession
          </button>
          <button className="btn btn-outline" type="button" disabled={status !== "connected"} onClick={() => void sendUpdate()}>
            3. sendContextualUpdate
          </button>
          <button className="btn btn-outline" type="button" disabled={status !== "connected"} onClick={() => void forceFail()}>
            4. Force failed update
          </button>
          <button className="btn btn-outline" type="button" disabled={busy} onClick={() => void teardown()}>
            5. endSession + poll
          </button>
        </div>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>Token + storage</h2>
        <p>Hint: {tokenHint || "(none)"}</p>
        <p>
          localStorage safe: {persistence.localStorage ? "yes" : "NO"} · sessionStorage safe:{" "}
          {persistence.sessionStorage ? "yes" : "NO"}
        </p>
        <p>sessionId: {sessionId ?? "(none)"}</p>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>Transcript</h2>
        <p>
          User turns: {userTurns.length} · substantial (≥6 words, final, role=user): {substantial}
        </p>
        <ol>
          {messages.map((item, index) => (
            <li key={`${item.role}-${item.eventId ?? index}`}>
              <code>{item.role}</code> words={item.wordCount}
              {item.substantialUserTurn ? " · SUBSTANTIAL" : ""} — {item.text}
            </li>
          ))}
        </ol>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>Teardown / hosts / tab</h2>
        <p>
          Poll: {poll ? `${poll.status} eval=${poll.evaluationStatus || "n"} result=${String(poll.hasResult)}` : "(not run)"}
        </p>
        <p>Forced update error: {forceFailResult || "(not run)"} · status then: {statusAtForceFail || "(n)"}</p>
        <p>Tab hidden duration: {tabHiddenMs == null ? "(not observed)" : `${tabHiddenMs}ms`}</p>
        <p>Hosts:</p>
        <ul>
          {hosts.map((host) => (
            <li key={host}>
              <code>{host}</code>
            </li>
          ))}
        </ul>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>Log</h2>
        <pre style={{ fontSize: 13, whiteSpace: "pre-wrap", background: "var(--bg2)", padding: 12, borderRadius: 12 }}>
          {logs.map((line) => `${line.t} [${line.level}] ${line.text}`).join("\n")}
        </pre>
      </section>
    </main>
  );
}

export function CoachSpike() {
  return (
    <ConversationProvider>
      <CoachSpikeInner />
    </ConversationProvider>
  );
}
