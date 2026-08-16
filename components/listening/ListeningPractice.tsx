"use client";

import { useCallback, useEffect, useState } from "react";
import { FrontendError } from "@/lib/api/client";
import type { ListeningItem } from "@/lib/api/listening";
import {
  loadListeningNext,
  rotateListeningPracticeKey,
  submitListeningAnswer,
} from "@/lib/listening/practiceSession";
import { AudioPlayer } from "@/components/exercise/AudioPlayer";
import { CommercialCard, ExerciseShell, FeedbackBanner } from "@/components/exercise/ExerciseShell";
import { ErrorState, LoadingState } from "@/components/ui/ProductState";
import { OptionList } from "@/components/exercise/OptionList";

type Phase = "loading" | "ready" | "answered" | "quota" | "error";

export function ListeningPractice({
  focusSkill,
  focusSubSkill,
}: {
  focusSkill?: string;
  focusSubSkill?: string;
}) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [item, setItem] = useState<ListeningItem | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async (rotate: boolean) => {
    setPhase("loading");
    setSelected(null);
    setMessage("");
    if (rotate) rotateListeningPracticeKey();
    try {
      const next = await loadListeningNext({ focusSkill, focusSubSkill });
      setItem(next);
      setPhase("ready");
    } catch (err) {
      if (err instanceof FrontendError && (err.code === "quota" || err.code === "entitlement")) {
        setPhase("quota");
        return;
      }
      setMessage(err instanceof FrontendError ? err.message : "Couldn't load a clip. You were not charged.");
      setPhase("error");
    }
  }, [focusSkill, focusSubSkill]);

  useEffect(() => {
    void load(false);
  }, [load]);

  async function confirm() {
    if (!item || selected == null || phase !== "ready") return;
    setPhase("answered");
    try {
      await submitListeningAnswer({
        listeningId: item.listeningId,
        questionId: item.questionId,
        selectedIndex: selected,
      });
    } catch (err) {
      if (err instanceof FrontendError && (err.code === "quota" || err.code === "entitlement")) {
        setPhase("quota");
        return;
      }
      setMessage(err instanceof FrontendError ? err.message : "Something went wrong. Your progress was not changed.");
    }
  }

  return (
    <ExerciseShell skill="Listening" mode="Practice" title="One clip, one question">
      <p className="muted">No transcript — just like the real exam.</p>
      {phase === "quota" ? <CommercialCard /> : null}
      {phase === "error" ? <ErrorState message={message} onRetry={() => void load(true)} /> : null}
      {phase === "loading" ? (
        <div className="audio-stage">
          <LoadingState label="Loading a clip…" lines={2} />
        </div>
      ) : null}
      {item && phase !== "quota" && phase !== "error" ? (
        <>
          <article className="audio-stage">
            <p className="home-kicker">Audio</p>
            <AudioPlayer src={item.audioUrl} allowSeek />
          </article>
          <article className="question-pane">
            <h2>{item.prompt || "Choose the best answer."}</h2>
            <OptionList
              options={item.options}
              selected={selected}
              locked={phase === "answered"}
              correctIndex={phase === "answered" ? item.correctIndex : null}
              onSelect={setSelected}
            />
            {phase === "ready" ? (
              <button className="btn btn-primary" type="button" disabled={selected == null} onClick={() => void confirm()}>
                Check answer
              </button>
            ) : null}
            {phase === "answered" && selected != null ? (
              <FeedbackBanner
                correct={item.correctIndex != null && selected === item.correctIndex}
                explanation=""
              />
            ) : null}
            {message && phase === "answered" ? <p className="muted">{message}</p> : null}
            {phase === "answered" ? (
              <button className="btn btn-outline" type="button" onClick={() => void load(true)}>
                Next clip
              </button>
            ) : null}
          </article>
        </>
      ) : null}
    </ExerciseShell>
  );
}
