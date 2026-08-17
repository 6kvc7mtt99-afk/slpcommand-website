"use client";

import { useEffect, useRef, useState } from "react";

export function AudioPlayer({
  src,
  allowSeek,
  onPlayRequest,
  variant = "bar",
}: {
  src: string;
  allowSeek: boolean;
  onPlayRequest?: () => Promise<boolean> | boolean;
  variant?: "bar" | "stage";
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastTime = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [blocked, setBlocked] = useState("");

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    lastTime.current = 0;
    setCurrent(0);
    setPlaying(false);
    const onTime = () => {
      lastTime.current = audio.currentTime;
      setCurrent(audio.currentTime);
    };
    const onMeta = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onEnd = () => setPlaying(false);
    const onSeeking = () => {
      if (!allowSeek && Math.abs(audio.currentTime - lastTime.current) > 0.35) {
        audio.currentTime = lastTime.current;
      }
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnd);
    audio.addEventListener("seeking", onSeeking);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnd);
      audio.removeEventListener("seeking", onSeeking);
    };
  }, [src, allowSeek]);

  async function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    if (onPlayRequest) {
      const allowed = await onPlayRequest();
      if (!allowed) {
        setBlocked("Playback is not allowed for this item.");
        return;
      }
    }
    setBlocked("");
    await audio.play();
    setPlaying(true);
  }

  function seek(value: number) {
    const audio = audioRef.current;
    if (!audio || !allowSeek) return;
    audio.currentTime = value;
    setCurrent(value);
  }

  const label = `${format(current)} / ${format(duration)}`;
  if (variant === "stage") {
    return (
      <div className="listen-stage">
        <audio ref={audioRef} src={src} preload="metadata" controls={false} />
        <button className="listen-play" type="button" onClick={() => void toggle()} aria-pressed={playing}>
          {playing ? "Pause" : "Play"}
        </button>
        <p className="listen-clock">{label}</p>
        {allowSeek ? (
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={current}
            aria-label="Seek"
            style={{ width: "min(420px, 80vw)" }}
            onChange={(e) => seek(Number(e.target.value))}
          />
        ) : (
          <div className="listen-track" aria-hidden="true">
            <span style={{ width: duration ? `${(current / duration) * 100}%` : "0%" }} />
          </div>
        )}
        {blocked ? <p className="muted">{blocked}</p> : null}
      </div>
    );
  }
  return (
    <div className="audio-player">
      <audio ref={audioRef} src={src} preload="metadata" controls={false} />
      <button className="btn btn-primary" type="button" onClick={() => void toggle()} aria-pressed={playing}>
        {playing ? "Pause" : "Play"}
      </button>
      {allowSeek ? (
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={current}
          aria-label="Seek"
          onChange={(e) => seek(Number(e.target.value))}
        />
      ) : (
        <div className="audio-progress" aria-hidden="true">
          <span style={{ width: duration ? `${(current / duration) * 100}%` : "0%" }} />
        </div>
      )}
      <span className="muted">{label}</span>
      {blocked ? <p className="muted">{blocked}</p> : null}
    </div>
  );
}

function format(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0:00";
  const m = Math.floor(value / 60);
  const s = String(Math.floor(value % 60)).padStart(2, "0");
  return `${m}:${s}`;
}
