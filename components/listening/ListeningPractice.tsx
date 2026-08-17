"use client";

import { useCallback, useEffect, useState } from "react";
import { FrontendError } from "@/lib/api/client";
import { decodeListeningAnswer, type ListeningItem } from "@/lib/api/listening";
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
  const [correctIndex, setCorrectIndex] = useState<number | null>(null);
  const [explanation, setExplanation] = useState("");

  const load = useCallback(async (rotate: boolean) => {
    setPhase("loading");
    setSelected(null);
    setMessage("");
    setCorrectIndex(null);
    setExplanation("");
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
      const raw = await submitListeningAnswer({
        listeningId: item.listeningId,
        questionId: item.questionId,
        selectedIndex: selected,
      });
      const result = decodeListeningAnswer(raw);
      setCorrectIndex(result.correctIndex ?? item.correctIndex);
      setExplanation(result.explanation);
    } catch (err) {
      if (err instanceof FrontendError && (err.code === "quota" || err.code === "entitlement")) {
        setPhase("quota");
        return;
      }
      setMessage(err instanceof FrontendError ? err.message : "Something went wrong. Your progress was not changed.");
    }
  }

  const marked = correctIndex ?? item?.correctIndex ?? null;

  return (
    <ExerciseShell skill="Listening" mode="Practice" title="One clip, one question" layout="stage">
      <p className="muted">No transcript — just like the real exam.</p>
      {phase === "quota" ? <CommercialCard /> : null}
      {phase === "error" ? <ErrorState message={message} onRetry={() => void load(true)} /> : null}
      {phase === "loading" ? <LoadingState label="Loading a clip…" lines={2} /> : null}
      {item && phase !== "quota" && phase !== "error" ? (
        <>
          <AudioPlayer src={item.audioUrl} allowSeek variant="stage" />
          <div className="listen-question">
            <h2>{item.prompt || "Choose the best answer."}</h2>
            <OptionList
              options={item.options}
              selected={selected}
              locked={phase === "answered"}
              correctIndex={phase === "answered" ? marked : null}
              onSelect={setSelected}
            />
            {phase === "ready" ? (
              <button className="btn btn-primary" type="button" disabled={selected == null} onClick={() => void confirm()}>
                Check answer
              </button>
            ) : null}
            {phase === "answered" && selected != null ? (
              <FeedbackBanner
                correct={marked != null && selected === marked}
                explanation={explanation}
              />
            ) : null}
            {message && phase === "answered" ? <p className="muted">{message}</p> : null}
            {phase === "answered" ? (
              <button className="btn btn-outline" type="button" onClick={() => void load(true)}>
                Next clip
              </button>
            ) : null}
          </div>
        </>
      ) : null}
    </ExerciseShell>
  );
}
