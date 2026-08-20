"use client";

import { useEffect, useRef, useState } from "react";

export type RecorderState = "idle" | "requesting" | "recording" | "stopped" | "denied" | "interrupted";

export function pickRecorderMime(): string {
  const types = ["audio/mp4", "audio/aac", "audio/mp4;codecs=mp4a.40.2", "audio/webm;codecs=opus", "audio/webm"];
  if (typeof MediaRecorder === "undefined") return "";
  return types.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

export function SpeakingRecorder({
  maxSeconds,
  minSubmitSeconds = 0,
  allowRerecord = true,
  onBlob,
}: {
  maxSeconds: number;
  minSubmitSeconds?: number;
  allowRerecord?: boolean;
  onBlob: (blob: Blob | null, seconds: number) => void;
}) {
  const [state, setState] = useState<RecorderState>("idle");
  const [seconds, setSeconds] = useState(0);
  const [url, setUrl] = useState<string | null>(null);
  const media = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<number | null>(null);
  // Real signal, not decoration: while recording, the ring's glow
  // radius is driven by this AnalyserNode reading the actual
  // microphone stream, not a fixed-timing CSS loop.
  const ringRef = useRef<HTMLDivElement | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const levelData = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const levelRaf = useRef(0);

  useEffect(() => {
    function discard() {
      stopTracks();
      chunks.current = [];
      if (url) URL.revokeObjectURL(url);
      setUrl(null);
      setSeconds(0);
      setState("interrupted");
      onBlob(null, 0);
    }
    function onHide() {
      if (document.hidden && media.current?.state === "recording") discard();
    }
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", discard);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", discard);
      stopTracks();
    };
  }, [onBlob, url]);

  function stopTracks() {
    media.current?.stop();
    stream.current?.getTracks().forEach((track) => track.stop());
    media.current = null;
    stream.current = null;
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
    stopLevelMeter();
  }

  function stopLevelMeter() {
    if (levelRaf.current) cancelAnimationFrame(levelRaf.current);
    levelRaf.current = 0;
    analyser.current = null;
    levelData.current = null;
    if (audioCtx.current) {
      const ctx = audioCtx.current;
      audioCtx.current = null;
      void ctx.close();
    }
    ringRef.current?.style.removeProperty("--level");
  }

  /**
   * Reads real amplitude off the same stream MediaRecorder is
   * capturing (a separate, unconnected tap — never routed to
   * destination, so nothing is audible or double-recorded) and writes
   * it straight to a CSS custom property via a ref, bypassing React
   * state so a 60fps meter never triggers a re-render. Best-effort: if
   * AudioContext throws (unsupported browser, exhausted context count),
   * recording continues exactly as before this existed.
   */
  function startLevelMeter(liveStream: MediaStream) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const source = ctx.createMediaStreamSource(liveStream);
      const node = ctx.createAnalyser();
      node.fftSize = 256;
      node.smoothingTimeConstant = 0.6;
      source.connect(node);
      audioCtx.current = ctx;
      analyser.current = node;
      levelData.current = new Uint8Array(new ArrayBuffer(node.frequencyBinCount));
      const tick = () => {
        const a = analyser.current;
        const data = levelData.current;
        if (!a || !data) return;
        a.getByteTimeDomainData(data);
        let sumSquares = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sumSquares += v * v;
        }
        const rms = Math.sqrt(sumSquares / data.length);
        const level = Math.min(1, rms * 4.5);
        ringRef.current?.style.setProperty("--level", level.toFixed(3));
        levelRaf.current = requestAnimationFrame(tick);
      };
      levelRaf.current = requestAnimationFrame(tick);
    } catch {
      /* Recording itself does not depend on this. */
    }
  }

  async function start() {
    setState("requesting");
    try {
      const next = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = next;
      startLevelMeter(next);
      const mime = pickRecorderMime();
      const recorder = mime ? new MediaRecorder(next, { mimeType: mime }) : new MediaRecorder(next);
      chunks.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks.current, { type: recorder.mimeType || "audio/webm" });
        const objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
        setState("stopped");
        onBlob(blob, secondsRef.current);
      };
      media.current = recorder;
      secondsRef.current = 0;
      setSeconds(0);
      recorder.start();
      setState("recording");
      timer.current = window.setInterval(() => {
        secondsRef.current += 1;
        setSeconds(secondsRef.current);
        if (secondsRef.current >= maxSeconds) stop();
      }, 1000);
    } catch {
      setState("denied");
      onBlob(null, 0);
    }
  }

  const secondsRef = useRef(0);

  function stop() {
    if (media.current?.state === "recording") media.current.stop();
    stopTracks();
  }

  const canSubmit = seconds >= minSubmitSeconds;

  return (
    <div className={`recorder is-${state}${state === "recording" ? " is-recording" : ""}`}>
      <p className="home-kicker">Microphone</p>
      <div className="recorder-face">
        <div className={`recorder-ring${state === "recording" ? " p-live-ring" : ""}`} ref={ringRef} aria-hidden="true">
          <span className="recorder-dot" />
        </div>
        <p className="recorder-clock" role="timer" aria-label="Recording" aria-live="polite">
          {state === "recording" ? "Recording" : "Recording length"} {formatClock(seconds)} of a {Math.round(maxSeconds / 60)} minute maximum
        </p>
      </div>
      {state === "denied" ? <p className="err" role="alert">Microphone permission was denied. Speaking cannot start without it.</p> : null}
      {state === "interrupted" ? <p className="muted">The recording was discarded because the tab was hidden.</p> : null}
      <div className="admin-row" style={{ marginTop: 12 }}>
        {state !== "recording" ? (
          <button className="btn btn-primary" type="button" onClick={start} disabled={state === "stopped" && !allowRerecord}>
            {state === "requesting" ? "Requesting microphone…" : state === "stopped" && allowRerecord ? "Record again" : "Start recording"}
          </button>
        ) : (
          <button className="btn btn-outline" type="button" onClick={stop}>
            Stop
          </button>
        )}
      </div>
      {url ? <audio controls src={url} style={{ marginTop: 12, width: "100%" }} /> : null}
      {state === "stopped" && minSubmitSeconds > 0 && !canSubmit ? (
        <p className="muted">Speak for at least {minSubmitSeconds} seconds before submitting.</p>
      ) : null}
    </div>
  );
}

function formatClock(total: number): string {
  const m = Math.floor(total / 60);
  const s = String(total % 60).padStart(2, "0");
  return `${m}:${s}`;
}
